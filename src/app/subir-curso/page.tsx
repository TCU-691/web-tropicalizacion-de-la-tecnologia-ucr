
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Loader2, AlertTriangle, PlusCircle, Trash2, BookCopy, Film, ListChecks, Image as ImageIconLucide } from 'lucide-react';
import Link from 'next/link';
import { Image as ImageKitImage, upload as imageKitUpload, ImageKitAbortError, ImageKitInvalidRequestError, ImageKitServerError, ImageKitUploadNetworkError } from "@imagekit/next";
import { generateSlug, isSlugUnique } from '@/lib/utils';


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const DEFAULT_IMAGE_URL = "https://placehold.co/600x400.png"; // This can be a generic placeholder

const lessonSchema = z.object({
  tituloLeccion: z.string().min(3, { message: 'El título de la lección debe tener al menos 3 caracteres.' }),
  youtubeUrl: z.string().url({ message: 'Por favor ingresa una URL de YouTube válida.' }).refine(
    (url) => url.includes('youtube.com') || url.includes('youtu.be'),
    { message: 'La URL debe ser de YouTube.' }
  ),
  descripcionLeccion: z.string().optional(),
});

const moduleSchema = z.object({
  tituloModulo: z.string().min(3, { message: 'El título del módulo debe tener al menos 3 caracteres.' }),
  lecciones: z.array(lessonSchema).min(1, { message: 'Cada módulo debe tener al menos una lección.' }),
});

const courseUploadSchema = z.object({
  titulo: z.string().min(5, { message: 'El título del curso debe tener al menos 5 caracteres.' }),
  descripcion: z.string().min(20, { message: 'La descripción debe tener al menos 20 caracteres.' }),
  categoria: z.string({ required_error: 'Por favor selecciona una categoría.' }),
  imagenPortada: z
    .custom<FileList>()
    .optional() // Imagen es opcional
    .refine((files) => !files || files.length === 0 || (files?.[0]?.size <= MAX_FILE_SIZE), `El tamaño máximo de la imagen es ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(
      (files) => !files || files.length === 0 || (files && ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type)),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    ),
  modulos: z.array(moduleSchema).min(1, { message: 'El curso debe tener al menos un módulo.' }),
});

type CourseUploadFormValues = z.infer<typeof courseUploadSchema>;

const categories = [
  "Programación", "Educación", "Tecnología", "Sostenibilidad", "Idiomas", 
  "Arte y Diseño", "Ciencias", "Matemáticas", "Negocios", "Salud y Bienestar", "Otro"
];

export default function SubirCursoPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // For local Data URL preview

  const form = useForm<CourseUploadFormValues>({
    resolver: zodResolver(courseUploadSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      categoria: undefined,
      imagenPortada: undefined,
      modulos: [{ tituloModulo: '', lecciones: [{ tituloLeccion: '', youtubeUrl: '', descripcionLeccion: '' }] }],
    },
  });

  const { fields: modulosFields, append: appendModulo, remove: removeModulo } = useFieldArray({
    control: form.control,
    name: 'modulos',
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login?redirect=/subir-curso');
    }
  }, [currentUser, authLoading, router]);

  const authenticator = async () => {
    try {
        const response = await fetch("/api/upload-auth");
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        const { signature, expire, token, publicKey } = data;
        return { signature, expire, token, publicKey };
    } catch (error) {
        console.error("Authentication error:", error);
        throw new Error(error instanceof Error ? error.message : "Authentication request failed");
    }
  };

  const onSubmit: SubmitHandler<CourseUploadFormValues> = async (data) => {
    if (!currentUser) {
      toast({ title: 'Error de Autenticación', description: 'Debes iniciar sesión para subir un curso.', variant: 'destructive' });
      return;
    }
    if (!db) {
      toast({ title: 'Error de Configuración', description: 'La base de datos no está disponible.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    
    const slug = generateSlug(data.titulo);
    const slugIsUnique = await isSlugUnique(slug, 'courses');

    if (!slugIsUnique) {
      toast({
        title: 'Título Duplicado',
        description: 'Ya existe un curso con un título muy similar. Por favor, elige un título único.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    
    let finalImageUrl = DEFAULT_IMAGE_URL;

    try {
      const file = data.imagenPortada?.[0];
      if (file) {
        let authParams;
        try {
            authParams = await authenticator();
        } catch (authError: any) {
            toast({ title: 'Error de Autenticación de Subida', description: authError.message, variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        const { signature, expire, token, publicKey } = authParams;

        try {
          const uploadResponse = await imageKitUpload({
            file,
            fileName: file.name,
            tags: ["course-cover", currentUser.uid],
            folder: `courses_images/${currentUser.uid}`,
            useUniqueFileName: true,
            publicKey,
            signature,
            expire,
            token,
          });
          finalImageUrl = uploadResponse.url;
        } catch (uploadError: any) {
          console.error("Error subiendo imagen a ImageKit: ", uploadError);
          let errorMessage = "Error al subir la imagen a ImageKit.";
          if (uploadError instanceof ImageKitAbortError) errorMessage = `Subida abortada: ${uploadError.reason}`;
          else if (uploadError instanceof ImageKitInvalidRequestError) errorMessage = `Solicitud inválida: ${uploadError.message}`;
          else if (uploadError instanceof ImageKitUploadNetworkError) errorMessage = `Error de red: ${uploadError.message}`;
          else if (uploadError instanceof ImageKitServerError) errorMessage = `Error del servidor de ImageKit: ${uploadError.message}`;
          else if (uploadError.message) errorMessage = uploadError.message;
          
          toast({ title: 'Error al Subir Imagen', description: errorMessage, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
      }
      
      await addDoc(collection(db, 'courses'), {
        titulo: data.titulo,
        slug: slug,
        descripcion: data.descripcion,
        categoria: data.categoria,
        imagenUrl: finalImageUrl,
        estado: 'pendiente',
        creadoPor: currentUser.uid,
        fechaCreacion: Timestamp.fromDate(new Date()),
        visitas: 0,
        modulos: data.modulos.map(modulo => ({
          id: crypto.randomUUID(), // Add client-side generated ID
          tituloModulo: modulo.tituloModulo,
          lecciones: modulo.lecciones.map(leccion => ({
            id: crypto.randomUUID(), // Add client-side generated ID
            tituloLeccion: leccion.tituloLeccion,
            youtubeUrl: leccion.youtubeUrl,
            descripcionLeccion: leccion.descripcionLeccion || '',
          }))
        }))
      });

      toast({
        title: '¡Curso Enviado!',
        description: 'Tu curso ha sido enviado para revisión.',
      });
      form.reset();
      setImagePreview(null);
      router.push('/cursos-publicos');

    } catch (error) {
      console.error("Error en el proceso de subida del curso: ", error);
      toast({
        title: 'Error al Subir Curso',
        description: error instanceof Error ? error.message : 'Ocurrió un error desconocido durante la subida.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!currentUser && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Acceso Requerido</h1>
        <p className="text-muted-foreground mb-6">Debes iniciar sesión para acceder a esta página.</p>
        <Button asChild>
          <Link href="/login?redirect=/subir-curso">Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="font-headline text-3xl md:text-4xl">Subir Nuevo Curso</CardTitle>
          <CardDescription className="text-lg text-foreground/70">
            Comparte tus conocimientos con la comunidad. Tu curso será revisado antes de publicarse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              <section className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
                <h2 className="font-headline text-2xl font-semibold text-primary flex items-center"><BookCopy className="mr-2 h-6 w-6"/>Información General del Curso</h2>
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título del Curso</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Introducción a la Cocina Tailandesa" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción General</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe de qué trata tu curso..." {...field} rows={4} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imagenPortada"
                  render={({ field: { onChange, value, ...restField } }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Imagen de Portada del Curso (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              onChange(files); 
                              const file = files[0];
                              if (file && ACCEPTED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setImagePreview(reader.result as string); // For local preview
                                };
                                reader.readAsDataURL(file);
                              } else {
                                setImagePreview(null); 
                              }
                            } else {
                                onChange(null); 
                                setImagePreview(null); 
                            }
                          }}
                          {...restField} 
                          disabled={isSubmitting} 
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </FormControl>
                      <FormDescription>
                        Sube una imagen (JPG, PNG, WEBP). Máx 5MB. Si no subes una, se usará una imagen predeterminada.
                      </FormDescription>
                      {imagePreview && (
                        <div className="mt-4">
                          <Label>Vista Previa:</Label>
                          <div className="relative w-full aspect-video max-w-sm rounded-md overflow-hidden border shadow-sm">
                            <img src={imagePreview} alt="Vista previa de imagen de portada" className="w-full h-full object-cover" data-ai-hint="course cover preview" />
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
                <div className="flex justify-between items-center">
                    <h2 className="font-headline text-2xl font-semibold text-primary flex items-center"><ListChecks className="mr-2 h-6 w-6"/>Temario del Curso</h2>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendModulo({ tituloModulo: '', lecciones: [{ tituloLeccion: '', youtubeUrl: '', descripcionLeccion: '' }] })} disabled={isSubmitting}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Módulo
                    </Button>
                </div>
                 {form.formState.errors.modulos?.root?.message && <FormMessage>{form.formState.errors.modulos.root.message}</FormMessage>}

                <div className="space-y-8">
                  {modulosFields.map((moduloItem, moduloIndex) => (
                    <Card key={moduloItem.id} className="p-4 bg-background/50 shadow-md">
                      <CardHeader className="p-2 mb-2">
                        <div className="flex justify-between items-center">
                           <FormField
                              control={form.control}
                              name={`modulos.${moduloIndex}.tituloModulo`}
                              render={({ field }) => (
                                <FormItem className="flex-grow mr-2">
                                  <FormLabel className="text-sm">Título del Módulo {moduloIndex + 1}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={`Ej: Módulo ${moduloIndex + 1} - Conceptos Básicos`} {...field} disabled={isSubmitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          {modulosFields.length > 1 && (
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeModulo(moduloIndex)} disabled={isSubmitting} aria-label="Eliminar módulo">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-2 space-y-4">
                         <LeccionesFieldArray moduloIndex={moduloIndex} control={form.control} disabled={isSubmitting} formMethods={form} />
                         {form.formState.errors.modulos?.[moduloIndex]?.lecciones?.root?.message && <FormMessage>{form.formState.errors.modulos?.[moduloIndex]?.lecciones?.root?.message}</FormMessage>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Enviando Curso...' : 'Enviar Curso para Aprobación'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

interface LeccionesFieldArrayProps {
  moduloIndex: number;
  control: any; 
  disabled: boolean;
  formMethods: any;
}

function LeccionesFieldArray({ moduloIndex, control, disabled, formMethods }: LeccionesFieldArrayProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `modulos.${moduloIndex}.lecciones`,
  });

  return (
    <div className="space-y-4 pl-4 border-l-2 border-border">
      {fields.map((leccionItem, leccionIndex) => (
        <div key={leccionItem.id} className="p-3 border rounded-md bg-card/80 shadow-sm relative">
          <Label className="text-xs text-muted-foreground">Lección {leccionIndex + 1}</Label>
          {fields.length > 1 && (
             <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => remove(leccionIndex)}
                disabled={disabled}
                aria-label="Eliminar lección"
              >
                <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <FormField
            control={control}
            name={`modulos.${moduloIndex}.lecciones.${leccionIndex}.tituloLeccion`}
            render={({ field }) => (
              <FormItem className="mt-1">
                <FormLabel>Título de la Lección</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Bienvenida al curso" {...field} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`modulos.${moduloIndex}.lecciones.${leccionIndex}.youtubeUrl`}
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormLabel>URL del Video de YouTube</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://www.youtube.com/watch?v=..." {...field} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`modulos.${moduloIndex}.lecciones.${leccionIndex}.descripcionLeccion`}
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormLabel>Descripción de la Lección (Opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Breve descripción del contenido de la lección..." {...field} rows={2} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ tituloLeccion: '', youtubeUrl: '', descripcionLeccion: '' })}
        disabled={disabled}
        className="mt-2"
      >
        <Film className="mr-2 h-4 w-4" /> Agregar Lección
      </Button>
    </div>
  );
}

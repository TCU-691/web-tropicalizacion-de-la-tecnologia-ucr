
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import type { FirestoreCourse } from '@/types/course';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, AlertTriangle, PlusCircle, Trash2, BookCopy, Film, ListChecks, ArrowLeft, Edit3, Image as ImageIconLucide } from 'lucide-react';
import { Image as ImageKitImage, upload as imageKitUpload, ImageKitAbortError, ImageKitInvalidRequestError, ImageKitServerError, ImageKitUploadNetworkError } from "@imagekit/next";
import { generateSlug, isSlugUnique } from '@/lib/utils';


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const DEFAULT_IMAGE_URL = "https://placehold.co/600x400.png";

const categories = [
  "Programación", "Educación", "Tecnología", "Sostenibilidad", "Idiomas", 
  "Arte y Diseño", "Ciencias", "Matemáticas", "Negocios", "Salud y Bienestar", "Otro"
];

const lessonSchema = z.object({
  id: z.string().optional(),
  tituloLeccion: z.string().min(3, { message: 'El título de la lección debe tener al menos 3 caracteres.' }),
  youtubeUrl: z.string().url({ message: 'Por favor ingresa una URL de YouTube válida.' }).refine(
    (url) => url.includes('youtube.com') || url.includes('youtu.be'),
    { message: 'La URL debe ser de YouTube.' }
  ),
  descripcionLeccion: z.string().optional(),
});

const moduleSchema = z.object({
  id: z.string().optional(),
  tituloModulo: z.string().min(3, { message: 'El título del módulo debe tener al menos 3 caracteres.' }),
  lecciones: z.array(lessonSchema).min(1, { message: 'Cada módulo debe tener al menos una lección.' }),
});

const courseEditFormSchema = z.object({
  titulo: z.string().min(5, { message: 'El título del curso debe tener al menos 5 caracteres.' }),
  descripcion: z.string().min(20, { message: 'La descripción debe tener al menos 20 caracteres.' }),
  categoria: z.string({ required_error: 'Por favor selecciona una categoría.' }),
  imagenPortada: z
    .custom<FileList>()
    .optional() // Imagen es opcional al editar
    .refine((files) => !files || files.length === 0 || (files?.[0]?.size <= MAX_FILE_SIZE), `El tamaño máximo de la imagen es ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(
      (files) => !files || files.length === 0 || (files && ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type)),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    ),
  modulos: z.array(moduleSchema).min(1, { message: 'El curso debe tener al menos un módulo.' }),
});

type CourseEditFormValues = z.infer<typeof courseEditFormSchema>;

export default function EditCursoPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const { toast } = useToast();
  
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseNotFound, setCourseNotFound] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // Will store ImageKit URL
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null); // Local Data URL preview
  const [initialCourseData, setInitialCourseData] = useState<FirestoreCourse | null>(null);

  const form = useForm<CourseEditFormValues>({
    resolver: zodResolver(courseEditFormSchema),
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
    if (!authLoading) {
      if (!currentUser) {
        router.push(`/login?redirect=/dashboard-aprobaciones/edit-curso/${courseId}`);
      } else if (userProfile && userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
        router.push('/unauthorized?page=edit-curso');
      }
    }
  }, [currentUser, userProfile, authLoading, router, courseId]);

  useEffect(() => {
    if (courseId && currentUser && (userProfile?.rol === 'profesor' || userProfile?.rol === 'admin')) {
      const fetchCourse = async () => {
        setIsLoadingCourse(true);
        setCourseNotFound(false);
        try {
          const courseDocRef = doc(db, 'courses', courseId);
          const courseDocSnap = await getDoc(courseDocRef);

          if (courseDocSnap.exists()) {
            const courseData = { id: courseDocSnap.id, ...courseDocSnap.data() } as FirestoreCourse;
            setInitialCourseData(courseData); // Keep initial to compare if image changed
            form.reset({
              titulo: courseData.titulo,
              descripcion: courseData.descripcion,
              categoria: courseData.categoria,
              modulos: courseData.modulos.map(m => ({
                id: m.id || crypto.randomUUID(), 
                tituloModulo: m.tituloModulo,
                lecciones: m.lecciones.map(l => ({ 
                  id: l.id || crypto.randomUUID(),
                  tituloLeccion: l.tituloLeccion,
                  youtubeUrl: l.youtubeUrl,
                  descripcionLeccion: l.descripcionLeccion
                }))
              })),
            });
            setCurrentImageUrl(courseData.imagenUrl || DEFAULT_IMAGE_URL);
          } else {
            setCourseNotFound(true);
            toast({ title: 'Curso no encontrado', description: 'El curso que intentas editar no existe.', variant: 'destructive' });
          }
        } catch (error) {
          console.error("Error fetching course for editing:", error);
          toast({ title: 'Error al cargar curso', description: 'No se pudo obtener la información del curso.', variant: 'destructive' });
        } finally {
          setIsLoadingCourse(false);
        }
      };
      fetchCourse();
    }
  }, [courseId, currentUser, userProfile, form, toast]);

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

  const onSubmit: SubmitHandler<CourseEditFormValues> = async (data) => {
    if (!currentUser || !courseId || !initialCourseData) return;
    setIsSubmitting(true);

    if (data.titulo !== initialCourseData.titulo) {
      const newSlug = generateSlug(data.titulo);
      const slugIsUnique = await isSlugUnique(newSlug, 'courses');
      if (!slugIsUnique) {
        toast({
          title: 'Título Duplicado',
          description: 'Ya existe un curso con un título muy similar. Por favor, elige un título único.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
    }

    let finalImageUrl = initialCourseData.imagenUrl || DEFAULT_IMAGE_URL;

    try {
      const newImageFile = data.imagenPortada?.[0];
      if (newImageFile) { // If a new file is selected
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
            file: newImageFile,
            fileName: newImageFile.name,
            tags: ["course-cover", currentUser.uid, courseId],
            folder: `courses_images/${currentUser.uid}`,
            useUniqueFileName: true,
            publicKey,
            signature,
            expire,
            token,
          });
          finalImageUrl = uploadResponse.url; // New ImageKit URL
        } catch (uploadError: any) {
          console.error("Error subiendo nueva imagen a ImageKit: ", uploadError);
          let errorMessage = "Error al subir la nueva imagen a ImageKit.";
          if (uploadError instanceof ImageKitAbortError) errorMessage = `Subida abortada: ${uploadError.reason}`;
          else if (uploadError instanceof ImageKitInvalidRequestError) errorMessage = `Solicitud inválida: ${uploadError.message}`;
          else if (uploadError instanceof ImageKitUploadNetworkError) errorMessage = `Error de red: ${uploadError.message}`;
          else if (uploadError instanceof ImageKitServerError) errorMessage = `Error del servidor de ImageKit: ${uploadError.message}`;
          else if (uploadError.message) errorMessage = uploadError.message;
          
          toast({ title: 'Error al Subir Nueva Imagen', description: errorMessage, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
      }
      
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        titulo: data.titulo,
        slug: generateSlug(data.titulo),
        descripcion: data.descripcion,
        categoria: data.categoria,
        imagenUrl: finalImageUrl,
        modulos: data.modulos.map(m => ({
            id: m.id || crypto.randomUUID(), 
            tituloModulo: m.tituloModulo,
            lecciones: m.lecciones.map(l => ({
                id: l.id || crypto.randomUUID(),
                tituloLeccion: l.tituloLeccion,
                youtubeUrl: l.youtubeUrl,
                descripcionLeccion: l.descripcionLeccion || ''
            }))
        })),
        fechaActualizacion: Timestamp.now(),
      });
      toast({
        title: '¡Curso Actualizado!',
        description: 'Los cambios en el curso han sido guardados.',
      });
      router.push('/dashboard-aprobaciones');
    } catch (error) {
      console.error("Error updating curso: ", error);
      toast({
        title: 'Error al Actualizar Curso',
        description: error instanceof Error ? error.message : 'Ocurrió un error desconocido.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingCourse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando editor de curso...</p>
      </div>
    );
  }
  
  if (courseNotFound) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Curso No Encontrado</h1>
        <p className="text-muted-foreground mb-6">El curso que intentas editar no existe o fue eliminado.</p>
        <Button asChild>
          <Link href="/dashboard-aprobaciones">Volver al Panel</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Button asChild variant="outline" className="mb-6 group">
        <Link href="/dashboard-aprobaciones">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al Panel de Aprobaciones
        </Link>
      </Button>
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Edit3 className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="font-headline text-3xl md:text-4xl">Editar Curso</CardTitle>
          <CardDescription className="text-lg text-foreground/70">
            Modifica los detalles del curso. Los cambios se guardarán directamente.
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
                      <FormLabel className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Imagen de Portada (Opcional)</FormLabel>
                      {(currentImageUrl && !newImagePreview) && (
                        <div className="mt-2 mb-4">
                          <Label className="text-xs text-muted-foreground">Imagen Actual:</Label>
                           <div className="relative w-full aspect-video max-w-sm rounded-md overflow-hidden border shadow-sm">
                            <ImageKitImage src={currentImageUrl} alt="Imagen actual del curso" layout="fill" objectFit="cover" data-ai-hint="course cover current"/>
                          </div>
                        </div>
                      )}
                      {newImagePreview && (
                        <div className="mt-2 mb-4">
                          <Label className="text-xs text-muted-foreground">Nueva Imagen (Previsualización):</Label>
                          <div className="relative w-full aspect-video max-w-sm rounded-md overflow-hidden border shadow-sm">
                            <img src={newImagePreview} alt="Vista previa de nueva imagen" className="w-full h-full object-cover" data-ai-hint="course cover new preview"/>
                          </div>
                        </div>
                      )}
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
                                  setNewImagePreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              } else {
                                setNewImagePreview(null);
                              }
                            } else {
                                onChange(null);
                                setNewImagePreview(null);
                            }
                          }}
                          {...restField} 
                          disabled={isSubmitting} 
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </FormControl>
                      <FormDescription>
                        Sube una nueva imagen para reemplazar la actual (JPG, PNG, WEBP). Máx 5MB. Si no subes una, se conservará la actual o la predeterminada.
                      </FormDescription>
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
                         <LeccionesFieldArrayForEdit moduloIndex={moduloIndex} control={form.control} disabled={isSubmitting} />
                         {form.formState.errors.modulos?.[moduloIndex]?.lecciones?.root?.message && <FormMessage>{form.formState.errors.modulos?.[moduloIndex]?.lecciones?.root?.message}</FormMessage>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Guardando Cambios...' : 'Guardar Cambios del Curso'}
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
}

function LeccionesFieldArrayForEdit({ moduloIndex, control, disabled }: LeccionesFieldArrayProps) {
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

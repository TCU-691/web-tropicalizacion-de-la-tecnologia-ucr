
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, Timestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { PenSquare, Loader2, AlertTriangle, PlusCircle, Trash2, Heading1, Heading2, Pilcrow, UploadCloud, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { upload as imageKitUpload, ImageKitAbortError, ImageKitInvalidRequestError, ImageKitServerError, ImageKitUploadNetworkError } from "@imagekit/next";
import { generateSlug, isSlugUnique } from '@/lib/utils';


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// --- Zod Schemas for Blocks ---
const headingBlockSchema = z.object({ id: z.string().optional(), type: z.literal('heading'), content: z.string().min(3, 'El título debe tener al menos 3 caracteres.') });
const subheadingBlockSchema = z.object({ id: z.string().optional(), type: z.literal('subheading'), content: z.string().min(3, 'El subtítulo debe tener al menos 3 caracteres.') });
const paragraphBlockSchema = z.object({ id: z.string().optional(), type: z.literal('paragraph'), content: z.string().min(20, 'El párrafo debe tener al menos 20 caracteres.') });

const contentBlockSchema = z.discriminatedUnion('type', [headingBlockSchema, subheadingBlockSchema, paragraphBlockSchema]);
export type ContentBlock = z.infer<typeof contentBlockSchema>;

// --- Main Article Schema ---
const articleSchema = z.object({
  title: z.string().min(5, { message: 'El título del artículo debe tener al menos 5 caracteres.' }),
  category: z.string().min(3, { message: 'La categoría debe tener al menos 3 caracteres.' }),
  summary: z.string().min(20, 'El resumen debe tener al menos 20 caracteres.').max(200, 'El resumen no puede exceder los 200 caracteres.'),
  coverImage: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "La imagen de portada es obligatoria.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine((files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type), "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."),
  contentBlocks: z.array(contentBlockSchema).min(1, 'El artículo debe tener al menos un bloque de contenido.'),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

const authenticator = async () => {
    try {
        const response = await fetch("/api/upload-auth");
        if (!response.ok) { const errorText = await response.text(); throw new Error(`Request failed with status ${response.status}: ${errorText}`); }
        const data = await response.json();
        if (data.error) { throw new Error(data.error); }
        return data;
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Authentication request failed");
    }
};

const uploadImage = async (file: File, folder: string): Promise<string> => {
    const authParams = await authenticator();
    const response = await imageKitUpload({
        file,
        fileName: file.name,
        ...authParams,
        folder,
        useUniqueFileName: true,
    });
    return response.url;
};


export default function CrearArticuloPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: '',
      category: '',
      summary: '',
      coverImage: undefined,
      contentBlocks: [{ type: 'paragraph', content: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contentBlocks',
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login?redirect=/crear-articulo');
    }
  }, [currentUser, authLoading, router]);

  const onSubmit: SubmitHandler<ArticleFormValues> = async (data) => {
    if (!currentUser) {
      toast({ title: 'Error de Autenticación', description: 'Debes iniciar sesión para crear un artículo.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    const slug = generateSlug(data.title);
    const slugIsUnique = await isSlugUnique(slug, 'articles');

    if (!slugIsUnique) {
      toast({
        title: 'Título Duplicado',
        description: 'Ya existe un artículo con un título muy similar. Por favor, elige un título único.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const coverImageUrl = await uploadImage(data.coverImage[0], `articulos_portadas/${currentUser.uid}`);
      
      await addDoc(collection(db, 'articles'), {
        title: data.title,
        slug: slug,
        summary: data.summary,
        category: data.category,
        coverImageUrl: coverImageUrl,
        contentBlocks: data.contentBlocks,
        status: 'pendiente',
        authorId: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast({
        title: '¡Artículo Enviado!',
        description: 'Tu artículo ha sido enviado para revisión.',
      });
      router.push('/articulos');

    } catch (error) {
      console.error("Error creating article: ", error);
      let errorMessage = 'Ocurrió un error desconocido.';
      if (error instanceof ImageKitAbortError) errorMessage = `Subida abortada: ${error.reason}`;
      else if (error instanceof ImageKitInvalidRequestError) errorMessage = `Solicitud inválida: ${error.message}`;
      else if (error instanceof ImageKitUploadNetworkError) errorMessage = `Error de red: ${error.message}`;
      else if (error instanceof ImageKitServerError) errorMessage = `Error del servidor de ImageKit: ${error.message}`;
      else if (error instanceof Error) errorMessage = error.message;
      
      toast({
        title: 'Error al Crear Artículo',
        description: errorMessage,
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

  if (!currentUser) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Acceso Requerido</h1>
        <p className="text-muted-foreground mb-6">Debes iniciar sesión para crear un artículo.</p>
        <Button asChild>
          <Link href="/login?redirect=/crear-articulo">Iniciar Sesión</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <Card className="max-w-3xl mx-auto shadow-xl">
            <CardHeader className="text-center">
              <PenSquare className="mx-auto h-12 w-12 text-primary mb-3" />
              <CardTitle className="font-headline text-3xl md:text-4xl">Escribir un Nuevo Artículo</CardTitle>
              <CardDescription className="text-lg text-foreground/70">
                Comparte tu perspectiva. Tu artículo será revisado antes de publicarse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-10">
              <section className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
                 <h2 className="font-headline text-2xl font-semibold text-primary">Información Principal</h2>
                 <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Título Principal del Artículo</FormLabel><FormControl><Input placeholder="Un título atractivo y descriptivo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input placeholder="Ej: Educación, Sostenibilidad, Tecnología..." {...field} /></FormControl><FormDescription>Una palabra para clasificar tu artículo.</FormDescription><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="summary" render={({ field }) => ( <FormItem><FormLabel>Resumen Corto</FormLabel><FormControl><Textarea placeholder="Un breve resumen que aparecerá en las tarjetas de vista previa..." {...field} rows={3} /></FormControl><FormDescription>Máximo 200 caracteres.</FormDescription><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="coverImage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />Imagen de Portada (Obligatoria)</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          field.onChange(e.target.files);
                          if (file && ACCEPTED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE) {
                            const reader = new FileReader();
                            reader.onloadend = () => setImagePreview(reader.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setImagePreview(null);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>Sube una imagen (JPG, PNG, WEBP). Máx 5MB.</FormDescription>
                    {imagePreview && (
                      <div className="mt-4"><img src={imagePreview} alt="Vista previa" className="w-full max-w-sm rounded-md border shadow-sm aspect-video object-cover" data-ai-hint="article cover preview" /></div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </section>

              <section className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
                  <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <h2 className="font-headline text-2xl font-semibold text-primary">Contenido del Artículo</h2>
                     <div className='flex flex-wrap gap-2'>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ type: 'heading', content: '' })}><Heading1 className="mr-2 h-4 w-4" /> Título</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ type: 'subheading', content: '' })}><Heading2 className="mr-2 h-4 w-4" /> Subtítulo</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ type: 'paragraph', content: '' })}><Pilcrow className="mr-2 h-4 w-4" /> Párrafo</Button>
                     </div>
                  </div>
                   {form.formState.errors.contentBlocks?.root && <FormMessage>{form.formState.errors.contentBlocks.root.message}</FormMessage>}

                  <div className="space-y-6">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-4 bg-muted/30 relative">
                         <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar bloque</span>
                        </Button>

                        {field.type === 'heading' && (
                          <FormField control={form.control} name={`contentBlocks.${index}.content`} render={({ field: f }) => (
                            <FormItem><FormLabel className='flex items-center gap-2'><Heading1 className='w-4 h-4'/> Título de Sección</FormLabel><FormControl><Input {...f} placeholder="Escribe un título de sección..." className="text-2xl font-bold border-0 border-b-2 rounded-none px-0 shadow-none focus-visible:ring-0" /></FormControl><FormMessage /></FormItem>
                          )} />
                        )}
                        {field.type === 'subheading' && (
                          <FormField control={form.control} name={`contentBlocks.${index}.content`} render={({ field: f }) => (
                           <FormItem><FormLabel className='flex items-center gap-2'><Heading2 className='w-4 h-4'/> Subtítulo</FormLabel><FormControl><Input {...f} placeholder="Escribe un subtítulo..." className="text-xl font-semibold border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0" /></FormControl><FormMessage /></FormItem>
                          )} />
                        )}
                        {field.type === 'paragraph' && (
                          <FormField control={form.control} name={`contentBlocks.${index}.content`} render={({ field: f }) => (
                            <FormItem><FormLabel className='flex items-center gap-2'><Pilcrow className='w-4 h-4'/> Párrafo</FormLabel><FormControl><Textarea {...f} placeholder="Escribe tu contenido aquí..." rows={8} className="text-base" /></FormControl><FormMessage /></FormItem>
                          )} />
                        )}
                      </Card>
                    ))}
                  </div>
              </section>

               <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Enviando Artículo...' : 'Enviar para Aprobación'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, type SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, AlertTriangle, PlusCircle, Trash2, Heading1, Heading2, Pilcrow, Edit3, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { FirestoreArticle } from '@/types/article';
import { Image as ImageKitImage, upload as imageKitUpload, ImageKitAbortError, ImageKitInvalidRequestError, ImageKitServerError, ImageKitUploadNetworkError } from "@imagekit/next";
import { generateSlug, isSlugUnique } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// --- Zod Schemas for Blocks (reused) ---
const headingBlockSchema = z.object({ id: z.string().optional(), type: z.literal('heading'), content: z.string().min(3, 'El título debe tener al menos 3 caracteres.') });
const subheadingBlockSchema = z.object({ id: z.string().optional(), type: z.literal('subheading'), content: z.string().min(3, 'El subtítulo debe tener al menos 3 caracteres.') });
const paragraphBlockSchema = z.object({ id: z.string().optional(), type: z.literal('paragraph'), content: z.string().min(20, 'El párrafo debe tener al menos 20 caracteres.') });

const contentBlockSchema = z.discriminatedUnion('type', [headingBlockSchema, subheadingBlockSchema, paragraphBlockSchema]);

const articleEditSchema = z.object({
  title: z.string().min(5, { message: 'El título del artículo debe tener al menos 5 caracteres.' }),
  category: z.string().min(3, { message: 'La categoría debe tener al menos 3 caracteres.' }),
  summary: z.string().min(20, 'El resumen debe tener al menos 20 caracteres.').max(200, 'El resumen no puede exceder los 200 caracteres.'),
  coverImage: z.custom<FileList>().optional(),
  contentBlocks: z.array(contentBlockSchema).min(1, 'El artículo debe tener al menos un bloque de contenido.'),
});

type ArticleEditFormValues = z.infer<typeof articleEditSchema>;

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
    const response = await imageKitUpload({ file, fileName: file.name, ...authParams, folder, useUniqueFileName: true, });
    return response.url;
};

export default function EditArticuloPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const articleId = params.articleId as string;
  const { toast } = useToast();
  
  const [isLoadingArticle, setIsLoadingArticle] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [articleNotFound, setArticleNotFound] = useState(false);
  const [initialArticleData, setInitialArticleData] = useState<FirestoreArticle | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  const form = useForm<ArticleEditFormValues>({
    resolver: zodResolver(articleEditSchema),
    defaultValues: { title: '', category: '', summary: '', contentBlocks: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contentBlocks',
  });

  useEffect(() => {
    if (!authLoading && (!currentUser || userProfile?.rol !== 'profesor')) {
      router.push(`/unauthorized?page=editar-articulo`);
    }
  }, [currentUser, userProfile, authLoading, router]);

  useEffect(() => {
    if (articleId && currentUser) {
      const fetchArticle = async () => {
        setIsLoadingArticle(true);
        try {
          const articleDocRef = doc(db, 'articles', articleId);
          const articleDocSnap = await getDoc(articleDocRef);

          if (articleDocSnap.exists()) {
            const articleData = { id: articleDocSnap.id, ...articleDocSnap.data() } as FirestoreArticle;
            setInitialArticleData(articleData);
            form.reset({
              title: articleData.title,
              category: articleData.category,
              summary: articleData.summary,
              contentBlocks: articleData.contentBlocks.map(b => ({ ...b, id: b.id || crypto.randomUUID() })),
            });
          } else {
            setArticleNotFound(true);
          }
        } catch (error) {
          console.error("Error fetching article:", error);
          toast({ title: 'Error al cargar el artículo', variant: 'destructive' });
        } finally {
          setIsLoadingArticle(false);
        }
      };
      fetchArticle();
    }
  }, [articleId, currentUser, form, toast]);

  const onSubmit: SubmitHandler<ArticleEditFormValues> = async (data) => {
    if (!currentUser || !articleId || !initialArticleData) return;
    setIsSubmitting(true);
    
    if (data.title !== initialArticleData.title) {
        const newSlug = generateSlug(data.title);
        const slugIsUnique = await isSlugUnique(newSlug, 'articles');
        if (!slugIsUnique) {
            toast({
                title: 'Título Duplicado',
                description: 'Ya existe un artículo con un título muy similar. Por favor, elige un título único.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }
    }

    try {
      let finalCoverImageUrl = initialArticleData.coverImageUrl;
      if (data.coverImage?.[0]) {
        finalCoverImageUrl = await uploadImage(data.coverImage[0], `articulos_portadas/${currentUser.uid}`);
      }

      const articleRef = doc(db, 'articles', articleId);
      await updateDoc(articleRef, {
        title: data.title,
        slug: generateSlug(data.title),
        summary: data.summary,
        category: data.category,
        coverImageUrl: finalCoverImageUrl,
        contentBlocks: data.contentBlocks,
        updatedAt: Timestamp.now(),
      });
      toast({ title: '¡Artículo Actualizado!', description: 'Los cambios han sido guardados.' });
      router.push('/profesor/panel-articulos');
    } catch (error) {
      console.error("Error updating article: ", error);
      toast({ title: 'Error al Actualizar', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingArticle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando editor...</p>
      </div>
    );
  }
  
  if (articleNotFound) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Artículo No Encontrado</h1>
        <p className="text-muted-foreground mb-6">El artículo que intentas editar no existe o fue eliminado.</p>
        <Button asChild><Link href="/profesor/panel-articulos">Volver al Panel</Link></Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
       <Button asChild variant="outline" className="mb-6 group">
        <Link href="/profesor/panel-articulos">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al Panel de Artículos
        </Link>
      </Button>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <Card className="max-w-3xl mx-auto shadow-xl">
            <CardHeader className="text-center">
              <Edit3 className="mx-auto h-12 w-12 text-primary mb-3" />
              <CardTitle className="font-headline text-3xl md:text-4xl">Editar Artículo</CardTitle>
              <CardDescription className="text-lg text-foreground/70">
                Modifica la información y el contenido del artículo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-10">
              <section className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
                 <h2 className="font-headline text-2xl font-semibold text-primary">Información Principal</h2>
                 <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Título Principal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="summary" render={({ field }) => ( <FormItem><FormLabel>Resumen Corto</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormDescription>Máximo 200 caracteres.</FormDescription><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="coverImage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />Imagen de Portada (Opcional)</FormLabel>
                     <div className="mt-2 mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Imagen Actual:</p>
                        <div className="relative w-full aspect-video max-w-sm rounded-md overflow-hidden border shadow-sm">
                            <ImageKitImage src={newImagePreview || initialArticleData?.coverImageUrl || ''} alt="Imagen actual del artículo" layout="fill" objectFit="cover" data-ai-hint="article cover current"/>
                        </div>
                    </div>
                    <FormControl>
                      <Input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          field.onChange(e.target.files);
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setNewImagePreview(reader.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setNewImagePreview(null);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>Sube una nueva imagen para reemplazar la actual (JPG, PNG, WEBP). Máx 5MB.</FormDescription>
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
                            <FormItem><FormLabel className='flex items-center gap-2'><Heading1 className='w-4 h-4'/> Título de Sección</FormLabel><FormControl><Input {...f} placeholder="Escribe un título..." className="text-2xl font-bold border-0 border-b-2 rounded-none px-0" /></FormControl><FormMessage /></FormItem>
                          )} />
                        )}
                        {field.type === 'subheading' && (
                          <FormField control={form.control} name={`contentBlocks.${index}.content`} render={({ field: f }) => (
                           <FormItem><FormLabel className='flex items-center gap-2'><Heading2 className='w-4 h-4'/> Subtítulo</FormLabel><FormControl><Input {...f} placeholder="Escribe un subtítulo..." className="text-xl font-semibold border-0 border-b rounded-none px-0" /></FormControl><FormMessage /></FormItem>
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
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Guardando Cambios...' : 'Guardar Cambios'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}

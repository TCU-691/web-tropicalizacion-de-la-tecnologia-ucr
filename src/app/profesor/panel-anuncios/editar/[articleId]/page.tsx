'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { canManageProjects } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, AlertTriangle, Edit3, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { FirestoreArticle } from '@/types/article';
import { Image as ImageKitImage, upload as imageKitUpload } from '@imagekit/next';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const articleEditSchema = z.object({
  title: z.string().min(1, { message: 'El título es requerido.' }),
  description: z.string().min(1, { message: 'La descripción es requerida.' }),
  linkUrl: z.string().url({ message: 'URL inválida. Debe comenzar con http:// o https://' }).optional().or(z.literal('')),
  image: z
    .custom<FileList>()
    .optional()
    .refine((files) => !files || files.length === 0 || files.length === 1, 'Solo puedes subir una imagen.')
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `El tamaño máximo es ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
    .refine((files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type), 'Solo se aceptan formatos .jpg, .jpeg, .png y .webp.'),
});

type ArticleEditFormValues = z.infer<typeof articleEditSchema>;

const authenticator = async () => {
  try {
    const response = await fetch('/api/upload-auth');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Authentication request failed');
  }
};

function assertDb(db: typeof import('@/lib/firebase').db): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

const uploadImage = async (file: File, folder: string): Promise<string> => {
  const authParams = await authenticator();
  const response = await imageKitUpload({ file, fileName: file.name, ...authParams, folder, useUniqueFileName: true });
  if (!response.url) {
    throw new Error('No se pudo obtener la URL de la imagen subida.');
  }
  return response.url;
};

export default function EditAnuncioPage() {
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
    defaultValues: { title: '', description: '', linkUrl: '' },
  });

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/profesor/panel-anuncios');
      } else if (userProfile && !canManageProjects(userProfile.rol)) {
        router.push('/unauthorized?page=editar-anuncio');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  useEffect(() => {
    if (articleId && currentUser) {
      const fetchArticle = async () => {
        setIsLoadingArticle(true);
        try {
          assertDb(db);
          const articleDocRef = doc(db, 'articles', articleId);
          const articleDocSnap = await getDoc(articleDocRef);

          if (articleDocSnap.exists()) {
            const articleData = { id: articleDocSnap.id, ...articleDocSnap.data() } as FirestoreArticle;
            setInitialArticleData(articleData);
            form.reset({
              title: articleData.title,
              description: articleData.description,
              linkUrl: articleData.linkUrl || '',
            });
          } else {
            setArticleNotFound(true);
          }
        } catch (error) {
          console.error('Error fetching article:', error);
          toast({ title: 'Error al cargar el anuncio', variant: 'destructive' });
        } finally {
          setIsLoadingArticle(false);
        }
      };
      fetchArticle();
    }
  }, [articleId, currentUser, form, toast]);

  const onSubmit: SubmitHandler<ArticleEditFormValues> = async (data) => {
    if (!currentUser || !articleId || !initialArticleData) return;

    if (!initialArticleData.imageUrl && !data.image?.[0]) {
      form.setError('image', { type: 'manual', message: 'La imagen es obligatoria para el anuncio.' });
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = initialArticleData.imageUrl;
      if (data.image?.[0]) {
        finalImageUrl = await uploadImage(data.image[0], `articulos_imagenes/${currentUser.uid}`);
      }

      assertDb(db);
      const articleRef = doc(db, 'articles', articleId);
      await updateDoc(articleRef, {
        title: data.title,
        description: data.description,
        linkUrl: data.linkUrl || undefined,
        imageUrl: finalImageUrl,
        updatedAt: Timestamp.now(),
      });
      toast({ title: '¡Anuncio Actualizado!', description: 'Los cambios han sido guardados.' });
      router.push('/profesor/panel-anuncios');
    } catch (error) {
      console.error('Error updating article: ', error);
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
        <h1 className="text-2xl font-semibold mb-2">Anuncio No Encontrado</h1>
        <p className="text-muted-foreground mb-6">El anuncio que intentas editar no existe o fue eliminado.</p>
        <Button asChild>
          <Link href="/profesor/panel-anuncios">Volver al Panel</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button asChild variant="outline" className="mb-6 group">
        <Link href="/profesor/panel-anuncios">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al Panel de Anuncios
        </Link>
      </Button>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <Edit3 className="mx-auto h-12 w-12 text-primary mb-3" />
            <CardTitle className="text-3xl">Editar Anuncio</CardTitle>
            <CardDescription>Actualiza el título, descripción e imagen del anuncio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Escribe el título del anuncio..." disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Escribe la descripción del anuncio..." rows={6} disabled={isSubmitting} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enlace Externo (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://ejemplo.com" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>Agrega un enlace externo relacionado con el anuncio (ej: formulario, documento, recurso externo)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Imagen (Obligatoria)
                    </FormLabel>
                    {initialArticleData?.imageUrl && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">Imagen Actual:</p>
                        <div className="relative w-full aspect-video max-w-sm rounded-lg overflow-hidden border">
                          <ImageKitImage src={newImagePreview || initialArticleData.imageUrl} alt="Imagen actual del anuncio" layout="fill" objectFit="cover" />
                        </div>
                      </div>
                    )}
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
                          }
                        }}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>JPG, PNG o WEBP. Máximo 5MB.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

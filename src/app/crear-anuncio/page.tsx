'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { canManageProjects } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { PenSquare, Loader2, AlertTriangle, Image as ImageIcon, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { upload as imageKitUpload, ImageKitAbortError, ImageKitInvalidRequestError, ImageKitServerError, ImageKitUploadNetworkError } from '@imagekit/next';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const announcementSchema = z.object({
  title: z.string().min(1, { message: 'El título es obligatorio.' }),
  description: z.string().min(1, { message: 'La descripción es obligatoria.' }),
  linkUrl: z.string().url({ message: 'URL inválida. Debe comenzar con http:// o https://' }).optional().or(z.literal('')),
  image: z
    .custom<FileList>((files) => files instanceof FileList, { message: 'La imagen es obligatoria.' })
    .refine((files) => files.length === 1, 'Debes subir una imagen.')
    .refine((files) => files[0].size <= MAX_FILE_SIZE, `El tamaño máximo es ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
    .refine((files) => ACCEPTED_IMAGE_TYPES.includes(files[0].type), 'Solo se aceptan formatos .jpg, .jpeg, .png y .webp.'),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

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

export default function CrearAnuncioPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      description: '',
      linkUrl: '',
      image: undefined,
    },
  });

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/crear-anuncio');
      } else if (userProfile && !canManageProjects(userProfile.rol)) {
        router.push('/unauthorized?page=crear-anuncio');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  const onSubmit: SubmitHandler<AnnouncementFormValues> = async (data) => {
    if (!currentUser) {
      toast({ title: 'Error de Autenticación', description: 'Debes iniciar sesión para crear un anuncio.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    try {
      assertDb(db);

      const authParams = await authenticator();
      const response = await imageKitUpload({
        file: data.image[0],
        fileName: data.image[0].name,
        ...authParams,
        folder: `anuncios/${currentUser.uid}`,
        useUniqueFileName: true,
      });
      if (!response.url) {
        throw new Error('No se pudo obtener la URL de la imagen subida.');
      }
      const imageUrl = response.url;
      const imageFileId = (response as any).fileId || null;

      const articleData: any = {
        title: data.title,
        description: data.description,
        imageUrl,
        authorId: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      if (imageFileId) {
        articleData.imageFileId = imageFileId;
      }
      
      if (data.linkUrl) {
        articleData.linkUrl = data.linkUrl;
      }
      
      await addDoc(collection(db, 'articles'), articleData);

      toast({
        title: '¡Anuncio Creado!',
        description: 'Tu anuncio ha sido publicado correctamente.',
      });
      router.push('/anuncios');
    } catch (error) {
      console.error('Error creating announcement: ', error);
      let errorMessage = 'Ocurrió un error desconocido.';
      if (error instanceof ImageKitAbortError) errorMessage = `Subida abortada: ${error.reason}`;
      else if (error instanceof ImageKitInvalidRequestError) errorMessage = `Solicitud inválida: ${error.message}`;
      else if (error instanceof ImageKitUploadNetworkError) errorMessage = `Error de red: ${error.message}`;
      else if (error instanceof ImageKitServerError) errorMessage = `Error del servidor de ImageKit: ${error.message}`;
      else if (error instanceof Error) errorMessage = error.message;

      toast({
        title: 'Error al Crear Anuncio',
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
        <p className="text-muted-foreground mb-6">Debes iniciar sesión para crear un anuncio.</p>
        <Button asChild>
          <Link href="/login?redirect=/crear-anuncio">Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  if (!userProfile || !canManageProjects(userProfile.rol)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Permisos Insuficientes</h1>
        <p className="text-muted-foreground mb-6">Solo profesores y asistentes pueden crear anuncios.</p>
        <Button asChild>
          <Link href="/anuncios">Volver a Anuncios</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <PenSquare className="mx-auto h-12 w-12 text-primary mb-3" />
            <CardTitle className="font-headline text-3xl md:text-4xl">Crear Anuncio</CardTitle>
            <CardDescription className="text-lg text-foreground/70">Comparte información importante con la comunidad</CardDescription>
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
                      <Input placeholder="Título del anuncio" {...field} />
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
                      <Textarea placeholder="Detalla tu anuncio aquí..." {...field} rows={6} />
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
                      <Input type="url" placeholder="https://ejemplo.com" {...field} />
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
                    <FormLabel className="flex items-center">
                      <ImageIcon className="mr-2 h-4 w-4" />Imagen (Obligatoria)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        required
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
                    <FormDescription>JPG, PNG o WEBP. Máx 5MB.</FormDescription>
                    {imagePreview && (
                      <div className="mt-4">
                        <img src={imagePreview} alt="Vista previa" className="w-full max-w-sm rounded-md border shadow-sm aspect-video object-cover" />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Publicando...' : 'Publicar Anuncio'}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

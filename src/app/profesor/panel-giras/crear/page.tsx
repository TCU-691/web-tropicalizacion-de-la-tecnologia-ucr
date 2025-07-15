
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, ArrowLeft, Image as ImageIcon, Map, Calendar, Info, MapPin, Flag } from 'lucide-react';
import { upload as imageKitUpload, ImageKitAbortError, ImageKitInvalidRequestError, ImageKitServerError, ImageKitUploadNetworkError } from "@imagekit/next";
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateSlug, isSlugUnique } from '@/lib/utils';


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const tourSchema = z.object({
  title: z.string().min(5, { message: 'El título de la gira debe tener al menos 5 caracteres.' }),
  description: z.string().min(20, { message: 'La descripción debe tener al menos 20 caracteres.' }),
  location: z.string().min(3, { message: 'La ubicación es obligatoria.' }),
  date: z.string().min(1, { message: 'La fecha es obligatoria.' }),
  status: z.enum(['Próximamente', 'Realizada', 'Cancelada'], { required_error: 'Por favor selecciona un estado.' }),
  imageUrl: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "La imagen de portada es obligatoria.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine((files) => files?.[0]?.type && ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type), "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."),
});

type TourFormValues = z.infer<typeof tourSchema>;

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

export default function CrearGiraPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<TourFormValues>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      date: '',
      status: undefined,
      imageUrl: undefined,
    },
  });
  
  const onSubmit: SubmitHandler<TourFormValues> = async (data) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    
    const slug = generateSlug(data.title);
    const slugIsUnique = await isSlugUnique(slug, 'tours');

    if (!slugIsUnique) {
      toast({
        title: 'Título Duplicado',
        description: 'Ya existe una gira con un título muy similar. Por favor, elige un título único.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const coverImageUrl = await uploadImage(data.imageUrl[0], `giras_portadas/${currentUser.uid}`);
      
      const tourDataToSave = {
        title: data.title,
        slug: slug,
        description: data.description,
        location: data.location,
        date: data.date,
        status: data.status,
        imageUrl: coverImageUrl,
        createdBy: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      await addDoc(collection(db, 'tours'), tourDataToSave);

      toast({
        title: "Gira Creada",
        description: `La nueva gira ha sido guardada exitosamente.`,
      });
      router.push('/profesor/panel-giras');

    } catch (error) {
      console.error("Error creating tour: ", error);
      let errorMessage = 'Ocurrió un error desconocido.';
      if (error instanceof ImageKitAbortError) errorMessage = `Subida abortada: ${error.reason}`;
      else if (error instanceof ImageKitInvalidRequestError) errorMessage = `Solicitud inválida: ${error.message}`;
      else if (error instanceof ImageKitUploadNetworkError) errorMessage = `Error de red: ${error.message}`;
      else if (error instanceof ImageKitServerError) errorMessage = `Error del servidor de ImageKit: ${error.message}`;
      else if (error instanceof Error) errorMessage = error.message;

      toast({
        title: 'Error al Crear Gira',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (authLoading || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button asChild variant="outline" className="mb-6 group">
        <Link href="/profesor/panel-giras">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al Panel de Giras
        </Link>
      </Button>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                <Card className="max-w-3xl mx-auto shadow-xl">
                    <CardHeader className="text-center">
                    <Map className="mx-auto h-12 w-12 text-primary mb-3" />
                    <CardTitle className="font-headline text-3xl md:text-4xl">
                        Crear Nueva Gira
                    </CardTitle>
                    <CardDescription className="text-lg text-foreground/70">
                        Completa la información para registrar una nueva gira o actividad.
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4"/>Título de la Gira</FormLabel><FormControl><Input placeholder="Ej: Visita a CoopeSoliDar R.L." {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Calendar className="mr-2 h-4 w-4"/>Fecha</FormLabel><FormControl><Input placeholder="Ej: 25 de Octubre, 2024" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="location" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4"/>Ubicación</FormLabel><FormControl><Input placeholder="Ej: Comunidad de CoopeSoliDar, Puntarenas" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Flag className="mr-2 h-4 w-4"/>Estado</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Próximamente">Próximamente</SelectItem><SelectItem value="Realizada">Realizada</SelectItem><SelectItem value="Cancelada">Cancelada</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Describe los detalles, objetivos y actividades de la gira..." {...field} rows={6} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
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
                            <div className="mt-4"><img src={imagePreview} alt="Vista previa" className="w-full max-w-sm rounded-md border shadow-sm aspect-video object-cover" data-ai-hint="tour cover preview" /></div>
                            )}
                            <FormMessage />
                        </FormItem>
                        )} />
                        
                        <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                            {isSubmitting ? 'Guardando...' : 'Guardar Gira'}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </Form>
    </div>
  );
}

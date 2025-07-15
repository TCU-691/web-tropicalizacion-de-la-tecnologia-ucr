
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Save, Loader2, ArrowLeft, Image as ImageIcon, Map, Calendar, Info, MapPin, Flag, AlertTriangle, Edit3 } from 'lucide-react';
import { Image as ImageKitImage, upload as imageKitUpload, ImageKitAbortError, ImageKitInvalidRequestError, ImageKitServerError, ImageKitUploadNetworkError } from "@imagekit/next";
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreTour } from '@/types/tour';
import { generateSlug, isSlugUnique } from '@/lib/utils';
import { Label } from '@/components/ui/label';


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const tourEditSchema = z.object({
  title: z.string().min(5, { message: 'El título de la gira debe tener al menos 5 caracteres.' }),
  description: z.string().min(20, { message: 'La descripción debe tener al menos 20 caracteres.' }),
  location: z.string().min(3, { message: 'La ubicación es obligatoria.' }),
  date: z.string().min(1, { message: 'La fecha es obligatoria.' }),
  status: z.enum(['Próximamente', 'Realizada', 'Cancelada'], { required_error: 'Por favor selecciona un estado.' }),
  imageUrl: z.custom<FileList>().optional(),
});

type TourEditFormValues = z.infer<typeof tourEditSchema>;

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

export default function EditarGiraPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tourId = params.tourId as string;
  const { toast } = useToast();
  
  const [isLoadingTour, setIsLoadingTour] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tourNotFound, setTourNotFound] = useState(false);
  const [initialTourData, setInitialTourData] = useState<FirestoreTour | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  const form = useForm<TourEditFormValues>({
    resolver: zodResolver(tourEditSchema),
    defaultValues: { title: '', description: '', location: '', date: '', status: undefined },
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push(`/login?redirect=/profesor/panel-giras/editar/${tourId}`);
    }
  }, [currentUser, authLoading, router, tourId]);

  useEffect(() => {
    if (tourId && currentUser) {
      const fetchTour = async () => {
        setIsLoadingTour(true);
        setTourNotFound(false);
        try {
          const tourDocRef = doc(db, 'tours', tourId);
          const tourDocSnap = await getDoc(tourDocRef);

          if (tourDocSnap.exists()) {
            const tourData = { id: tourDocSnap.id, ...tourDocSnap.data() } as FirestoreTour;
            setInitialTourData(tourData);
            form.reset({
              title: tourData.title,
              description: tourData.description,
              location: tourData.location,
              date: tourData.date,
              status: tourData.status,
            });
          } else {
            setTourNotFound(true);
            toast({ title: 'Gira no encontrada', description: 'La gira que intentas editar no existe.', variant: 'destructive' });
          }
        } catch (error) {
          console.error("Error fetching tour for editing:", error);
          toast({ title: 'Error al cargar la gira', description: 'No se pudo obtener la información de la gira.', variant: 'destructive' });
        } finally {
          setIsLoadingTour(false);
        }
      };
      fetchTour();
    }
  }, [tourId, currentUser, form, toast]);


  const onSubmit: SubmitHandler<TourEditFormValues> = async (data) => {
    if (!currentUser || !tourId || !initialTourData) return;
    setIsSubmitting(true);
    
    if (data.title !== initialTourData.title) {
        const newSlug = generateSlug(data.title);
        const slugIsUnique = await isSlugUnique(newSlug, 'tours');
        if (!slugIsUnique) {
            toast({
                title: 'Título Duplicado',
                description: 'Ya existe una gira con un título muy similar. Por favor, elige un título único.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }
    }

    try {
        let finalImageUrl = initialTourData.imageUrl;
        if (data.imageUrl?.[0]) {
            finalImageUrl = await uploadImage(data.imageUrl[0], `giras_portadas/${currentUser.uid}`);
        }

        const tourDataToUpdate = {
            title: data.title,
            slug: generateSlug(data.title),
            description: data.description,
            location: data.location,
            date: data.date,
            status: data.status,
            imageUrl: finalImageUrl,
            updatedAt: Timestamp.now(),
        };

        const tourRef = doc(db, 'tours', tourId);
        await updateDoc(tourRef, tourDataToUpdate);
        
        toast({ title: "Gira Actualizada", description: "Los cambios han sido guardados exitosamente.", });
        router.push('/profesor/panel-giras');

    } catch (error) {
        console.error("Error updating tour: ", error);
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        toast({ title: 'Error al Actualizar Gira', description: errorMessage, variant: 'destructive', });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (authLoading || isLoadingTour) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground">Cargando editor de gira...</p></div>);
  }
  
  if (tourNotFound) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center"><AlertTriangle className="h-12 w-12 text-destructive mb-4" /><h1 className="text-2xl font-semibold mb-2">Gira No Encontrada</h1><p className="text-muted-foreground mb-6">La gira que intentas editar no existe o fue eliminada.</p><Button asChild><Link href="/profesor/panel-giras">Volver al Panel</Link></Button></div>)
  }

  return (
    <div className="container mx-auto py-8">
      <Button asChild variant="outline" className="mb-6 group">
        <Link href="/profesor/panel-giras"><ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />Volver al Panel</Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <Card className="max-w-3xl mx-auto shadow-xl">
            <CardHeader className="text-center">
              <Edit3 className="mx-auto h-12 w-12 text-primary mb-3" />
              <CardTitle className="font-headline text-3xl md:text-4xl">Editar Gira</CardTitle>
              <CardDescription className="text-lg text-foreground/70">Modifica los detalles de la gira o actividad.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4"/>Título de la Gira</FormLabel><FormControl><Input placeholder="Ej: Visita a CoopeSoliDar R.L." {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Calendar className="mr-2 h-4 w-4"/>Fecha</FormLabel><FormControl><Input placeholder="Ej: 25 de Octubre, 2024" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="location" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4"/>Ubicación</FormLabel><FormControl><Input placeholder="Ej: Comunidad de CoopeSoliDar, Puntarenas" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Flag className="mr-2 h-4 w-4"/>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Próximamente">Próximamente</SelectItem><SelectItem value="Realizada">Realizada</SelectItem><SelectItem value="Cancelada">Cancelada</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Describe los detalles, objetivos y actividades de la gira..." {...field} rows={6} /></FormControl><FormMessage /></FormItem> )} />

                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />Imagen de Portada (Opcional)</FormLabel>
                    <div className="mt-2 mb-4">
                        <Label className="text-xs text-muted-foreground">Imagen Actual:</Label>
                        <div className="relative w-full aspect-video max-w-sm rounded-md overflow-hidden border shadow-sm">
                            <ImageKitImage src={newImagePreview || initialTourData?.imageUrl || ''} alt="Imagen actual de la gira" layout="fill" objectFit="cover" data-ai-hint="tour cover current"/>
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

                <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    {isSubmitting ? 'Guardando Cambios...' : 'Guardar Cambios de la Gira'}
                </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}

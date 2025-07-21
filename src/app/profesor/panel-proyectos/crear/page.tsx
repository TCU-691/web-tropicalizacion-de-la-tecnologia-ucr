
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray, type SubmitHandler, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, ArrowLeft, Image as ImageIcon, BookCopy, Puzzle, PlusCircle, Trash2, Youtube, Text, Link2, Images, Contact, Newspaper, FolderArchive, BookHeart } from 'lucide-react';
import { upload as imageKitUpload, ImageKitAbortError, ImageKitInvalidRequestError, ImageKitServerError, ImageKitUploadNetworkError } from "@imagekit/next";
import { addDoc, collection, Timestamp, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreCourse } from '@/types/course';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateSlug, isSlugUnique } from '@/lib/utils';


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const categories = [
  "Programación", "Educación", "Tecnología", "Sostenibilidad", "Idiomas", 
  "Arte y Diseño", "Ciencias", "Matemáticas", "Negocios", "Salud y Bienestar", "Otro"
];

// --- Zod Schemas for Blocks ---
const textBlockSchema = z.object({ id: z.string().optional(), type: z.literal('text'), title: z.string().min(3, 'El título debe tener al menos 3 caracteres.').default(''), content: z.string().min(20, 'El contenido debe tener al menos 20 caracteres.').default(''),});
const videoBlockSchema = z.object({ id: z.string().optional(), type: z.literal('video'), title: z.string().min(3, 'El título debe tener al menos 3 caracteres.').default(''), youtubeUrl: z.string().url('Por favor ingresa una URL de YouTube válida.').default(''),});
const linkBlockSchema = z.object({ id: z.string().optional(), type: z.literal('link'), title: z.string().min(3, 'El título debe tener al menos 3 caracteres.').default(''), url: z.string().url('Por favor ingresa una URL válida.').default(''), description: z.string().optional().default(''),});
const contactBlockSchema = z.object({ id: z.string().optional(), type: z.literal('contact'), title: z.string().optional().default(''), name: z.string().min(3, 'El nombre es obligatorio.').default(''), email: z.string().email('Ingresa un email válido.').default(''), phone: z.string().optional().default(''), socialLink: z.string().url('Ingresa una URL válida para la red social.').or(z.literal('')).optional().default(''),});
const imageBlockSchema = z.object({ id: z.string().optional(), type: z.literal('image'), title: z.string().min(3, 'El título debe tener al menos 3 caracteres.').default(''), imageFile: z.custom<FileList>().refine(files => files?.length === 1, "Debes seleccionar una imagen."), imageUrl: z.string().optional(), description: z.string().optional().default('')});
const carouselImageSchema = z.object({ id: z.string(), imageFile: z.custom<FileList>().refine(files => files?.length === 1, "Debes seleccionar una imagen."), imageUrl: z.string().optional(),});
const carouselBlockSchema = z.object({ id: z.string().optional(), type: z.literal('carousel'), title: z.string().min(3, 'El título debe tener al menos 3 caracteres.').default(''), images: z.array(carouselImageSchema).min(2, "Debes añadir al menos 2 imágenes.").max(5, "No puedes añadir más de 5 imágenes."), description: z.string().optional().default(''),});
const paperSchema = z.object({ id: z.string().optional(), title: z.string().min(5, 'El título de la publicación es obligatorio.').default(''), authors: z.string().min(3, 'Los autores son obligatorios.').default(''), link: z.string().url('El enlace (DOI/PDF) debe ser una URL válida.').default(''), year: z.string().refine(val => /^\d{4}$/.test(val), 'Ingresa un año válido (YYYY).').default(''),});
const papersBlockSchema = z.object({ id: z.string().optional(), type: z.literal('papers'), title: z.string().min(3, 'El título del bloque es obligatorio.').default(''), papers: z.array(paperSchema).min(1, 'Debes añadir al menos una publicación.'),});
const resourceSchema = z.object({ id: z.string().optional(), title: z.string().min(3, 'El título del recurso es obligatorio.').default(''), description: z.string().optional().default(''), link: z.string().url('El enlace debe ser una URL válida.').default(''),});
const resourcesBlockSchema = z.object({ id: z.string().optional(), type: z.literal('resources'), title: z.string().min(3, 'El título del bloque es obligatorio.').default(''), resources: z.array(resourceSchema).min(1, 'Debes añadir al menos un recurso.'),});
const relatedCoursesBlockSchema = z.object({ id: z.string().optional(), type: z.literal('relatedCourses'), title: z.string().min(3, 'El título del bloque es obligatorio.').default(''), courseIds: z.array(z.string()).min(1, 'Debes seleccionar al menos un curso.'),});

// Union of all block schemas
const blockSchema = z.discriminatedUnion('type', [ textBlockSchema, videoBlockSchema, imageBlockSchema, linkBlockSchema, carouselBlockSchema, contactBlockSchema, papersBlockSchema, resourcesBlockSchema, relatedCoursesBlockSchema,]);

// --- Main Project Schema ---
const projectSchema = z.object({
  name: z.string().min(5, { message: 'El nombre del proyecto debe tener al menos 5 caracteres.' }),
  description: z.string().min(20, { message: 'La descripción corta debe tener al menos 20 caracteres.' }).max(300, { message: 'La descripción corta no puede exceder los 300 caracteres.'}),
  category: z.string({ required_error: 'Por favor selecciona una categoría.' }),
  longDescription: z.string().min(50, { message: 'Los detalles del proyecto deben tener al menos 50 caracteres.' }),
  coverImage: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "La imagen de portada es obligatoria.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine((files) => files?.[0]?.type && ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type), "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."),
  blocks: z.array(blockSchema).optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

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
    if (!response.url) {
        throw new Error("No se pudo obtener la URL de la imagen subida.");
    }
    return response.url;
};

// --- Firestore null check helper ---
function assertDb(db: typeof import('@/lib/firebase').db): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

export default function CrearProyectoPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get('parentId');
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parentProjectName, setParentProjectName] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      coverImage: undefined,
      longDescription: '',
      blocks: [],
    },
  });

  useEffect(() => {
    if (parentId) {
      const fetchParentProject = async () => {
        assertDb(db);
        const parentDoc = await getDoc(doc(db, 'projects', parentId));
        if (parentDoc.exists()) {
          setParentProjectName(parentDoc.data().name);
        }
      };
      fetchParentProject();
    }
  }, [parentId]);


  const { fields: blockFields, append: appendBlock, remove: removeBlock } = useFieldArray({
    control: form.control,
    name: 'blocks',
  });
  
  const onSubmit: SubmitHandler<ProjectFormValues> = async (data) => {
    if (!currentUser) return;
    setIsSubmitting(true);

    const slug = generateSlug(data.name);
    const slugIsUnique = await isSlugUnique(slug, 'projects');

    if (!slugIsUnique) {
      toast({
        title: 'Nombre de Proyecto Duplicado',
        description: 'Ya existe un proyecto con un nombre muy similar. Por favor, elige un nombre único.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const coverImageUrl = await uploadImage(data.coverImage[0], `proyectos_portadas/${currentUser.uid}`);

      const processedBlocks = await Promise.all(
        (data.blocks || []).map(async (block) => {
          const newBlock = { ...block };
          switch (newBlock.type) {
            case 'image':
              if (newBlock.imageFile?.[0]) {
                const imageUrl = await uploadImage(newBlock.imageFile[0], `proyectos_bloques/${currentUser.uid}`);
                const { imageFile, ...rest } = newBlock;
                return { ...rest, imageUrl };
              }
              break;
            
            case 'carousel':
              if (newBlock.images) {
                const uploadedImages = await Promise.all(
                  newBlock.images.map(async (img) => {
                    if (img.imageFile?.[0]) {
                      const imageUrl = await uploadImage(img.imageFile[0], `proyectos_carruseles/${currentUser.uid}`);
                      return { id: img.id, imageUrl };
                    }
                    return { id: img.id, imageUrl: '' };
                  })
                );
                const { images, ...rest } = newBlock;
                return { ...rest, images: uploadedImages };
              }
              break;
            
            default:
              return newBlock;
          }
          return newBlock;
        })
      );
      
      const cleanBlocks = processedBlocks.map(block => {
        if (!block) return null;
        let finalBlock: any = { ...block };

        if (block.type === 'image') {
          delete finalBlock.imageFile;
        }
        if (block.type === 'carousel') {
          finalBlock.images = block.images.map((img: any) => ({ id: img.id, imageUrl: img.imageUrl }));
        }
        return finalBlock;
      }).filter(Boolean);

      assertDb(db);
      const projectDataToSave: any = {
        name: data.name,
        slug: slug,
        description: data.description,
        longDescription: data.longDescription,
        category: data.category,
        coverImageUrl,
        blocks: cleanBlocks,
        createdBy: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        parentId: parentId || null,
      };
      
      await addDoc(collection(db, 'projects'), projectDataToSave);

      toast({
        title: parentId ? "Subproyecto Creado" : "Proyecto Creado",
        description: `El nuevo ${parentId ? 'subproyecto' : 'proyecto'} ha sido guardado exitosamente.`,
      });
      router.push('/profesor/panel-proyectos');

    } catch (error) {
      console.error("Error creating project: ", error);
      let errorMessage = 'Ocurrió un error desconocido.';
      if (error instanceof ImageKitAbortError) errorMessage = `Subida abortada: ${error.reason}`;
      else if (error instanceof ImageKitInvalidRequestError) errorMessage = `Solicitud inválida: ${error.message}`;
      else if (error instanceof ImageKitUploadNetworkError) errorMessage = `Error de red: ${error.message}`;
      else if (error instanceof ImageKitServerError) errorMessage = `Error del servidor de ImageKit: ${error.message}`;
      else if (error instanceof Error) errorMessage = error.message;

      toast({
        title: 'Error al Crear Proyecto',
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
    <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground">Cargando...</p></div>}>
      <div className="container mx-auto py-8">
        <Button asChild variant="outline" className="mb-6 group">
          <Link href="/profesor/panel-proyectos">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver al Panel de Proyectos
          </Link>
        </Button>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <Card className="max-w-4xl mx-auto shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-3xl md:text-4xl">
                  {parentId ? 'Crear Subproyecto' : 'Crear Nuevo Proyecto'}
                </CardTitle>
                <CardDescription className="text-lg text-foreground/70">
                   {parentId && parentProjectName ? (
                      <>Creando un subproyecto para: <span className="font-semibold text-primary">{parentProjectName}</span></>
                   ) : (
                      'Completa la información y añade bloques de contenido para dar vida a tu proyecto.'
                   )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-10">
                
                <section className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
                  <h2 className="font-headline text-2xl font-semibold text-primary flex items-center"><BookCopy className="mr-2 h-6 w-6"/>Información Básica del Proyecto</h2>
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nombre del Proyecto</FormLabel><FormControl><Input placeholder="Ej: Plataforma de Reciclaje Inteligente" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger></FormControl><SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descripción Corta (Resumen)</FormLabel><FormControl><Textarea placeholder="Un resumen conciso..." {...field} rows={3} /></FormControl><FormDescription>Máximo 300 caracteres. Aparecerá en las tarjetas.</FormDescription><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="longDescription" render={({ field }) => ( <FormItem><FormLabel>Detalles del Proyecto (Descripción Larga)</FormLabel><FormControl><Textarea placeholder="Explica en detalle los objetivos, metodología, etc." {...field} rows={8} /></FormControl><FormDescription>Este es el contenido principal que se mostrará en la página del proyecto.</FormDescription><FormMessage /></FormItem> )} />
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
                        <div className="mt-4"><img src={imagePreview} alt="Vista previa" className="w-full max-w-sm rounded-md border shadow-sm aspect-video object-cover" data-ai-hint="project cover preview" /></div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                </section>

                <section className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
                   <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                      <h2 className="font-headline text-2xl font-semibold text-primary flex items-center"><Puzzle className="mr-2 h-6 w-6"/>Contenido Personalizado</h2>
                      <div className='flex flex-wrap gap-2'>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'text', title: '', content: '' })}>
                              <Text className="mr-2 h-4 w-4" /> Texto
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'video', title: '', youtubeUrl: '' })}>
                              <Youtube className="mr-2 h-4 w-4" /> Video
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'image', title: '', imageFile: new DataTransfer().files, description: '' })}>
                              <ImageIcon className="mr-2 h-4 w-4" /> Imagen
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'carousel', title: '', images: [{id: crypto.randomUUID(), imageFile: new DataTransfer().files}, {id: crypto.randomUUID(), imageFile: new DataTransfer().files}], description: '' })}>
                              <Images className="mr-2 h-4 w-4" /> Carrusel
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'link', title: '', url: '', description: '' })}>
                              <Link2 className="mr-2 h-4 w-4" /> Enlace
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'contact', title: 'Contacto', name: '', email: '', phone: '', socialLink: '' })}>
                              <Contact className="mr-2 h-4 w-4" /> Contacto
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'papers', title: 'Publicaciones', papers: [{ id: crypto.randomUUID(), title: '', authors: '', link: '', year: ''}] })}>
                              <Newspaper className="mr-2 h-4 w-4" /> Publicaciones
                          </Button>
                           <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'resources', title: 'Recursos Adicionales', resources: [{ id: crypto.randomUUID(), title: '', description: '', link: ''}] })}>
                              <FolderArchive className="mr-2 h-4 w-4" /> Recursos
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendBlock({ id: crypto.randomUUID(), type: 'relatedCourses', title: 'Cursos Relacionados', courseIds: [] })}>
                              <BookHeart className="mr-2 h-4 w-4" /> Cursos
                          </Button>
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      {blockFields.map((block, index) => (
                        <Card key={block.id} className="p-4 bg-muted/30 relative">
                          <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeBlock(index)}>
                            <Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar bloque</span>
                          </Button>
                          
                          {block.type === 'text' && (<div className="space-y-4 pr-10">
                              <h3 className="font-medium text-lg flex items-center"><Text className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Texto</h3>
                              <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título del Bloque</FormLabel><FormControl><Input placeholder="Ej: Metodología del Proyecto" {...field} /></FormControl><FormMessage /></FormItem> )} />
                              <FormField control={form.control} name={`blocks.${index}.content`} render={({ field }) => ( <FormItem><FormLabel>Contenido</FormLabel><FormControl><Textarea placeholder="Describe el contenido de esta sección..." {...field} rows={6} /></FormControl><FormMessage /></FormItem> )} />
                          </div>)}

                          {block.type === 'video' && (<div className="space-y-4 pr-10">
                              <h3 className="font-medium text-lg flex items-center"><Youtube className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Video</h3>
                              <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título del Video</FormLabel><FormControl><Input placeholder="Ej: Demostración del Prototipo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                              <FormField control={form.control} name={`blocks.${index}.youtubeUrl`} render={({ field }) => ( <FormItem><FormLabel>URL de YouTube</FormLabel><FormControl><Input type="url" placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                          </div>)}

                          {block.type === 'image' && (<div className="space-y-4 pr-10">
                               <h3 className="font-medium text-lg flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Imagen</h3>
                               <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título de la Imagen</FormLabel><FormControl><Input placeholder="Ej: Prototipo V1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`blocks.${index}.imageFile`} render={({ field }) => ( <FormItem><FormLabel>Archivo de Imagen</FormLabel><FormControl><Input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={(e) => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`blocks.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Describe brevemente la imagen..." {...field} rows={2} /></FormControl><FormMessage /></FormItem> )} />
                          </div>)}
                          
                          {block.type === 'carousel' && (
                              <div className="space-y-4 pr-10">
                                  <h3 className="font-medium text-lg flex items-center"><Images className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Carrusel</h3>
                                  <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título del Carrusel</FormLabel><FormControl><Input placeholder="Ej: Galería de Prototipos" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                  <FormField control={form.control} name={`blocks.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Describe brevemente la galería..." {...field} rows={2} /></FormControl><FormMessage /></FormItem> )} />
                                  <CarouselFieldArray blockIndex={index} />
                              </div>
                          )}

                          {block.type === 'link' && (<div className="space-y-4 pr-10">
                               <h3 className="font-medium text-lg flex items-center"><Link2 className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Enlace Externo</h3>
                               <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título del Enlace</FormLabel><FormControl><Input placeholder="Ej: Repositorio en GitHub" {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`blocks.${index}.url`} render={({ field }) => ( <FormItem><FormLabel>URL</FormLabel><FormControl><Input type="url" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`blocks.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Describe brevemente a qué dirige este enlace..." {...field} rows={2} /></FormControl><FormMessage /></FormItem> )} />
                          </div>)}

                          {block.type === 'contact' && (<div className="space-y-4 pr-10">
                               <h3 className="font-medium text-lg flex items-center"><Contact className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Contacto</h3>
                               <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título del Bloque</FormLabel><FormControl><Input placeholder="Ej: Responsable del Proyecto" {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`blocks.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Nombre de Contacto</FormLabel><FormControl><Input placeholder="Ej: Dr. Alan Grant" {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`blocks.${index}.email`} render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="contacto@universidad.ac.cr" {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`blocks.${index}.phone`} render={({ field }) => ( <FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input placeholder="+506 8888-8888" {...field} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name={`blocks.${index}.socialLink`} render={({ field }) => ( <FormItem><FormLabel>Enlace a Red Social (Opcional)</FormLabel><FormControl><Input type="url" placeholder="https://www.linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                          </div>)}

                          {block.type === 'papers' && (
                              <div className="space-y-4 pr-10">
                                  <h3 className="font-medium text-lg flex items-center"><Newspaper className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Publicaciones</h3>
                                  <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título del Bloque</FormLabel><FormControl><Input placeholder="Ej: Artículos Relevantes" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                  <PapersFieldArray blockIndex={index} />
                              </div>
                          )}

                          {block.type === 'resources' && (
                              <div className="space-y-4 pr-10">
                                  <h3 className="font-medium text-lg flex items-center"><FolderArchive className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Recursos</h3>
                                  <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título del Bloque</FormLabel><FormControl><Input placeholder="Ej: Materiales Adicionales" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                  <ResourcesFieldArray blockIndex={index} />
                              </div>
                          )}
                          
                          {block.type === 'relatedCourses' && (
                              <div className="space-y-4 pr-10">
                                  <h3 className="font-medium text-lg flex items-center"><BookHeart className="mr-2 h-5 w-5 text-muted-foreground"/>Bloque de Cursos Relacionados</h3>
                                  <FormField control={form.control} name={`blocks.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Título del Bloque</FormLabel><FormControl><Input placeholder="Ej: Cursos para Empezar" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                  <RelatedCoursesBlockSelector blockIndex={index} />
                              </div>
                          )}

                        </Card>
                      ))}
                      {blockFields.length === 0 && (
                          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground">Añade bloques de contenido para estructurar tu proyecto.</p>
                          </div>
                      )}
                   </div>
                </section>

                <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  {isSubmitting ? 'Guardando...' : 'Guardar Proyecto'}
                </Button>
              </CardContent>
            </Card>
          </form>
        </FormProvider>
      </div>
    </Suspense>
  );
}

// Sub-component for Papers Block
function PapersFieldArray({ blockIndex }: { blockIndex: number }) {
  const { control, formState: { errors } } = useFormContext<ProjectFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `blocks.${blockIndex}.papers`,
  });

  const blockError = errors.blocks?.[blockIndex];
  const papersError = blockError && typeof blockError === 'object' && 'papers' in blockError ? (blockError as any).papers : undefined;

  return (
    <div className="space-y-4 pl-4 border-l-2">
      <FormLabel>Publicaciones</FormLabel>
      {fields.map((field, index) => (
        <div key={field.id} className="p-3 border rounded-md bg-card/80 shadow-sm relative">
            <div className='flex justify-between items-center mb-2'>
                <Label className="text-xs text-muted-foreground">Publicación {index + 1}</Label>
                {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar publicación</span>
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={control} name={`blocks.${blockIndex}.papers.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Título del paper" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`blocks.${blockIndex}.papers.${index}.authors`} render={({ field }) => (<FormItem><FormLabel>Autores</FormLabel><FormControl><Input placeholder="Ej: J. Smith, A. Jones" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`blocks.${blockIndex}.papers.${index}.link`} render={({ field }) => (<FormItem><FormLabel>Enlace (DOI/PDF)</FormLabel><FormControl><Input type="url" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`blocks.${blockIndex}.papers.${index}.year`} render={({ field }) => (<FormItem><FormLabel>Año</FormLabel><FormControl><Input placeholder="YYYY" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        </div>
      ))}
       {typeof papersError === 'object' && papersError?.root && (
         <FormMessage>{papersError.root.message}</FormMessage>
       )}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), title: '', authors: '', link: '', year: '' })}>
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Publicación
      </Button>
    </div>
  );
}

// Sub-component for Carousel Block
function CarouselFieldArray({ blockIndex }: { blockIndex: number }) {
  const { control, formState: { errors } } = useFormContext<ProjectFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `blocks.${blockIndex}.images`,
  });

  const blockError = errors.blocks?.[blockIndex];
  const imagesError = blockError && typeof blockError === 'object' && 'images' in blockError ? (blockError as any).images : undefined;
  
  return (
    <div className="space-y-4 pl-4 border-l-2">
      <FormLabel>Imágenes del Carrusel (Mín. 2, Máx. 5)</FormLabel>
      {fields.map((field, index) => (
        <div key={field.id} className="p-3 border rounded-md bg-card/80 shadow-sm relative">
            <div className='flex justify-between items-center mb-2'>
                <Label className="text-xs text-muted-foreground">Imagen {index + 1}</Label>
                {fields.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar imagen</span>
                    </Button>
                )}
            </div>
            <FormField
              control={control}
              name={`blocks.${blockIndex}.images.${index}.imageFile`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={(e) => field.onChange(e.target.files)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
      ))}
      {typeof imagesError === 'object' && imagesError?.root && (
         <FormMessage>{imagesError.root.message}</FormMessage>
       )}
      {fields.length < 5 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ id: crypto.randomUUID(), imageFile: new DataTransfer().files })}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Imagen
        </Button>
      )}
    </div>
  );
}

// Sub-component for Resources Block
function ResourcesFieldArray({ blockIndex }: { blockIndex: number }) {
  const { control, formState: { errors } } = useFormContext<ProjectFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `blocks.${blockIndex}.resources`,
  });
  
  const blockError = errors.blocks?.[blockIndex];
  const resourcesError = blockError && typeof blockError === 'object' && 'resources' in blockError ? (blockError as any).resources : undefined;

  return (
    <div className="space-y-4 pl-4 border-l-2">
      <FormLabel>Recursos</FormLabel>
       {fields.map((field, index) => (
        <div key={field.id} className="p-3 border rounded-md bg-card/80 shadow-sm relative">
            <div className='flex justify-between items-center mb-2'>
                <Label className="text-xs text-muted-foreground">Recurso {index + 1}</Label>
                 {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar recurso</span>
                    </Button>
                )}
            </div>
            <div className="space-y-4">
                <FormField control={control} name={`blocks.${blockIndex}.resources.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Título del Recurso</FormLabel><FormControl><Input placeholder="Ej: Documentación Oficial" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`blocks.${blockIndex}.resources.${index}.link`} render={({ field }) => (<FormItem><FormLabel>Enlace al Recurso</FormLabel><FormControl><Input type="url" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`blocks.${blockIndex}.resources.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea placeholder="Breve descripción del recurso..." {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        </div>
      ))}
       {typeof resourcesError === 'object' && resourcesError?.root && (
         <FormMessage>{resourcesError.root.message}</FormMessage>
       )}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), title: '', description: '', link: '' })}>
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Recurso
      </Button>
    </div>
  );
}

function RelatedCoursesBlockSelector({ blockIndex }: { blockIndex: number }) {
  const { control, formState: { errors } } = useFormContext<ProjectFormValues>();
  const [courses, setCourses] = useState<FirestoreCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        assertDb(db);
        const coursesCol = collection(db, 'courses');
        const q = query(coursesCol, where('estado', '==', 'aprobado'));
        const querySnapshot = await getDocs(q);
        const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreCourse));
        setCourses(coursesData);
      } catch (error) {
        console.error("Error fetching courses for selector:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  if (loading) {
    return <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Cargando cursos...</span></div>;
  }
  
  if(courses.length === 0) {
      return <p className="text-sm text-muted-foreground">No hay cursos aprobados disponibles para seleccionar.</p>
  }

  const blockError = errors.blocks?.[blockIndex];
  const courseIdsError = blockError && typeof blockError === 'object' && 'courseIds' in blockError ? (blockError as any).courseIds : undefined;

  return (
    <FormField
      control={control}
      name={`blocks.${blockIndex}.courseIds`}
      render={({ field }) => (
        <FormItem>
          <div className="mb-4">
            <FormLabel className="text-base">Seleccionar Cursos</FormLabel>
            <FormDescription>
              Elige los cursos que deseas mostrar en esta sección del proyecto.
            </FormDescription>
          </div>
          <ScrollArea className="h-72 w-full rounded-md border p-4">
            <div className="space-y-2">
            {courses.map((course) => (
                <FormField
                key={course.id}
                control={control}
                name={`blocks.${blockIndex}.courseIds`}
                render={({ field }) => {
                    return (
                    <FormItem
                        key={course.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                    >
                        <FormControl>
                        <Checkbox
                            checked={field.value?.includes(course.id)}
                            onCheckedChange={(checked) => {
                            return checked
                                ? field.onChange([...(field.value || []), course.id])
                                : field.onChange(
                                    (field.value || []).filter(
                                    (value) => value !== course.id
                                    )
                                );
                            }}
                        />
                        </FormControl>
                        <FormLabel className="font-normal">
                         {course.titulo}
                        </FormLabel>
                    </FormItem>
                    );
                }}
                />
            ))}
            </div>
          </ScrollArea>
           {courseIdsError && <FormMessage>{courseIdsError.message}</FormMessage>}
        </FormItem>
      )}
    />
  );
}

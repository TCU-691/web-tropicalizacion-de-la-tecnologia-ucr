'use client';

import { useEffect, useRef, useState } from 'react';
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
import { Save, Loader2, ArrowLeft, ClipboardList } from 'lucide-react';
import { addDoc, collection, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TASK_STATUSES, type FirestoreTask } from '@/types/task';
import type { FirestoreProject } from '@/types/project';
import { canManageTasksForProject, normalizeRole } from '@/lib/roles';

function assertDb(db: typeof import('@/lib/firebase').db): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

const taskSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  endDate: z.string().min(1, 'La fecha de finalización es obligatoria.'),
  hours: z.coerce.number().min(1, 'Debe ser al menos 1 hora.'),
  maxSlots: z.coerce.number().min(1, 'Debe ser al menos 1 espacio.'),
  status: z.string().min(1, 'Selecciona un estado.'),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function CrearTareaPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const sourceTaskId = params.sourceTaskId as string | undefined;
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const [projectName, setProjectName] = useState<string>('');
  const [loadingProject, setLoadingProject] = useState(true);
  const [hasProjectTaskAccess, setHasProjectTaskAccess] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      description: '',
      endDate: '',
      hours: 1,
      maxSlots: 1,
      status: 'pendiente',
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/profesor/panel-proyectos');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  useEffect(() => {
    let cancelled = false;

    if (projectId && currentUser && userProfile) {
      const fetchProject = async () => {
        setLoadingProject(true);
        setHasProjectTaskAccess(false);
        try {
          assertDb(db);
          const projectDoc = await getDoc(doc(db, 'projects', projectId));
          if (cancelled) return;
          if (projectDoc.exists()) {
            const projectData = projectDoc.data() as FirestoreProject;
            setProjectName(projectData.name);

            const isLeaderForProject =
              normalizeRole(userProfile?.rol) === 'lider' &&
              (projectData.leaderIds || []).includes(currentUser.uid);
            const canManage = canManageTasksForProject(userProfile?.rol, isLeaderForProject);

            if (!canManage) {
              toast({ title: 'Sin permisos para este proyecto', variant: 'destructive' });
              router.push('/unauthorized?page=panel-proyectos');
              return;
            }

            if (sourceTaskId) {
              const sourceDoc = await getDoc(doc(db, 'tasks', sourceTaskId));
              if (cancelled) return;
              const source = sourceDoc.data() as FirestoreTask | undefined;
              if (!source || source.parentId !== projectId) {
                toast({ title: 'Tarea no encontrada en este proyecto', variant: 'destructive' });
                router.replace('/profesor/panel-proyectos');
                return;
              }

              const endDate = source.endDate?.toDate
                ? source.endDate.toDate()
                : new Date(String(source.endDate ?? ''));

              reset({
                name: source.name,
                description: source.description,
                endDate: Number.isNaN(endDate.getTime()) ? '' : endDate.toISOString().slice(0, 10),
                hours: source.hours,
                maxSlots: source.maxSlots,
                status: source.status,
              }, { keepDefaultValues: true });
            } else {
              reset();
            }

            setHasProjectTaskAccess(true);
          } else {
            toast({ title: 'Proyecto no encontrado', variant: 'destructive' });
            router.push('/profesor/panel-proyectos');
          }
        } catch (error) {
          if (cancelled) return;
          console.error('Error loading task creation form:', error);
          toast({
            title: sourceTaskId ? 'No se pudo cargar la tarea para duplicarla' : 'No se pudo cargar el proyecto',
            variant: 'destructive',
          });
          router.replace('/profesor/panel-proyectos');
        } finally {
          if (!cancelled) setLoadingProject(false);
        }
      };
      fetchProject();
    }
    return () => { cancelled = true; };
  }, [projectId, sourceTaskId, currentUser, userProfile, reset, toast, router]);

  const onSubmit: SubmitHandler<TaskFormValues> = async (data) => {
    if (!currentUser || !hasProjectTaskAccess || submissionInProgress.current) return;
    submissionInProgress.current = true;
    setIsSubmitting(true);

    try {
      assertDb(db);
      
      const taskData = {
        name: data.name,
        description: data.description,
        endDate: Timestamp.fromDate(new Date(data.endDate)),
        hours: data.hours,
        maxSlots: data.maxSlots,
        usedSlots: 0,
        status: data.status,
        parentId: projectId,
      };

      await addDoc(collection(db, 'tasks'), taskData);

      toast({
        title: sourceTaskId ? 'Copia creada' : 'Tarea Creada',
        description: 'La nueva tarea ha sido guardada exitosamente.',
      });
      router.push('/profesor/panel-proyectos');
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error al Crear Tarea',
        description: error instanceof Error ? error.message : 'Ocurrió un error desconocido.',
        variant: 'destructive',
      });
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  if (authLoading || !currentUser || !userProfile || loadingProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!hasProjectTaskAccess) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <Button asChild variant="outline" className="mb-6 group">
        <Link href="/profesor/panel-proyectos">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al Panel de Proyectos
        </Link>
      </Button>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader className="text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-primary mb-3" />
            <CardTitle className="font-headline text-3xl md:text-4xl">
              {sourceTaskId ? 'Duplicar tarea' : 'Crear Nueva Tarea'}
            </CardTitle>
            <CardDescription className="text-lg text-foreground/70">
              Creando tarea para: <span className="font-semibold text-primary">{projectName}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Tarea</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Diseño de interfaz de usuario" {...field} />
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
                        <Textarea placeholder="Describe en detalle la tarea..." {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TASK_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Finalización</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horas Estimadas</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxSlots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Espacios Máximos</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormDescription>Personas que pueden tomar esta tarea.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Form>

            <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              {isSubmitting ? 'Guardando...' : sourceTaskId ? 'Crear copia' : 'Crear Tarea'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

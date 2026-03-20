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
import { Save, Loader2, ArrowLeft, Edit3, AlertTriangle } from 'lucide-react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreTask } from '@/types/task';
import { TASK_STATUSES } from '@/types/task';

function assertDb(db: typeof import('@/lib/firebase').db): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

const taskEditSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  endDate: z.string().min(1, 'La fecha de finalización es obligatoria.'),
  hours: z.coerce.number().min(1, 'Debe ser al menos 1 hora.'),
  maxSlots: z.coerce.number().min(1, 'Debe ser al menos 1 espacio.'),
  usedSlots: z.coerce.number().min(0, 'No puede ser negativo.'),
  status: z.string().min(1, 'Selecciona un estado.'),
});

type TaskEditFormValues = z.infer<typeof taskEditSchema>;

export default function EditarTareaPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const taskId = params.taskId as string;
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [taskNotFound, setTaskNotFound] = useState(false);
  const [projectName, setProjectName] = useState<string>('');

  const form = useForm<TaskEditFormValues>({
    resolver: zodResolver(taskEditSchema),
    defaultValues: {
      name: '',
      description: '',
      endDate: '',
      hours: 1,
      maxSlots: 1,
      usedSlots: 0,
      status: 'pendiente',
    },
  });

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/profesor/panel-proyectos');
      } else if (userProfile && userProfile.rol !== 'profesor' && userProfile.rol !== 'admin' && userProfile.rol !== 'asistente') {
        router.push('/unauthorized?page=panel-proyectos');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  useEffect(() => {
    if (taskId && projectId && currentUser) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          assertDb(db);

          // Fetch project name
          const projectDoc = await getDoc(doc(db, 'projects', projectId));
          if (projectDoc.exists()) {
            setProjectName(projectDoc.data().name);
          }

          // Fetch task
          const taskDoc = await getDoc(doc(db, 'tasks', taskId));
          if (taskDoc.exists()) {
            const taskData = { id: taskDoc.id, ...taskDoc.data() } as FirestoreTask;
            const endDate = taskData.endDate?.toDate ? taskData.endDate.toDate() : new Date(taskData.endDate as any);
            
            form.reset({
              name: taskData.name,
              description: taskData.description,
              endDate: endDate.toISOString().split('T')[0],
              hours: taskData.hours,
              maxSlots: taskData.maxSlots,
              usedSlots: taskData.usedSlots,
              status: taskData.status,
            });
          } else {
            setTaskNotFound(true);
            toast({ title: 'Tarea no encontrada', variant: 'destructive' });
          }
        } catch (error) {
          console.error('Error fetching task:', error);
          toast({ title: 'Error al cargar tarea', variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [taskId, projectId, currentUser, form, toast]);

  const onSubmit: SubmitHandler<TaskEditFormValues> = async (data) => {
    if (!currentUser || !taskId) return;
    setIsSubmitting(true);

    try {
      assertDb(db);

      const taskDataToUpdate = {
        name: data.name,
        description: data.description,
        endDate: Timestamp.fromDate(new Date(data.endDate)),
        hours: data.hours,
        maxSlots: data.maxSlots,
        usedSlots: data.usedSlots,
        status: data.status,
      };

      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, taskDataToUpdate);

      toast({
        title: 'Tarea Actualizada',
        description: 'Los cambios han sido guardados exitosamente.',
      });
      router.push('/profesor/panel-proyectos');
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error al Actualizar Tarea',
        description: error instanceof Error ? error.message : 'Ocurrió un error desconocido.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando editor de tarea...</p>
      </div>
    );
  }

  if (taskNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Tarea No Encontrada</h1>
        <p className="text-muted-foreground mb-6">La tarea que intentas editar no existe o fue eliminada.</p>
        <Button asChild>
          <Link href="/profesor/panel-proyectos">Volver al Panel</Link>
        </Button>
      </div>
    );
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
            <Edit3 className="mx-auto h-12 w-12 text-primary mb-3" />
            <CardTitle className="font-headline text-3xl md:text-4xl">
              Editar Tarea
            </CardTitle>
            <CardDescription className="text-lg text-foreground/70">
              Proyecto: <span className="font-semibold text-primary">{projectName}</span>
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

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horas</FormLabel>
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
                        <FormLabel>Espacios Máx.</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="usedSlots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Espacios Usados</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Form>

            <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

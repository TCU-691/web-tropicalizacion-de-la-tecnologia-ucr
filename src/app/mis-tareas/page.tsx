'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ClipboardList,
  CalendarDays,
  Clock,
  Users,
  Loader2,
  UserMinus,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TaskDetailDialog, type TaskDetailData } from '@/components/task-detail-dialog';
import type { FirestoreTask } from '@/types/task';

interface TaskWithProject {
  task: FirestoreTask;
  projectName: string;
  assignmentId: string; // to allow unassign
}

function assertDb(
  db: typeof import('@/lib/firebase').db
): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

export default function MisTareasPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tasksWithProject, setTasksWithProject] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  // Detail dialog state
  const [selectedTask, setSelectedTask] = useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/mis-tareas');
      } else if (userProfile && userProfile.rol === 'invitado') {
        router.push('/unauthorized?page=mis-tareas');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  // Fetch assigned tasks
  useEffect(() => {
    if (!currentUser || !db || authLoading) return;
    if (userProfile?.rol === 'invitado') return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        assertDb(db);

        // 1. Get all assignments for this user
        const assignmentsSnap = await getDocs(
          query(collection(db, 'assignments'), where('userId', '==', currentUser.uid))
        );

        if (assignmentsSnap.empty) {
          setTasksWithProject([]);
          setLoading(false);
          return;
        }

        const projectNameCache = new Map<string, string>();
        const results: TaskWithProject[] = [];

        for (const assignDoc of assignmentsSnap.docs) {
          const { taskId } = assignDoc.data();
          const assignmentId = assignDoc.id;

          // 2. Fetch task
          const taskSnap = await getDoc(doc(db, 'tasks', taskId));
          if (!taskSnap.exists()) continue;

          const task = { id: taskSnap.id, ...taskSnap.data() } as FirestoreTask;

          // 3. Fetch project name (cached)
          let projectName = 'Proyecto desconocido';
          if (task.parentId) {
            if (projectNameCache.has(task.parentId)) {
              projectName = projectNameCache.get(task.parentId)!;
            } else {
              const projectSnap = await getDoc(doc(db, 'projects', task.parentId));
              if (projectSnap.exists()) {
                projectName = projectSnap.data().name as string;
              }
              projectNameCache.set(task.parentId, projectName);
            }
          }

          results.push({ task, projectName, assignmentId });
        }

        // Sort: en-progreso first, then pendiente, then completada, then cancelada
        const statusOrder: Record<string, number> = {
          'en-progreso': 0,
          pendiente: 1,
          completada: 2,
          cancelada: 3,
        };
        results.sort(
          (a, b) =>
            (statusOrder[a.task.status] ?? 99) - (statusOrder[b.task.status] ?? 99)
        );

        setTasksWithProject(results);
      } catch (error) {
        console.error('Error fetching user tasks:', error);
        toast({
          title: 'Error al cargar tareas',
          description: 'No se pudieron obtener tus tareas asignadas.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser, userProfile, authLoading, toast]);

  // Unassign from task
  const handleUnassign = async (item: TaskWithProject) => {
    if (!currentUser || !db) return;
    setUnassigningId(item.task.id);
    try {
      assertDb(db);
      await deleteDoc(doc(db, 'assignments', item.assignmentId));
      await updateDoc(doc(db, 'tasks', item.task.id), {
        usedSlots: increment(-1),
      });

      setTasksWithProject((prev) =>
        prev.filter((t) => t.task.id !== item.task.id)
      );

      toast({
        title: 'Te has retirado de la tarea',
        description: `Ya no estás asignado a "${item.task.name}".`,
      });
    } catch (error) {
      console.error('Error unassigning:', error);
      toast({
        title: 'Error',
        description: 'No se pudo retirar la asignación.',
        variant: 'destructive',
      });
    } finally {
      setUnassigningId(null);
    }
  };

  const openTaskDetail = (item: TaskWithProject) => {
    const endDate = item.task.endDate?.toDate
      ? item.task.endDate.toDate()
      : new Date(item.task.endDate as unknown as string);
    setSelectedTask({
      id: item.task.id,
      name: item.task.name,
      description: item.task.description,
      endDate: endDate.toISOString(),
      hours: item.task.hours,
      maxSlots: item.task.maxSlots,
      status: item.task.status,
      usedSlots: item.task.usedSlots,
      parentId: item.task.parentId,
    });
    setDetailOpen(true);
  };

  // Loading / auth states
  if (authLoading || !currentUser || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando tus tareas...</p>
      </div>
    );
  }

  // Stats
  const pendientes = tasksWithProject.filter((t) => t.task.status === 'pendiente').length;
  const enProgreso = tasksWithProject.filter((t) => t.task.status === 'en-progreso').length;
  const completadas = tasksWithProject.filter((t) => t.task.status === 'completada').length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <Card className="shadow-lg">
        <CardHeader className="border-b pb-6">
          <div className="flex items-center mb-2">
            <ClipboardList className="h-8 w-8 text-primary mr-3" />
            <CardTitle className="font-headline text-3xl">Mis Tareas</CardTitle>
          </div>
          <CardDescription className="text-md text-foreground/70">
            Todas las tareas a las que estás asignado en los diferentes proyectos.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[20rem]">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Cargando tareas...</p>
            </div>
          ) : tasksWithProject.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4" />
              <p className="font-semibold text-lg">No tienes tareas asignadas</p>
              <p className="mt-1">
                Explora los proyectos y apúntate a las tareas que te interesen.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <a href="/proyectos">Ver Proyectos</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <ClipboardList className="mr-1.5 h-4 w-4" />
                  {tasksWithProject.length} tarea{tasksWithProject.length !== 1 ? 's' : ''}
                </Badge>
                {pendientes > 0 && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    <AlertCircle className="mr-1.5 h-4 w-4" />
                    {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                  </Badge>
                )}
                {enProgreso > 0 && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Timer className="mr-1.5 h-4 w-4" />
                    {enProgreso} en progreso
                  </Badge>
                )}
                {completadas > 0 && (
                  <Badge variant="default" className="text-sm px-3 py-1">
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {completadas} completada{completadas !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Task cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasksWithProject.map((item) => {
                  const endDate = item.task.endDate?.toDate
                    ? item.task.endDate.toDate()
                    : new Date(item.task.endDate as unknown as string);
                  const isOverdue =
                    endDate < new Date() && item.task.status !== 'completada';
                  const slotsPercentage =
                    item.task.maxSlots > 0
                      ? (item.task.usedSlots / item.task.maxSlots) * 100
                      : 0;
                  const isUnassigning = unassigningId === item.task.id;

                  return (
                    <Card
                      key={item.task.id}
                      className={`transition-shadow hover:shadow-md cursor-pointer ${
                        isOverdue ? 'border-destructive/50' : ''
                      }`}
                      onClick={() => openTaskDetail(item)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg truncate">
                              {item.task.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <FolderKanban className="h-3 w-3" />
                              {item.projectName}
                            </p>
                          </div>
                          <Badge
                            variant={
                              item.task.status === 'completada'
                                ? 'default'
                                : item.task.status === 'en-progreso'
                                ? 'secondary'
                                : item.task.status === 'cancelada'
                                ? 'destructive'
                                : 'outline'
                            }
                            className="shrink-0"
                          >
                            {item.task.status}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2 mt-1">
                          {item.task.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span
                            className={`flex items-center gap-1 ${
                              isOverdue ? 'text-destructive font-medium' : ''
                            }`}
                          >
                            <CalendarDays className="h-4 w-4" />
                            {endDate.toLocaleDateString('es-CR')}
                            {isOverdue && ' (Vencida)'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {item.task.hours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {item.task.usedSlots}/{item.task.maxSlots}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Espacios</span>
                            <span>
                              {item.task.usedSlots} de {item.task.maxSlots}
                            </span>
                          </div>
                          <Progress value={slotsPercentage} className="h-2" />
                        </div>

                        {item.task.status !== 'completada' &&
                          item.task.status !== 'cancelada' && (
                            <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleUnassign(item)}
                                disabled={isUnassigning}
                              >
                                {isUnassigning ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <UserMinus className="mr-2 h-4 w-4" />
                                )}
                                Retirarme de esta tarea
                              </Button>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

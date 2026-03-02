'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  CalendarDays,
  Clock,
  Users,
  Loader2,
  ClipboardList,
  FolderKanban,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { UserProfile } from '@/types/user';
import type { FirestoreTask } from '@/types/task';

interface TaskWithProject extends FirestoreTask {
  projectName?: string;
}

interface UserTasksDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function assertDb(
  db: typeof import('@/lib/firebase').db
): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserTasksDialog({ user, open, onOpenChange }: UserTasksDialogProps) {
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !open || !db) {
      setTasks([]);
      return;
    }

    const fetchUserTasks = async () => {
      setLoading(true);
      try {
        assertDb(db);

        // 1. Get all assignments for this user
        const assignmentsSnap = await getDocs(
          query(collection(db, 'assignments'), where('userId', '==', user.uid))
        );

        const taskIds = assignmentsSnap.docs.map((d) => d.data().taskId as string);

        if (taskIds.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        // 2. Fetch each task
        const tasksData: TaskWithProject[] = [];
        // Cache project names to avoid duplicate fetches
        const projectNameCache = new Map<string, string>();

        for (const taskId of taskIds) {
          const taskSnap = await getDoc(doc(db, 'tasks', taskId));
          if (!taskSnap.exists()) continue;

          const taskData = { id: taskSnap.id, ...taskSnap.data() } as TaskWithProject;

          // 3. Get project name
          if (taskData.parentId) {
            if (projectNameCache.has(taskData.parentId)) {
              taskData.projectName = projectNameCache.get(taskData.parentId);
            } else {
              const projectSnap = await getDoc(doc(db, 'projects', taskData.parentId));
              const name = projectSnap.exists()
                ? (projectSnap.data().name as string)
                : 'Proyecto desconocido';
              projectNameCache.set(taskData.parentId, name);
              taskData.projectName = name;
            }
          }

          tasksData.push(taskData);
        }

        setTasks(tasksData);
      } catch (error) {
        console.error('Error fetching user tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTasks();
  }, [user, open]);

  if (!user) return null;

  const pendientes = tasks.filter((t) => t.status === 'pendiente').length;
  const enProgreso = tasks.filter((t) => t.status === 'en-progreso').length;
  const completadas = tasks.filter((t) => t.status === 'completada').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(user.displayName || user.email || '??')}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">
                {user.displayName || 'Sin nombre'}
              </DialogTitle>
              <DialogDescription asChild>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </DialogDescription>
            </div>
            <Badge variant="outline" className="ml-auto capitalize">
              {user.rol}
            </Badge>
          </div>
        </DialogHeader>

        <Separator />

        {/* Summary chips */}
        {!loading && tasks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              <ClipboardList className="mr-1 h-3 w-3" />
              {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} asignada{tasks.length !== 1 ? 's' : ''}
            </Badge>
            {pendientes > 0 && (
              <Badge variant="outline" className="text-xs">
                {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
              </Badge>
            )}
            {enProgreso > 0 && (
              <Badge variant="secondary" className="text-xs">
                {enProgreso} en progreso
              </Badge>
            )}
            {completadas > 0 && (
              <Badge variant="default" className="text-xs">
                {completadas} completada{completadas !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}

        {/* Task list */}
        <ScrollArea className="flex-1 max-h-[50vh] pr-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Cargando tareas asignadas...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">Sin tareas asignadas</p>
              <p className="text-xs mt-1">Este usuario no tiene tareas actualmente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const endDate = task.endDate?.toDate
                  ? task.endDate.toDate()
                  : new Date(task.endDate as unknown as string);
                const isOverdue = endDate < new Date() && task.status !== 'completada';
                const slotsPercentage =
                  task.maxSlots > 0 ? (task.usedSlots / task.maxSlots) * 100 : 0;

                return (
                  <Card
                    key={task.id}
                    className={`transition-shadow hover:shadow-md ${
                      isOverdue ? 'border-destructive/50' : ''
                    }`}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{task.name}</p>
                          {task.projectName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <FolderKanban className="h-3 w-3" />
                              {task.projectName}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            task.status === 'completada'
                              ? 'default'
                              : task.status === 'en-progreso'
                              ? 'secondary'
                              : task.status === 'cancelada'
                              ? 'destructive'
                              : 'outline'
                          }
                          className="text-xs shrink-0"
                        >
                          {task.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span
                          className={`flex items-center gap-1 ${
                            isOverdue ? 'text-destructive font-medium' : ''
                          }`}
                        >
                          <CalendarDays className="h-3 w-3" />
                          {endDate.toLocaleDateString('es-CR')}
                          {isOverdue && ' (Vencida)'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.hours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {task.usedSlots}/{task.maxSlots}
                        </span>
                      </div>

                      <Progress value={slotsPercentage} className="h-1.5" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

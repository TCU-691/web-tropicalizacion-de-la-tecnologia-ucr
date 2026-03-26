'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, CalendarDays, Clock, Users, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TaskDetailDialog, type TaskDetailData } from '@/components/task-detail-dialog';
import { canParticipateInTasks, canModerateTaskEvidence, normalizeRole } from '@/lib/roles';

export interface SerializedTask {
  id: string;
  name: string;
  description: string;
  endDate: string; // ISO string
  hours: number;
  maxSlots: number;
  status: string;
  usedSlots: number;
  parentId: string;
}

export function ProjectTasksSection({
  tasks: initialTasks,
  projectLeaderIds = [],
}: {
  tasks: SerializedTask[];
  projectLeaderIds?: string[];
}) {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<SerializedTask[]>(initialTasks);
  const [assignedTaskIds, setAssignedTaskIds] = useState<Set<string>>(new Set());
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({}); // taskId -> assignmentDocId
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // taskId currently being acted on
  const [selectedTask, setSelectedTask] = useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch user's assignments when user loads
  useEffect(() => {
    async function fetchAssignments() {
      if (!currentUser || !db) {
        setLoadingAssignments(false);
        return;
      }
      try {
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('userId', '==', currentUser.uid)
        );
        const snap = await getDocs(assignmentsQuery);
        const ids = new Set<string>();
        const map: Record<string, string> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          ids.add(data.taskId);
          map[data.taskId] = d.id;
        });
        setAssignedTaskIds(ids);
        setAssignmentMap(map);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoadingAssignments(false);
      }
    }
    if (!authLoading) {
      fetchAssignments();
    }
  }, [currentUser, authLoading]);

  const handleAssign = async (taskId: string) => {
    if (!currentUser || !db) return;
    setActionLoading(taskId);
    try {
      // Create assignment
      const assignmentRef = await addDoc(collection(db, 'assignments'), {
        taskId,
        userId: currentUser.uid,
      });

      // Increment usedSlots on the task
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { usedSlots: increment(1) });

      // Update local state
      setAssignedTaskIds(prev => new Set(prev).add(taskId));
      setAssignmentMap(prev => ({ ...prev, [taskId]: assignmentRef.id }));
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, usedSlots: t.usedSlots + 1 } : t))
      );

      toast({
        title: 'Asignación exitosa',
        description: 'Te has apuntado a esta tarea.',
      });
    } catch (error) {
      console.error('Error assigning:', error);
      toast({
        title: 'Error',
        description: 'No se pudo realizar la asignación.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnassign = async (taskId: string) => {
    if (!currentUser || !db) return;
    const assignmentDocId = assignmentMap[taskId];
    if (!assignmentDocId) return;
    setActionLoading(taskId);
    try {
      // Delete assignment
      await deleteDoc(doc(db, 'assignments', assignmentDocId));

      // Decrement usedSlots on the task
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { usedSlots: increment(-1) });

      // Update local state
      setAssignedTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setAssignmentMap(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, usedSlots: Math.max(0, t.usedSlots - 1) } : t))
      );

      toast({
        title: 'Desasignación exitosa',
        description: 'Te has retirado de esta tarea.',
      });
    } catch (error) {
      console.error('Error unassigning:', error);
      toast({
        title: 'Error',
        description: 'No se pudo retirar la asignación.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return null;
  }
  if (!currentUser || !userProfile || !canParticipateInTasks(userProfile.rol)) {
    return null;
  }

  if (tasks.length === 0) {
    return null;
  }

  const isLeaderForProject =
    normalizeRole(userProfile.rol) === 'lider' &&
    projectLeaderIds.includes(currentUser.uid);
  const canAssign = canParticipateInTasks(userProfile.rol);
  const canModerateEvidence = canModerateTaskEvidence(userProfile.rol, isLeaderForProject);

  return (
    <div>
      <Separator className="my-8" />
      <section className="space-y-4">
        <h3 className="font-headline text-2xl font-semibold text-primary flex items-center">
          <ClipboardList className="mr-3 h-6 w-6" />
          Tareas del Proyecto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(task => {
            const slotsPercentage = task.maxSlots > 0 ? (task.usedSlots / task.maxSlots) * 100 : 0;
            const endDate = new Date(task.endDate);
            const isOverdue = endDate < new Date() && task.status !== 'completada';
            const isAssigned = assignedTaskIds.has(task.id);
            const isFull = task.usedSlots >= task.maxSlots;
            const isActioning = actionLoading === task.id;

            return (
              <Card
                key={task.id}
                className={`transition-shadow hover:shadow-md cursor-pointer ${isOverdue ? 'border-destructive/50' : ''}`}
                onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{task.name}</CardTitle>
                    <Badge
                      variant={
                        task.status === 'completada' ? 'default' :
                        task.status === 'en-progreso' ? 'secondary' :
                        task.status === 'cancelada' ? 'destructive' : 'outline'
                      }
                    >
                      {task.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{task.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {endDate.toLocaleDateString('es-CR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {task.hours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {task.usedSlots}/{task.maxSlots}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Espacios</span>
                      <span>{task.usedSlots} de {task.maxSlots}</span>
                    </div>
                    <Progress value={slotsPercentage} className="h-2" />
                  </div>

                  {canAssign && task.status !== 'completada' && task.status !== 'cancelada' && (
                    <div className="pt-2">
                      {isAssigned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => { e.stopPropagation(); handleUnassign(task.id); }}
                          disabled={isActioning}
                        >
                          {isActioning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="mr-2 h-4 w-4" />
                          )}
                          Retirarme de esta tarea
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={(e) => { e.stopPropagation(); handleAssign(task.id); }}
                          disabled={isActioning || isFull}
                        >
                          {isActioning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                          )}
                          {isFull ? 'Sin espacios disponibles' : 'Apuntarme a esta tarea'}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <TaskDetailDialog
          task={selectedTask}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          canModerateTask={canModerateEvidence}
        />
      </section>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert, FolderKanban, PlusCircle, Search, ClipboardList, Clock, Users, CalendarDays, Edit, Trash2 } from 'lucide-react';
import { ProjectAdminCard } from '@/components/project-admin-card';
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreProject } from '@/types/project';
import type { FirestoreTask } from '@/types/task';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { deleteDocumentWithImages } from '@/lib/delete-utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { TaskDetailDialog, type TaskDetailData } from '@/components/task-detail-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


// --- Firestore null check helper ---
function assertDb(db: typeof import('@/lib/firebase').db): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

function TaskAdminCard({ task, projectId, onDelete, onClickDetail }: { task: FirestoreTask; projectId: string; onDelete: (id: string) => void; onClickDetail: (task: FirestoreTask) => void }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const endDate = task.endDate?.toDate ? task.endDate.toDate() : new Date(task.endDate as any);
  const slotsPercentage = task.maxSlots > 0 ? (task.usedSlots / task.maxSlots) * 100 : 0;

  return (
    <Card className="bg-muted/30 border-dashed cursor-pointer hover:shadow-md transition-shadow" onClick={() => onClickDetail(task)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">{task.name}</h4>
          <Badge variant={
            task.status === 'completada' ? 'default' :
            task.status === 'en-progreso' ? 'secondary' :
            task.status === 'cancelada' ? 'destructive' : 'outline'
          } className="text-xs">
            {task.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {endDate.toLocaleDateString('es-CR')}
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
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/profesor/panel-proyectos/${projectId}/tareas/editar/${task.id}`}>
              <Edit className="mr-1 h-3 w-3" />
              <span className="text-xs">Editar</span>
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="flex-1">
                <Trash2 className="mr-1 h-3 w-3" />
                <span className="text-xs">Eliminar</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará la tarea <strong>&quot;{task.name}&quot;</strong> de forma permanente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { setIsDeleting(true); onDelete(task.id); }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? <Loader2 className="animate-spin" /> : 'Sí, eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PanelProyectosPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = useState<FirestoreProject[]>([]);
  const [tasksMap, setTasksMap] = useState<Map<string, FirestoreTask[]>>(new Map());
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleTaskClick = (task: FirestoreTask) => {
    const endDate = task.endDate?.toDate ? task.endDate.toDate() : new Date(task.endDate as any);
    setSelectedTask({
      id: task.id,
      name: task.name,
      description: task.description,
      endDate: endDate.toISOString(),
      hours: task.hours,
      maxSlots: task.maxSlots,
      status: task.status,
      usedSlots: task.usedSlots,
      parentId: task.parentId,
    });
    setDetailOpen(true);
  };

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/profesor/panel-proyectos');
      } else if (userProfile && userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
        router.push('/unauthorized?page=panel-proyectos');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  useEffect(() => {
    if (currentUser && (userProfile?.rol === 'profesor' || userProfile?.rol === 'admin')) {
      assertDb(db);
      const projectsCollection = collection(db, 'projects');
      const q = query(projectsCollection, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FirestoreProject));
        setProjects(projectsData);
        setLoadingProjects(false);
      }, (error) => {
        console.error("Error fetching projects: ", error);
        toast({ title: 'Error al cargar proyectos', description: 'No se pudieron obtener los proyectos.', variant: 'destructive' });
        setLoadingProjects(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser, userProfile, toast]);

  // Listen to all tasks
  useEffect(() => {
    if (currentUser && (userProfile?.rol === 'profesor' || userProfile?.rol === 'admin')) {
      assertDb(db);
      const tasksCollection = collection(db, 'tasks');
      const q = query(tasksCollection, orderBy('endDate', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMap = new Map<string, FirestoreTask[]>();
        snapshot.docs.forEach(d => {
          const task = { id: d.id, ...d.data() } as FirestoreTask;
          const existing = newMap.get(task.parentId) || [];
          existing.push(task);
          newMap.set(task.parentId, existing);
        });
        setTasksMap(newMap);
        setLoadingTasks(false);
      }, (error) => {
        console.error("Error fetching tasks: ", error);
        setLoadingTasks(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser, userProfile]);

  const handleDeleteProject = async (projectId: string) => {
    try {
      assertDb(db);
      const result = await deleteDocumentWithImages('projects', projectId);
      
      // Also delete all tasks for this project
      const projectTasks = tasksMap.get(projectId) || [];
      await Promise.all(projectTasks.map(t => {
        assertDb(db);
        return deleteDoc(doc(db, 'tasks', t.id));
      }));

      if (result.success) {
        toast({
          title: "Proyecto Eliminado",
          description: `El proyecto, sus tareas y sus imágenes asociadas han sido eliminados.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error deleting project: ", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el proyecto completamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      assertDb(db);
      const docRef = doc(db, 'tasks', taskId);
      await deleteDoc(docRef);
      toast({ title: "Tarea Eliminada", description: "La tarea ha sido eliminada exitosamente." });
    } catch (error) {
      console.error("Error deleting task: ", error);
      toast({ title: "Error al eliminar tarea", variant: "destructive" });
    }
  };

  if (authLoading || !currentUser || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando panel de proyectos...</p>
      </div>
    );
  }

  if (userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
    return (
     <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
       <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
       <h1 className="font-headline text-3xl text-destructive mb-3">Acceso Denegado</h1>
       <p className="text-lg text-muted-foreground mb-8 max-w-md">
         No tienes los permisos necesarios para administrar proyectos.
       </p>
       <Button asChild>
         <Link href="/">Volver al Inicio</Link>
       </Button>
     </div>
   );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6">
          <div className='mb-4 md:mb-0'>
            <div className="flex items-center mb-2">
              <FolderKanban className="h-8 w-8 text-primary mr-3" />
              <CardTitle className="font-headline text-3xl">Administración de Proyectos</CardTitle>
            </div>
            <CardDescription className="text-md text-foreground/70">
              Gestiona los proyectos y sus tareas asociadas.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/profesor/panel-proyectos/crear">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear nuevo proyecto
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingProjects || loadingTasks ? (
             <div className="flex flex-col items-center justify-center min-h-[20rem]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Cargando proyectos...</p>
            </div>
          ) : projects.length > 0 ? (
            <div className="space-y-6">
              {projects.map(project => {
                const projectTasks = tasksMap.get(project.id) || [];
                return (
                <Card key={project.id} className="bg-card">
                   <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <ProjectAdminCard 
                            project={project}
                            onDelete={() => handleDeleteProject(project.id)}
                          />
                        </div>
                        <div className="md:col-span-1 space-y-3">
                          <Button asChild variant="default" size="sm" className="w-full">
                            <Link href={`/profesor/panel-proyectos/${project.id}/tareas/crear`}>
                              <ClipboardList className="mr-2 h-4 w-4" />Crear tarea
                            </Link>
                          </Button>
                          {projectTasks.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="tasks">
                                <AccordionTrigger>
                                   Tareas ({projectTasks.length})
                                </AccordionTrigger>
                                <AccordionContent className="space-y-3 pt-3">
                                  {projectTasks.map(task => (
                                      <TaskAdminCard
                                        key={task.id}
                                        task={task}
                                        projectId={project.id}
                                        onDelete={handleDeleteTask}
                                        onClickDetail={handleTaskClick}
                                      />
                                  ))}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 border-2 border-dashed rounded-md">
                               <p className="text-sm">Este proyecto no tiene tareas.</p>
                               <p className="text-xs mt-1">Usa el botón "Crear tarea" para añadir una.</p>
                            </div>
                          )}
                        </div>
                   </div>
                </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4" />
              <p className="font-semibold text-lg">Aún no hay proyectos registrados.</p>
              <p>Haz clic en ‘Crear nuevo proyecto’ para comenzar.</p>
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

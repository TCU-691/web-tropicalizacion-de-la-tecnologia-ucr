
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert, FolderKanban, PlusCircle, Search } from 'lucide-react';
import { ProjectAdminCard } from '@/components/project-admin-card';
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreProject, HierarchicalProject } from '@/types/project';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { deleteDocumentWithImages } from '@/lib/delete-utils';


// --- Firestore null check helper ---
function assertDb(db: typeof import('@/lib/firebase').db): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

export default function PanelProyectosPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = useState<FirestoreProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

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

  const hierarchicalProjects = useMemo((): HierarchicalProject[] => {
    const projectMap = new Map<string, HierarchicalProject>();
    const subProjects: FirestoreProject[] = [];

    // First pass: create map and separate main projects from sub-projects
    projects.forEach(project => {
      if (!project.parentId) {
        projectMap.set(project.id, { ...project, subProjects: [] });
      } else {
        subProjects.push(project);
      }
    });

    // Second pass: attach sub-projects to their parents
    subProjects.forEach(subProject => {
      if (subProject.parentId && projectMap.has(subProject.parentId)) {
        projectMap.get(subProject.parentId)?.subProjects.push(subProject);
      }
    });

    return Array.from(projectMap.values());
  }, [projects]);


  const handleDeleteProject = async (projectId: string) => {
    try {
      const result = await deleteDocumentWithImages('projects', projectId);
      
      if (result.success) {
        toast({
          title: "Proyecto Eliminado",
          description: `El proyecto y sus imágenes asociadas han sido eliminados. Imágenes eliminadas: ${result.imageDeleteResult?.success || 0}`,
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
              Gestiona los proyectos y subproyectos que se muestran en la sección pública.
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
          {loadingProjects ? (
             <div className="flex flex-col items-center justify-center min-h-[20rem]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Cargando proyectos...</p>
            </div>
          ) : hierarchicalProjects.length > 0 ? (
            <div className="space-y-6">
              {hierarchicalProjects.map(project => (
                <Card key={project.id} className="bg-card">
                   <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <ProjectAdminCard 
                            project={project}
                            onDelete={() => handleDeleteProject(project.id)}
                          />
                        </div>
                        <div className="md:col-span-1">
                          {project.subProjects.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="subprojects">
                                <AccordionTrigger>
                                   Subproyectos ({project.subProjects.length})
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                  {project.subProjects.map(sub => (
                                      <ProjectAdminCard 
                                        key={sub.id} 
                                        project={sub}
                                        onDelete={() => handleDeleteProject(sub.id)}
                                        isSubProject={true}
                                      />
                                  ))}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 border-2 border-dashed rounded-md">
                               <p className="text-sm">Este proyecto no tiene subproyectos.</p>
                               <p className="text-xs mt-1">Usa el botón "Crear subproyecto" para añadir uno.</p>
                            </div>
                          )}
                        </div>
                   </div>
                </Card>
              ))}
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
    </div>
  );
}

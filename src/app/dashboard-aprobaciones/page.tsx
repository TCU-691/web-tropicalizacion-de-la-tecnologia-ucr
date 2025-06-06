
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore'; // Removed 'where' as it's not used here after filter logic moved
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import type { FirestoreCourse } from '@/types/course';
import type { UserProfile } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, Loader2, ShieldAlert, AlertTriangle, Eye, CheckCircle, XCircle, Trash2, Edit3, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Image as ImageKitImage } from '@imagekit/next'; // Using ImageKit's Image component
import { getYoutubeEmbedUrl, countTotalLessons } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface AuthorCache {
  [uid: string]: string; // displayName
}

type CourseStatusFilter = 'todos' | 'pendiente' | 'aprobado' | 'rechazado';


export default function DashboardAprobacionesPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allCourses, setAllCourses] = useState<FirestoreCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<FirestoreCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [authors, setAuthors] = useState<AuthorCache>({});
  
  const [selectedCourse, setSelectedCourse] = useState<FirestoreCourse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>('pendiente');


  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/dashboard-aprobaciones');
      } else if (userProfile && userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
        router.push('/unauthorized?page=dashboard-aprobaciones');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  const fetchAuthorName = useCallback(async (uid: string) => {
    if (authors[uid]) return authors[uid];
    if (!db) {
      console.error("DB not initialized for fetchAuthorName");
      return 'Autor Desconocido';
    }
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const authorProfile = userDocSnap.data() as UserProfile;
        const displayName = authorProfile.displayName || 'Autor Desconocido';
        setAuthors(prev => ({ ...prev, [uid]: displayName }));
        return displayName;
      }
    } catch (error) {
      console.error("Error fetching author:", error);
    }
    setAuthors(prev => ({ ...prev, [uid]: 'Autor Desconocido' }));
    return 'Autor Desconocido';
  }, [authors]); // Removed db from dependencies as it's module-scoped

  useEffect(() => {
    if (currentUser && (userProfile?.rol === 'profesor' || userProfile?.rol === 'admin') && db) {
      const q = query(collection(db, 'courses'), orderBy('fechaCreacion', 'desc'));
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        setLoadingCourses(true);
        const coursesDataPromises = querySnapshot.docs.map(async (docVal) => {
          const courseData = { id: docVal.id, ...docVal.data() } as FirestoreCourse;
          // Ensure dates are strings
          courseData.fechaCreacion = courseData.fechaCreacion?.toDate ? courseData.fechaCreacion.toDate().toISOString() : String(courseData.fechaCreacion || '');
          courseData.fechaActualizacion = courseData.fechaActualizacion?.toDate ? courseData.fechaActualizacion.toDate().toISOString() : undefined;
          
          if (!authors[courseData.creadoPor]) {
            await fetchAuthorName(courseData.creadoPor);
          }
          return courseData;
        });
        
        const coursesData = await Promise.all(coursesDataPromises);
        setAllCourses(coursesData);
        setLoadingCourses(false);
      }, (error) => {
        console.error("Error fetching courses: ", error);
        toast({ title: 'Error al cargar cursos', description: 'No se pudieron obtener los cursos.', variant: 'destructive' });
        setLoadingCourses(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser, userProfile, fetchAuthorName, authors, toast]);

  useEffect(() => {
    if (statusFilter === 'todos') {
      setFilteredCourses(allCourses);
    } else {
      setFilteredCourses(allCourses.filter(course => course.estado === statusFilter));
    }
  }, [allCourses, statusFilter]);


  const handleViewCourse = (course: FirestoreCourse) => {
    setSelectedCourse({
      ...course,
      authorDisplayName: authors[course.creadoPor] || 'Cargando autor...'
    });
    setIsModalOpen(true);
  };

  const updateCourseStatus = async (courseId: string, newStatus: 'aprobado' | 'rechazado') => {
    if (!db) return;
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, { estado: newStatus, fechaActualizacion: Timestamp.now() });
      toast({ title: 'Curso Actualizado', description: `El curso ha sido ${newStatus}.` });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error updating course status: ", error);
      toast({ title: 'Error', description: 'No se pudo actualizar el estado del curso.', variant: 'destructive' });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!db) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      toast({ title: 'Curso Eliminado', description: 'El curso ha sido eliminado permanentemente.' });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting course: ", error);
      toast({ title: 'Error', description: 'No se pudo eliminar el curso.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const getStatusBadgeVariant = (status: FirestoreCourse['estado']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'aprobado': return 'default'; 
      case 'pendiente': return 'secondary'; 
      case 'rechazado': return 'destructive'; 
      default: return 'outline';
    }
  };
  
  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando panel de aprobaciones...</p>
      </div>
    );
  }
  
  if (userProfile && userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
        <h1 className="font-headline text-3xl text-destructive mb-3">Acceso Denegado</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          No tienes los permisos necesarios para ver el panel de aprobaciones.
        </p>
        <Button asChild>
          <Link href="/">Volver al Inicio</Link>
        </Button>
      </div>
    );
  }

  const pendingCount = allCourses.filter(c => c.estado === 'pendiente').length;
  const approvedCount = allCourses.filter(c => c.estado === 'aprobado').length;
  const rejectedCount = allCourses.filter(c => c.estado === 'rechazado').length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center border-b pb-6">
          <LayoutDashboard className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="font-headline text-3xl md:text-4xl">Panel de Aprobaciones</CardTitle>
          <CardDescription className="text-lg text-foreground/70">
            Gestiona los cursos enviados por la comunidad. Pendientes: {pendingCount}, Aprobados: {approvedCount}, Rechazados: {rejectedCount}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
            <div className="flex justify-end">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                        <Filter className="mr-2 h-4 w-4" />
                        Filtrar por estado: <span className="capitalize ml-1 font-semibold">{statusFilter}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as CourseStatusFilter)}>
                        <DropdownMenuRadioItem value="pendiente">Pendiente ({pendingCount})</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="aprobado">Aprobado ({approvedCount})</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="rechazado">Rechazado ({rejectedCount})</DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioItem value="todos">Todos ({allCourses.length})</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

          {loadingCourses ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <p className="text-muted-foreground">Cargando cursos...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <Alert variant="default" className="bg-muted/30">
              <CheckCircle className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold">No hay cursos</AlertTitle>
              <AlertDescription>
                No hay cursos que coincidan con el filtro "{statusFilter}".
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título del Curso</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead className="text-center">Enviado</TableHead>
                    <TableHead className="text-center">Lecciones</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={course.titulo}>{course.titulo}</TableCell>
                      <TableCell>{authors[course.creadoPor] || 'Cargando...'}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {course.fechaCreacion ? format(new Date(course.fechaCreacion), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">{countTotalLessons(course.modulos || [])}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(course.estado)} className="capitalize">
                          {course.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewCourse(course)}>
                          <Eye className="mr-1.5 h-4 w-4" /> Revisar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCourse && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">{selectedCourse.titulo}</DialogTitle>
              <DialogDescription>
                Revisa los detalles del curso. Enviado por: {selectedCourse.authorDisplayName} el {selectedCourse.fechaCreacion ? format(new Date(selectedCourse.fechaCreacion), 'dd MMMM yyyy, HH:mm', { locale: es }) : 'N/A'}.
                 Estado actual: <Badge variant={getStatusBadgeVariant(selectedCourse.estado)} className="capitalize ml-1">{selectedCourse.estado}</Badge>
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto space-y-6 pr-2 py-2 -mr-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1 relative aspect-video rounded-lg overflow-hidden shadow-md">
                  <ImageKitImage src={selectedCourse.imagenUrl || "https://placehold.co/600x400.png"} alt={`Portada de ${selectedCourse.titulo}`} layout="fill" objectFit="cover" data-ai-hint="course cover" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <p><strong className="font-medium">Categoría:</strong> <Badge variant="outline">{selectedCourse.categoria}</Badge></p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedCourse.descripcion}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-headline text-xl font-semibold mb-3 mt-4 border-b pb-2">Temario del Curso</h3>
                {selectedCourse.modulos && selectedCourse.modulos.length > 0 ? (
                  <Accordion type="multiple" className="w-full">
                    {selectedCourse.modulos.map((modulo, moduloIndex) => (
                      <AccordionItem value={`modulo-${modulo.id || moduloIndex}`} key={modulo.id || moduloIndex}>
                        <AccordionTrigger className="text-lg font-medium">{modulo.tituloModulo}</AccordionTrigger>
                        <AccordionContent className="pl-4 space-y-4">
                          {modulo.lecciones && modulo.lecciones.length > 0 ? (
                            modulo.lecciones.map((leccion, leccionIndex) => {
                              const embedUrl = getYoutubeEmbedUrl(leccion.youtubeUrl);
                              return (
                                <div key={leccion.id || leccionIndex} className="py-3 border-b last:border-b-0">
                                  <h4 className="font-semibold text-md mb-1.5">{leccion.tituloLeccion}</h4>
                                  {embedUrl && (
                                    <div className="aspect-video mb-2 rounded overflow-hidden shadow">
                                      <iframe
                                        width="100%"
                                        height="100%"
                                        src={embedUrl}
                                        title={leccion.tituloLeccion}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                      ></iframe>
                                    </div>
                                  )}
                                  {!embedUrl && leccion.youtubeUrl && (
                                    <Alert variant="destructive" className="mb-2">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertDescription>URL de YouTube inválida o no convertible: {leccion.youtubeUrl}</AlertDescription>
                                    </Alert>
                                  )}
                                  {leccion.descripcionLeccion && (
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{leccion.descripcionLeccion}</p>
                                  )}
                                </div>
                              );
                            })
                          ) : <p className="text-sm text-muted-foreground">No hay lecciones en este módulo.</p>}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : <p className="text-muted-foreground">Este curso no tiene módulos o lecciones definidas.</p>}
              </div>
            </div>
            <DialogFooter className="pt-4 border-t sm:justify-between">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="default" 
                  onClick={() => updateCourseStatus(selectedCourse.id, 'aprobado')} 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={selectedCourse.estado === 'aprobado'}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Aprobar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => updateCourseStatus(selectedCourse.id, 'rechazado')}
                  disabled={selectedCourse.estado === 'rechazado'}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Rechazar
                </Button>
                 <Button variant="outline" asChild>
                  <Link href={`/dashboard-aprobaciones/edit-curso/${selectedCourse.id}`}>
                    <Edit3 className="mr-2 h-4 w-4" /> Editar
                  </Link>
                </Button>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente el curso
                      y todos sus datos de nuestros servidores.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteCourse(selectedCourse.id)}
                      disabled={isDeleting}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sí, eliminar curso
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

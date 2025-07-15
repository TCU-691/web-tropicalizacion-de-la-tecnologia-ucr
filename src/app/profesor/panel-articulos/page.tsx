
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import type { FirestoreArticle, ContentBlock } from '@/types/article';
import type { UserProfile } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2, ShieldAlert, AlertTriangle, Eye, CheckCircle, XCircle, Trash2, Edit3, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
  [uid: string]: string;
}

type ArticleStatusFilter = 'todos' | 'pendiente' | 'aprobado' | 'rechazado';

export default function PanelArticulosPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allArticles, setAllArticles] = useState<FirestoreArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<FirestoreArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [authors, setAuthors] = useState<AuthorCache>({});
  
  const [selectedArticle, setSelectedArticle] = useState<FirestoreArticle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ArticleStatusFilter>('pendiente');


  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/profesor/panel-articulos');
      } else if (userProfile && userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
        router.push('/unauthorized?page=panel-articulos');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  const fetchAuthorName = useCallback(async (uid: string) => {
    if (authors[uid]) return authors[uid];
    if (!db) return 'Autor Desconocido';
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
  }, [authors]);

  useEffect(() => {
    if (currentUser && (userProfile?.rol === 'profesor' || userProfile?.rol === 'admin') && db) {
      const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        setLoadingArticles(true);
        const articlesDataPromises = querySnapshot.docs.map(async (docVal) => {
          const articleData = { id: docVal.id, ...docVal.data() } as FirestoreArticle;
          if (!authors[articleData.authorId]) {
            await fetchAuthorName(articleData.authorId);
          }
          return articleData;
        });
        
        const articlesData = await Promise.all(articlesDataPromises);
        setAllArticles(articlesData);
        setLoadingArticles(false);
      }, (error) => {
        console.error("Error fetching articles: ", error);
        toast({ title: 'Error al cargar artículos', description: 'No se pudieron obtener los artículos.', variant: 'destructive' });
        setLoadingArticles(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser, userProfile, fetchAuthorName, authors, toast]);

  useEffect(() => {
    if (statusFilter === 'todos') {
      setFilteredArticles(allArticles);
    } else {
      setFilteredArticles(allArticles.filter(article => article.status === statusFilter));
    }
  }, [allArticles, statusFilter]);

  const handleViewArticle = (article: FirestoreArticle) => {
    setSelectedArticle({
      ...article,
      authorDisplayName: authors[article.authorId] || 'Cargando autor...'
    });
    setIsModalOpen(true);
  };

  const updateArticleStatus = async (articleId: string, newStatus: 'aprobado' | 'rechazado') => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'articles', articleId), { status: newStatus, updatedAt: Timestamp.now() });
      toast({ title: 'Artículo Actualizado', description: `El artículo ha sido ${newStatus}.` });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error updating article status: ", error);
      toast({ title: 'Error', description: 'No se pudo actualizar el estado del artículo.', variant: 'destructive' });
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!db) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'articles', articleId));
      toast({ title: 'Artículo Eliminado', description: 'El artículo ha sido eliminado permanentemente.' });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting article: ", error);
      toast({ title: 'Error', description: 'No se pudo eliminar el artículo.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const getStatusBadgeVariant = (status: FirestoreArticle['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'aprobado': return 'default'; 
      case 'pendiente': return 'secondary'; 
      case 'rechazado': return 'destructive'; 
      default: return 'outline';
    }
  };

  const renderContentBlock = (block: ContentBlock, index: number) => {
    switch(block.type) {
        case 'heading': return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">{block.content}</h2>
        case 'subheading': return <h3 key={index} className="text-xl font-semibold mt-4 mb-2">{block.content}</h3>
        case 'paragraph': return <p key={index} className="text-base mb-4 leading-relaxed">{block.content}</p>
        default: return null;
    }
  }
  
  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando panel de artículos...</p>
      </div>
    );
  }

  const pendingCount = allArticles.filter(c => c.status === 'pendiente').length;
  const approvedCount = allArticles.filter(c => c.status === 'aprobado').length;
  const rejectedCount = allArticles.filter(c => c.status === 'rechazado').length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center border-b pb-6">
          <FileText className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="font-headline text-3xl md:text-4xl">Panel de Artículos</CardTitle>
          <CardDescription className="text-lg text-foreground/70">
            Gestiona los artículos enviados por la comunidad. Pendientes: {pendingCount}, Aprobados: {approvedCount}, Rechazados: {rejectedCount}.
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
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as ArticleStatusFilter)}>
                        <DropdownMenuRadioItem value="pendiente">Pendiente ({pendingCount})</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="aprobado">Aprobado ({approvedCount})</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="rechazado">Rechazado ({rejectedCount})</DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioItem value="todos">Todos ({allArticles.length})</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

          {loadingArticles ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary mr-3" /><p className="text-muted-foreground">Cargando artículos...</p></div>
          ) : filteredArticles.length === 0 ? (
            <Alert variant="default" className="bg-muted/30"><CheckCircle className="h-5 w-5 text-primary" /><AlertTitle className="font-semibold">No hay artículos</AlertTitle><AlertDescription>No hay artículos que coincidan con el filtro "{statusFilter}".</AlertDescription></Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título del Artículo</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead className="text-center">Enviado</TableHead>
                    <TableHead className="text-center">Categoría</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={article.title}>{article.title}</TableCell>
                      <TableCell>{authors[article.authorId] || 'Cargando...'}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{format(article.createdAt.toDate(), 'dd MMM yyyy', { locale: es })}</TableCell>
                      <TableCell className="text-center capitalize">{article.category}</TableCell>
                      <TableCell className="text-center"><Badge variant={getStatusBadgeVariant(article.status)} className="capitalize">{article.status}</Badge></TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleViewArticle(article)}><Eye className="mr-1.5 h-4 w-4" /> Revisar</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedArticle && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">{selectedArticle.title}</DialogTitle>
              <DialogDescription>
                Enviado por: {selectedArticle.authorDisplayName} el {format(selectedArticle.createdAt.toDate(), 'dd MMMM yyyy, HH:mm', { locale: es })}.
                 Estado actual: <Badge variant={getStatusBadgeVariant(selectedArticle.status)} className="capitalize ml-1">{selectedArticle.status}</Badge>
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto space-y-6 pr-4 py-2 -mr-4 border-y my-4">
              <p className="italic text-muted-foreground bg-muted/50 p-3 rounded-md">{selectedArticle.summary}</p>
              <div>{selectedArticle.contentBlocks.map(renderContentBlock)}</div>
            </div>
            <DialogFooter className="pt-4 border-t sm:justify-between">
              <div className="flex gap-2 flex-wrap">
                <Button variant="default" onClick={() => updateArticleStatus(selectedArticle.id, 'aprobado')} className="bg-green-600 hover:bg-green-700 text-white" disabled={selectedArticle.status === 'aprobado'}><CheckCircle className="mr-2 h-4 w-4" /> Aprobar</Button>
                <Button variant="destructive" onClick={() => updateArticleStatus(selectedArticle.id, 'rechazado')} disabled={selectedArticle.status === 'rechazado'}><XCircle className="mr-2 h-4 w-4" /> Rechazar</Button>
                 <Button variant="outline" asChild><Link href={`/profesor/panel-articulos/editar/${selectedArticle.id}`}><Edit3 className="mr-2 h-4 w-4" /> Editar</Link></Button>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente el artículo y todos sus datos de nuestros servidores.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteArticle(selectedArticle.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Sí, eliminar artículo</AlertDialogAction>
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

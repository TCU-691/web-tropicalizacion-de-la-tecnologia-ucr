'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { canManageProjects } from '@/lib/roles';
import type { FirestoreArticle } from '@/types/article';
import type { UserProfile } from '@/types/user';
import { deleteDocumentWithImages } from '@/lib/delete-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2, AlertTriangle, Trash2, Edit3, Plus } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';

interface AuthorCache {
  [uid: string]: string;
}

export default function PanelAnunciosPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allArticles, setAllArticles] = useState<FirestoreArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [authors, setAuthors] = useState<AuthorCache>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/profesor/panel-anuncios');
      } else if (userProfile && !canManageProjects(userProfile.rol)) {
        router.push('/unauthorized?page=panel-anuncios');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  const fetchAuthorName = useCallback(
    async (uid: string) => {
      if (authors[uid]) return authors[uid];
      if (!db) return 'Autor Desconocido';
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const authorProfile = userDocSnap.data() as UserProfile;
          const displayName = authorProfile.displayName || 'Autor Desconocido';
          setAuthors((prev) => ({ ...prev, [uid]: displayName }));
          return displayName;
        }
      } catch (error) {
        console.error('Error fetching author:', error);
      }
      setAuthors((prev) => ({ ...prev, [uid]: 'Autor Desconocido' }));
      return 'Autor Desconocido';
    },
    [authors]
  );

  useEffect(() => {
    if (currentUser && canManageProjects(userProfile?.rol) && db) {
      const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
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
        },
        (error) => {
          console.error('Error fetching articles: ', error);
          toast({ title: 'Error al cargar anuncios', description: 'No se pudieron obtener los anuncios.', variant: 'destructive' });
          setLoadingArticles(false);
        }
      );

      return () => unsubscribe();
    }
  }, [currentUser, userProfile, fetchAuthorName, authors, toast]);

  const handleDeleteArticle = async (articleId: string) => {
    setDeletingId(articleId);
    setIsDeleting(true);
    try {
      const result = await deleteDocumentWithImages('articles', articleId);

      if (result.success) {
        toast({
          title: 'Anuncio Eliminado',
          description: 'El anuncio y sus imágenes han sido eliminados.',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error deleting article: ', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el anuncio.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando panel de anuncios...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center border-b pb-6">
          <FileText className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="text-3xl md:text-4xl">Panel de Anuncios</CardTitle>
          <CardDescription className="text-lg">Gestiona los anuncios de la comunidad. Total: {allArticles.length}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/crear-anuncio">
                <Plus className="mr-2 h-4 w-4" />
                Crear Anuncio
              </Link>
            </Button>
          </div>

          {loadingArticles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <p className="text-muted-foreground">Cargando anuncios...</p>
            </div>
          ) : allArticles.length === 0 ? (
            <Alert variant="default" className="bg-muted/30">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold">No hay anuncios</AlertTitle>
              <AlertDescription>Crea tu primer anuncio haciendo clic en el botón de arriba.</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead className="text-center">Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={article.title}>
                        {article.title}
                      </TableCell>
                      <TableCell>{authors[article.authorId] || 'Cargando...'}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {format(article.createdAt.toDate(), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/profesor/panel-anuncios/editar/${article.id}`}>
                            <Edit3 className="mr-1.5 h-4 w-4" />
                            Editar
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isDeleting && deletingId === article.id}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el anuncio.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteArticle(article.id)}
                                disabled={isDeleting}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {isDeleting && deletingId === article.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                  </>
                                ) : (
                                  'Sí, eliminar'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert, Map, PlusCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreTour } from '@/types/tour';
import { TourAdminCard } from '@/components/tour-admin-card';
import { deleteDocumentWithImages } from '@/lib/delete-utils';

// --- Firestore null check helper ---
function assertDb(db: typeof import('@/lib/firebase').db): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

export default function PanelGirasPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tours, setTours] = useState<FirestoreTour[]>([]);
  const [loadingTours, setLoadingTours] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/profesor/panel-giras');
      } else if (userProfile && userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
        router.push('/unauthorized?page=panel-giras');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  useEffect(() => {
    if (currentUser && (userProfile?.rol === 'profesor' || userProfile?.rol === 'admin')) {
      assertDb(db);
      const toursCollection = collection(db, 'tours');
      const q = query(toursCollection, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const toursData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FirestoreTour));
        setTours(toursData);
        setLoadingTours(false);
      }, (error) => {
        console.error("Error fetching tours: ", error);
        toast({ title: 'Error al cargar giras', description: 'No se pudieron obtener las giras.', variant: 'destructive' });
        setLoadingTours(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser, userProfile, toast]);

  const handleDeleteTour = async (tourId: string) => {
    try {
      const result = await deleteDocumentWithImages('tours', tourId);
      
      if (result.success) {
        toast({
          title: "Gira Eliminada",
          description: `La gira y sus imágenes asociadas han sido eliminadas. Imágenes eliminadas: ${result.imageDeleteResult?.success || 0}`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error deleting tour: ", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la gira completamente.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || !currentUser || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando panel de giras...</p>
      </div>
    );
  }
  
  if (userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
    return (
     <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
       <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
       <h1 className="font-headline text-3xl text-destructive mb-3">Acceso Denegado</h1>
       <p className="text-lg text-muted-foreground mb-8 max-w-md">
         No tienes los permisos necesarios para administrar giras.
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
              <Map className="h-8 w-8 text-primary mr-3" />
              <CardTitle className="font-headline text-3xl">Administración de Giras</CardTitle>
            </div>
            <CardDescription className="text-md text-foreground/70">
              Gestiona las giras y actividades que se muestran en la sección pública.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/profesor/panel-giras/crear">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear nueva gira
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingTours ? (
             <div className="flex flex-col items-center justify-center min-h-[20rem]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Cargando giras...</p>
            </div>
          ) : tours.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tours.map(tour => (
                <TourAdminCard 
                    key={tour.id}
                    tour={tour}
                    onDelete={() => handleDeleteTour(tour.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4" />
              <p className="font-semibold text-lg">Aún no hay giras registradas.</p>
              <p>Haz clic en ‘Crear nueva gira’ para comenzar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

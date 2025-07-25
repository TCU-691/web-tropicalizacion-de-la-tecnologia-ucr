
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, MapPin, Info, Mail, AlertCircle } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreTour } from '@/types/tour';
import type { Metadata } from 'next';

export const revalidate = 0;

interface GiraPageParams {
    params: {
        slug: string;
    };
}

// This function tells Next.js which routes to pre-render at build time.
export async function generateStaticParams() {
    if (!db) return [];
    const toursCol = collection(db, 'tours');
    try {
        const querySnapshot = await getDocs(toursCol);
        return querySnapshot.docs.map(docSnap => ({
            slug: docSnap.data().slug,
        }));
    } catch (error) {
        console.error("Error generating static params for tours:", error);
        return [];
    }
}

async function getTourBySlug(slug: string): Promise<FirestoreTour | null> {
    if (!db) return null;
    const toursCol = collection(db, 'tours');
    const q = query(toursCol, where('slug', '==', slug), where('status', '!=', 'Cancelada'));
    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        const docSnap = querySnapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as FirestoreTour;
    } catch (error) {
        console.error("Error fetching tour by slug:", error);
        return null;
    }
}

export async function generateMetadata({ params }: GiraPageParams): Promise<Metadata> {
  const tour = await getTourBySlug((await params).slug);

  if (!tour) {
    return {
      title: 'Gira no encontrada | TCU TC-691',
      description: 'La gira solicitada no existe, fue cancelada o ha sido removida.',
    };
  }

  return {
    title: `${tour.title} | Giras y Actividades | TCU TC-691`,
    description: tour.description || 'Gira o actividad del TCU TC-691',
    keywords: [
      tour.location,
      tour.status,
      'gira',
      'actividad',
      'TCU',
      'TC-691',
      'UCR',
      'Universidad de Costa Rica',
      'tropicalización',
      'comunidad',
      'Costa Rica',
      'aprendizaje',
      'impacto social',
    ].filter(Boolean),
    openGraph: {
      title: `${tour.title} | Giras y Actividades | TCU TC-691`,
      description: tour.description,
      images: tour.imageUrl ? [tour.imageUrl] : [],
      siteName: 'TCU TC-691',
      locale: 'es_CR',
      type: 'article',
    },
    alternates: {
      canonical: `/giras/${tour.slug}`,
    },
  };
}

export default async function GiraPage({ params }: GiraPageParams) {
    const tour = await getTourBySlug((await params).slug);

    if (!tour) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
                <h1 className="font-headline text-4xl text-destructive mb-4">Gira no encontrada</h1>
                <p className="text-lg text-muted-foreground mb-8">
                    La gira que buscas no existe, fue cancelada o ha sido movida.
                </p>
                <Button asChild>
                    <Link href="/giras">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Giras
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Button asChild variant="outline" className="mb-8 group">
                <Link href="/giras">
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Volver a todas las Giras
                </Link>
            </Button>

            <article className="space-y-8">
                <header className="space-y-4 border-b pb-6">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-xl mb-6">
                        <Image
                            src={tour.imageUrl}
                            alt={`Imagen de ${tour.title}`}
                            layout="fill"
                            objectFit="cover"
                            priority
                            data-ai-hint="tour cover"
                        />
                    </div>
                    <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">{tour.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-lg text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-secondary" />
                            <span>{tour.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-secondary" />
                            <span>{tour.location}</span>
                        </div>
                    </div>
                </header>

                <section>
                    <Card className="bg-card/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-2xl font-headline text-primary">
                                <Info className="h-6 w-6" />
                                Detalles de la Actividad
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                {tour.description}
                            </p>
                            <div className="mt-6">
                                <Badge variant={tour.status === 'Realizada' ? 'outline' : 'secondary'} className="text-base">
                                    Estado: {tour.status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                 <section className="text-center bg-card p-6 rounded-lg shadow-sm">
                    <h3 className="font-headline text-2xl font-semibold text-primary mb-3">¿Interesado en participar?</h3>
                    <p className="text-muted-foreground mb-4">
                        Para más información sobre futuras giras y cómo puedes involucrarte, contáctanos.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-lg">
                         <Mail className="h-5 w-5 text-muted-foreground" />
                         <a href="mailto:tropicalizacion@ucr.ac.cr" className="text-foreground hover:text-primary hover:underline">
                            tropicalizacion@ucr.ac.cr
                        </a>
                    </div>
                </section>

            </article>
        </div>
    );
}

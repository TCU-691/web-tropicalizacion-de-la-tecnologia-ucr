import type { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreArticle } from '@/types/article';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Image as ImageKitImage } from '@imagekit/next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnnouncementPageParams {
  params: Promise<{
    id: string;
  }>;
}

async function getAnnouncementById(id: string): Promise<FirestoreArticle | null> {
  if (!db) return null;

  const announcementRef = doc(db, 'articles', id);
  const announcementSnap = await getDoc(announcementRef);

  if (!announcementSnap.exists()) {
    return null;
  }

  return { id: announcementSnap.id, ...announcementSnap.data() } as FirestoreArticle;
}

export async function generateMetadata({ params }: AnnouncementPageParams): Promise<Metadata> {
  const { id } = await params;
  const announcement = await getAnnouncementById(id);

  if (!announcement) {
    return {
      title: 'Anuncio no encontrado | TCU TC-691',
      description: 'El anuncio solicitado no existe o fue eliminado.',
    };
  }

  return {
    title: `${announcement.title} | Anuncios | TCU TC-691`,
    description: announcement.description,
    openGraph: {
      title: `${announcement.title} | Anuncios | TCU TC-691`,
      description: announcement.description,
      images: announcement.imageUrl ? [announcement.imageUrl] : [],
      siteName: 'TCU TC-691',
      locale: 'es_CR',
      type: 'article',
    },
    alternates: {
      canonical: `/anuncios/${announcement.id}`,
    },
  };
}

export default async function AnnouncementPage({ params }: AnnouncementPageParams) {
  const { id } = await params;
  const announcement = await getAnnouncementById(id);

  if (!announcement) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button asChild variant="outline" className="mb-8 group">
        <Link href="/anuncios">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver a Anuncios
        </Link>
      </Button>

      <Card className="overflow-hidden">
        {announcement.imageUrl && (
          <CardHeader className="p-0">
            <div className="relative aspect-video w-full">
              <ImageKitImage
                src={announcement.imageUrl}
                alt={`Imagen de ${announcement.title}`}
                fill
                className="object-cover"
                data-ai-hint="announcement full"
              />
            </div>
          </CardHeader>
        )}

        <CardContent className="pt-6 space-y-5">
          <CardTitle className="font-headline text-3xl md:text-4xl text-primary">{announcement.title}</CardTitle>
          <CardDescription className="text-base md:text-lg text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {announcement.description}
          </CardDescription>
          {announcement.linkUrl && (
            <div className="mt-6 pt-4 border-t">
              <Button asChild className="w-full sm:w-auto">
                <a href={announcement.linkUrl} target="_blank" rel="noopener noreferrer">
                  Acceder al enlace externo
                </a>
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(announcement.createdAt.toDate(), 'dd MMMM, yyyy', { locale: es })}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

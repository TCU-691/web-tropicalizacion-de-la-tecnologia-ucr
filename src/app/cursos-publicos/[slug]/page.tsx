
import { type FirestoreCourse } from '@/types/course';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tag, BookOpen, AlertCircle, Youtube } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getYoutubeEmbedUrl } from '@/lib/utils';
import { Image as ImageKitImage } from '@imagekit/next'; // Using ImageKit's Image component
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 0;

interface CoursePageParams {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  if (!db) return [];
  const coursesCol = collection(db, 'courses');
  const q = query(coursesCol, where('estado', '==', 'aprobado'));
  
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      slug: docSnap.data().slug,
    }));
  } catch (error) {
    console.error("Error generating static params for courses:", error);
    return [];
  }
}

async function getCourseBySlug(slug: string): Promise<FirestoreCourse | null> {
  if (!db) {
    console.error("Firestore (db) is not initialized.");
    return null;
  }
  const coursesCol = collection(db, 'courses');
  const q = query(coursesCol, where('slug', '==', slug), where('estado', '==', 'aprobado'), limit(1));
  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      fechaCreacion: data.fechaCreacion?.toDate ? data.fechaCreacion.toDate().toISOString() : String(data.fechaCreacion || ''),
      fechaActualizacion: data.fechaActualizacion?.toDate ? data.fechaActualizacion.toDate().toISOString() : undefined,
    } as FirestoreCourse;
  } catch (error) {
    console.error("Error fetching course by slug:", error);
    return null;
  }
}

export async function generateMetadata({ params }: CoursePageParams): Promise<Metadata> {
  const course = await getCourseBySlug((await params).slug);

  if (!course) {
    return {
      title: 'Curso no encontrado | TCU TC-691',
      description: 'El curso solicitado no existe o ha sido removido.',
    };
  }

  return {
    title: `${course.titulo} | Cursos Públicos | TCU TC-691`,
    description: course.descripcion || 'Curso público del TCU TC-691',
    keywords: [
      course.categoria,
      'curso',
      'TCU',
      'TC-691',
      'UCR',
      'Universidad de Costa Rica',
      'tropicalización',
      'tecnología',
      'educación',
      'comunidad',
      'Costa Rica',
      'aprendizaje',
      'material educativo',
    ].filter(Boolean),
    openGraph: {
      title: `${course.titulo} | Cursos Públicos | TCU TC-691`,
      description: course.descripcion,
      images: course.imagenUrl ? [course.imagenUrl] : [],
      siteName: 'TCU TC-691',
      locale: 'es_CR',
      type: 'article',
    },
    alternates: {
      canonical: `/cursos-publicos/${course.slug}`,
    },
  };
}

export default async function CoursePage({ params }: CoursePageParams) {
  const course = await getCourseBySlug((await params).slug);

  if (!course) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-12">
      <Button asChild variant="outline" className="mb-2 group print:hidden">
        <Link href="/cursos-publicos">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Todos los Cursos
        </Link>
      </Button>

      <article className="space-y-10">
        <header className="space-y-4 border-b pb-6">
            <div className="relative aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden shadow-xl mb-6">
             <ImageKitImage
                src={course.imagenUrl || "https://placehold.co/600x400.png"}
                alt={`Portada de ${course.titulo}`}
                layout="fill"
                objectFit="cover"
                data-ai-hint="course banner"
             />
            </div>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">{course.titulo}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {course.categoria && (
              <Badge variant="secondary" className="text-base">
                <Tag className="mr-1.5 h-4 w-4" /> {course.categoria}
              </Badge>
            )}
          </div>
          <p className="text-lg text-foreground/80 leading-relaxed">{course.descripcion}</p>
        </header>

        <section className="space-y-6">
          <h2 className="font-headline text-2xl md:text-3xl font-semibold text-primary flex items-center">
            <BookOpen className="mr-3 h-6 w-6" />
            Contenido del Curso
          </h2>
          {course.modulos && course.modulos.length > 0 ? (
            <Accordion type="single" collapsible defaultValue={course.modulos[0]?.id || `modulo-0`} className="w-full">
              {course.modulos.map((module, moduleIndex) => (
                <AccordionItem value={module.id || `modulo-${moduleIndex}`} key={module.id || `module-key-${moduleIndex}`} className="bg-card rounded-lg mb-4 shadow-sm">
                  <AccordionTrigger className="px-6 py-4 text-lg font-medium hover:no-underline">
                    {module.tituloModulo}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 space-y-6">
                    {module.lecciones && module.lecciones.length > 0 ? (
                      module.lecciones.map((lesson, lessonIndex) => {
                        const embedUrl = getYoutubeEmbedUrl(lesson.youtubeUrl);
                        return (
                          <div key={lesson.id || `lesson-key-${moduleIndex}-${lessonIndex}`} className="pt-4 border-t first:border-t-0 first:pt-0">
                            <h3 className="font-headline text-md font-semibold text-foreground/90 mb-2">
                              Lección {lessonIndex + 1}: {lesson.tituloLeccion}
                            </h3>
                            {embedUrl ? (
                              <div className="aspect-video mb-3 rounded-md shadow-md overflow-hidden">
                                <iframe
                                  className="w-full h-full"
                                  src={embedUrl}
                                  title={lesson.tituloLeccion}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                ></iframe>
                              </div>
                            ) : lesson.youtubeUrl ? (
                               <div className="flex items-center text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                                  <Youtube className="h-5 w-5 mr-2 text-destructive" />
                                  <span>Video de YouTube no disponible o URL inválida.</span>
                               </div>
                            ) : null }
                            {lesson.descripcionLeccion && (
                              <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{lesson.descripcionLeccion}</p>
                            )}
                            {!embedUrl && !lesson.descripcionLeccion && !lesson.youtubeUrl && (
                              <p className="text-sm text-muted-foreground italic">Contenido no disponible para esta lección.</p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-muted-foreground">No hay lecciones en este módulo.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <div className="flex items-center text-muted-foreground">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>El contenido detallado de este curso estará disponible pronto.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </article>
    </div>
  );
}

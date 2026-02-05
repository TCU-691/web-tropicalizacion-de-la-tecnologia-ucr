import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ProjectCard } from '@/components/project-card';
import { BookOpen, Users, ArrowRight, CalendarDays, Mail, MapPin, Gamepad2 } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreProject } from '@/types/project';
import type { FirestoreTour } from '@/types/tour';
import type { FirestoreArticle } from '@/types/article';
import { Badge } from '@/components/ui/badge';
import { Image as ImageKitImage } from '@imagekit/next';
import { ArticleCard } from '@/components/article-card';
import { ContactSection } from '@/components/contact-section';

export const revalidate = 0;

async function getFeaturedProjects(): Promise<FirestoreProject[]> {
  if (!db) return [];
  try {
    const projectsCollection = collection(db, 'projects');
    const q = query(
      projectsCollection,
      where('parentId', '==', null),
      orderBy('createdAt', 'desc'),
      limit(4)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreProject));
  } catch (error) {
    console.error("Error fetching featured projects:", error);
    if ((error as any).code === 'failed-precondition') {
        console.error(
          "Firestore query failed for featured projects. This likely means you're missing a composite index. " +
          "Please check the Firebase console for an error message with a link to create it."
        );
    }
    return [];
  }
}

async function getFeaturedTours(): Promise<FirestoreTour[]> {
    if (!db) return [];
    try {
        const toursCollection = collection(db, 'tours');
        const q = query(
            toursCollection,
            where('status', '!=', 'Cancelada'),
            orderBy('status', 'desc'), // 'Próximamente' comes before 'Realizada'
            orderBy('createdAt', 'desc'),
            limit(3)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreTour));
    } catch (error) {
        console.error("Error fetching featured tours:", error);
         if ((error as any).code === 'failed-precondition') {
            console.error(
            "Firestore query failed for featured tours. This likely means you're missing a composite index. " +
            "Please check the Firebase console for an error message with a link to create it."
            );
        }
        return [];
    }
}

async function getFeaturedArticles(): Promise<FirestoreArticle[]> {
  if (!db) return [];
  try {
    const articlesCollection = collection(db, 'articles');
    const q = query(
      articlesCollection,
      where('status', '==', 'aprobado'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreArticle));
  } catch (error) {
    console.error("Error fetching featured articles:", error);
    if ((error as any).code === 'failed-precondition') {
        console.error(
          "Firestore query failed for featured articles. This likely means you're missing a composite index."
        );
    }
    return [];
  }
}

export default async function HomePage() {
  const featuredProjects = await getFeaturedProjects();
  const featuredTours = await getFeaturedTours();
  const featuredArticles = await getFeaturedArticles();

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10 rounded-lg shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="font-headline text-4xl md:text-6xl font-bold text-primary">
            TCU TC-691
          </h1>
          <p className="font-headline text-3xl md:text-5xl mt-2 mb-6 text-foreground/80">
            Tropicalización de la Tecnología
          </p>
          <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8 text-foreground/70">
            Innovación educativa desde el trópico: visibilizando proyectos, compartiendo conocimiento.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/proyectos">Ver Proyectos</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/cursos-publicos">Explorar Cursos</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
               <Link href="/giras">Ver Giras</Link>
            </Button>
             <Button asChild variant="outline" size="lg" className="shadow-md hover:shadow-lg transition-shadow bg-accent/20 border-accent/50 text-accent-foreground hover:bg-accent/30">
              <Link href="/upload-profiles">Simulador Junior</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="space-y-4">
            <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary">Bienvenido al TCU TC-691</h2>
            <p className="text-lg text-foreground/80 leading-relaxed">
              El Trabajo Comunal Universitario (TCU) TC-691 "Tropicalización de la Tecnología" se dedica a desarrollar e implementar soluciones tecnológicas innovadoras adaptadas a las necesidades y contextos del trópico. Nuestro enfoque se centra en la educación, la sostenibilidad y el impacto social.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed">
              A través de diversos proyectos, buscamos empoderar a comunidades, fomentar el aprendizaje y visibilizar el potencial de la tecnología para resolver desafíos locales. Explora nuestras iniciativas y descubre cómo estamos marcando la diferencia.
            </p>
          </div>
          <div className="rounded-lg overflow-hidden shadow-xl aspect-video">
            <Image
              src="/tcu-hero-image.png"
              alt="Ilustración de tecnología y educación tropicalizada"
              width={600}
              height={400}
              className="w-full h-full object-cover"
              priority
              data-ai-hint="technology education tropics"
            />
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      {featuredProjects.length > 0 && (
        <section className="container mx-auto px-4">
          <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary text-center mb-10">Proyectos Destacados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <div className="text-center mt-10">
              <Button asChild variant="link" className="text-lg text-accent hover:text-accent/80">
                  <Link href="/proyectos">
                      Ver todos los proyectos <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
              </Button>
          </div>
        </section>
      )}

      {/* Featured Articles Section */}
      {featuredArticles.length > 0 && (
        <section className="container mx-auto px-4">
            <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary text-center mb-10">Artículos Recientes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredArticles.map(article => (
                    <ArticleCard key={article.id} article={article} />
                ))}
            </div>
            <div className="text-center mt-10">
                <Button asChild variant="link" className="text-lg text-accent hover:text-accent/80">
                    <Link href="/articulos">
                        Ver todos los artículos <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </section>
      )}

      {/* Tours Section */}
      {featuredTours.length > 0 && (
        <section className="container mx-auto px-4">
            <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary text-center mb-10">Giras y Actividades Recientes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredTours.map(tour => (
                <Card key={tour.id} className="bg-card hover:shadow-lg transition-shadow duration-300 flex flex-col">
                    <CardHeader className="p-0">
                        <div className="aspect-video relative w-full">
                            <ImageKitImage
                                src={tour.imageUrl}
                                alt={`Imagen de ${tour.title}`}
                                fill
                                className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                                data-ai-hint="tour cover"
                            />
                        </div>
                    </CardHeader>
                    <CardHeader>
                        <CardTitle className="flex items-start gap-3">
                            <MapPin className="h-6 w-6 text-secondary flex-shrink-0 mt-1" />
                            <span className="font-headline text-xl">{tour.title}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <div className="flex items-center justify-between text-muted-foreground pl-9">
                            <div className="flex items-center gap-2 text-sm">
                            <CalendarDays className="h-4 w-4" />
                            <span>{tour.date}</span>
                            </div>
                            <Badge variant={tour.status === 'Realizada' ? 'outline' : 'secondary'}>{tour.status}</Badge>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full group">
                            <Link href={`/giras/${tour.slug}`}>
                                Ver más detalles <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
                ))}
            </div>
            <div className="text-center mt-10">
                <Button asChild variant="link" className="text-lg text-accent hover:text-accent/80">
                    <Link href="/giras">
                        Ver todas las giras <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </section>
      )}

      {/* Quick Links Section */}
      <section className="container mx-auto px-4">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary text-center mb-10">Explora Más</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <Card className="text-center p-6 hover:shadow-xl transition-shadow duration-300 group">
            <CardHeader>
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-accent group-hover:scale-110 transition-transform" />
              <CardTitle className="font-headline text-2xl">Cursos Públicos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Accede a nuestros cursos y materiales educativos abiertos a todo público.</CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Button asChild variant="default">
                <Link href="/cursos-publicos">Ir a Cursos <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="text-center p-6 hover:shadow-xl transition-shadow duration-300 group">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto mb-4 text-accent group-hover:scale-110 transition-transform" />
              <CardTitle className="font-headline text-2xl">Todos los Proyectos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Descubre la gama completa de iniciativas que estamos desarrollando.</CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Button asChild variant="default">
                <Link href="/proyectos">Ver Proyectos <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardFooter>
          </Card>

           <Card className="text-center p-6 hover:shadow-xl transition-shadow duration-300 group">
            <CardHeader>
              <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-accent group-hover:scale-110 transition-transform" />
              <CardTitle className="font-headline text-2xl">Simulador Junior</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>¡Una experiencia de aprendizaje interactiva y divertida! (Próximamente)</CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Button asChild variant="default">
                <Link href="/simulador-junior">Explorar <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />
    </div>
  );
}

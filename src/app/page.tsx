import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ProjectCard } from '@/components/project-card';
import { projectsData } from '@/lib/projects-data';
import { Facebook, BookOpen, Users, ArrowRight, CalendarDays, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const featuredProjects = projectsData.filter(p => p.featured).slice(0, 4);

  // Mock Facebook posts
  const mockFacebookPosts = [
    { id: 1, title: 'Nuevo Taller de Python para Principiantes', date: 'Hace 2 días', imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'python workshop', link: '#' },
    { id: 2, title: 'Resultados del Proyecto Microrredes en la Comunidad X', date: 'Hace 5 días', imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'community energy', link: '#' },
    { id: 3, title: 'Inscripciones Abiertas: Robotikids Edición Verano', date: 'Hace 1 semana', imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'kids coding', link: '#' },
  ];

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
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/proyectos">Ver Proyectos</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/cursos-publicos">Explorar Cursos</Link>
            </Button>
            <Button variant="secondary" size="lg" disabled className="shadow-md">
              Simulador Junior (Próximamente)
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
              src="https://placehold.co/600x400.png"
              alt="Ilustración de tecnología y educación tropicalizada"
              width={600}
              height={400}
              className="w-full h-full object-cover"
              data-ai-hint="technology education tropics"
            />
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section className="container mx-auto px-4">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary text-center mb-10">Proyectos Destacados</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {featuredProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
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

      {/* Facebook Feed Section */}
      <section className="container mx-auto px-4">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary text-center mb-10">Noticias Recientes</h2>
        <div className="bg-card p-6 rounded-lg shadow-lg">
          <div className="flex items-center text-foreground/70 mb-6">
            <Facebook className="h-6 w-6 mr-2 text-blue-600" />
            <span className="font-medium">Últimas publicaciones de nuestra página de Facebook</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockFacebookPosts.map(post => (
              <Card key={post.id} className="overflow-hidden transition-shadow duration-300 hover:shadow-xl">
                <CardHeader className="p-0">
                  <Image src={post.imageUrl} alt={post.title} width={300} height={200} className="w-full h-auto object-cover aspect-[3/2]" data-ai-hint={post.dataAiHint} />
                </CardHeader>
                <CardContent className="p-4">
                  <h3 className="font-headline text-lg font-semibold mb-1 line-clamp-2">{post.title}</h3>
                  <p className="text-xs text-muted-foreground flex items-center mb-2">
                    <CalendarDays className="h-3 w-3 mr-1.5" /> {post.date}
                  </p>
                  <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80 p-0 h-auto">
                    <Link href={post.link} target="_blank" rel="noopener noreferrer">
                      Leer más <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
              <Link href="#" target="_blank" rel="noopener noreferrer"> {/* Replace # with actual Facebook page URL */}
                <Facebook className="mr-2 h-4 w-4" /> Visitar en Facebook
              </Link>
            </Button>
          </div>
        </div>
      </section>

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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mouse-pointer-2 h-12 w-12 mx-auto mb-4 text-accent group-hover:scale-110 transition-transform"><path d="m14 14 4.07-4.07a1 1 0 0 0 0-1.42L15.5 6a1 1 0 0 0-1.42 0L10 10.07Z"/><path d="m10 10-5.5 5.5a1 1 0 0 0 0 1.41l2.12 2.12a1 1 0 0 0 1.41 0L13.5 13.5Z"/></svg>
              <CardTitle className="font-headline text-2xl">Simulador Junior</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Una plataforma interactiva para aprender jugando (¡Próximamente!).</CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Button variant="secondary" disabled>
                Explorar (Próximamente)
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
        </div>
      </section>
    </div>
  );
}

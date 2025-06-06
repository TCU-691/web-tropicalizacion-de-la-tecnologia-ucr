import { projectsData, getProjectBySlug } from '@/lib/projects-data';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tag, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProjectPageParams {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  return projectsData.map(project => ({
    slug: project.slug,
  }));
}

export default function ProjectPage({ params }: ProjectPageParams) {
  const project = getProjectBySlug(params.slug);

  if (!project) {
    return (
      <div className="text-center py-20">
        <h1 className="font-headline text-4xl text-destructive mb-4">Proyecto no encontrado</h1>
        <p className="text-lg text-muted-foreground mb-8">
          El proyecto que buscas no existe o ha sido movido.
        </p>
        <Button asChild>
          <Link href="/proyectos">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Proyectos
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-12">
      <Button asChild variant="outline" className="mb-8 group">
        <Link href="/proyectos">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Todos los Proyectos
        </Link>
      </Button>

      <article>
        <header className="mb-10">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary mb-3">{project.name}</h1>
          {project.category && (
            <Badge variant="secondary" className="text-sm">
              <Tag className="mr-1.5 h-4 w-4" /> {project.category}
            </Badge>
          )}
        </header>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-10 items-start">
          <div className="aspect-video w-full relative rounded-lg overflow-hidden shadow-xl">
            <Image
              src={project.imageUrl}
              alt={`Imagen del proyecto ${project.name}`}
              layout="fill"
              objectFit="cover"
              data-ai-hint={project.dataAiHint}
            />
          </div>
          <div className="space-y-4">
            <h2 className="font-headline text-2xl font-semibold text-foreground/90">Descripción General</h2>
            <p className="text-lg text-foreground/80 leading-relaxed">{project.description}</p>
          </div>
        </div>
        
        <Separator className="my-10" />

        {project.longDescription && (
           <section className="space-y-4">
             <h2 className="font-headline text-2xl md:text-3xl font-semibold text-primary flex items-center">
                <Layers className="mr-3 h-6 w-6"/>
                Detalles del Proyecto
            </h2>
             <div className="prose prose-lg max-w-none text-foreground/80 leading-relaxed">
                {project.longDescription.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
             </div>
           </section>
        )}

        {!project.longDescription && (
             <Card className="mt-8 bg-accent/10">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-accent flex items-center">
                        <Layers className="mr-3 h-5 w-5"/>
                        Más Información Próximamente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-foreground/70">
                        Estamos trabajando para proporcionarte más detalles sobre este emocionante proyecto. ¡Vuelve pronto!
                    </p>
                </CardContent>
            </Card>
        )}

      </article>
    </div>
  );
}


import { doc, getDoc, getDocs, collection, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreProject, ProjectBlock } from '@/types/project';
import type { FirestoreTask } from '@/types/task';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tag, Layers, Link as LinkIcon, Youtube, Mail, Phone, User, Newspaper, FolderArchive, TextIcon, Image as ImageIcon, Contact, FileText, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getYoutubeEmbedUrl } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Progress } from '@/components/ui/progress';
import { ProjectTasksSection, type SerializedTask } from '@/components/project-tasks-section';

export const revalidate = 0;

interface ProjectPageParams {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  console.log('[DEBUG] generateStaticParams - Iniciando generación de parámetros estáticos');
  if (!db) {
    console.error('[ERROR] generateStaticParams - Firestore no está inicializado');
    return [];
  }
  
  const projectsCol = collection(db, 'projects');
  console.log('[DEBUG] generateStaticParams - Colección de proyectos obtenida');
  
  try {
    const querySnapshot = await getDocs(projectsCol);
    console.log(`[INFO] generateStaticParams - Proyectos encontrados: ${querySnapshot.docs.length}`);
    
    const params = querySnapshot.docs.map(docSnap => ({
      slug: docSnap.data().slug,
    }));
    
    console.log(`[DEBUG] generateStaticParams - Parámetros generados: ${JSON.stringify(params)}`);
    return params;
  } catch (error) {
    console.error("[ERROR] generateStaticParams - Error generando parámetros:", error);
    return [];
  }
}

export async function generateMetadata({ params }: ProjectPageParams): Promise<Metadata> {
  console.log(`[DEBUG] generateMetadata - Generando metadata para slug: ${(await params).slug}`);
  
  const { project } = await getProjectData((await params).slug);
  console.log(`[INFO] generateMetadata - Proyecto encontrado: ${project?.name || 'no encontrado'}`);

  if (!project) {
    console.warn(`[WARN] generateMetadata - No se encontró proyecto para slug: ${(await params).slug}`);
    return {
      title: 'Proyecto no encontrado | TCU TC-691',
      description: 'El proyecto solicitado no existe o ha sido removido.',
    };
  }

  return {
    title: `${project.name} | Proyectos | TCU TC-691`,
    description: project.description || 'Proyecto del TCU TC-691',
    keywords: [
      project.category,
      'proyecto',
      'TCU',
      'TC-691',
      'UCR',
      'Universidad de Costa Rica',
      'tropicalización',
      'tecnología',
      'innovación',
      'impacto social',
      'Costa Rica',
      'comunidad',
      'sostenibilidad',
    ].filter(Boolean),
    openGraph: {
      title: `${project.name} | Proyectos | TCU TC-691`,
      description: project.description,
      images: project.coverImageUrl ? [project.coverImageUrl] : [],
      siteName: 'TCU TC-691',
      locale: 'es_CR',
      type: 'article',
    },
    alternates: {
      canonical: `/proyectos/${project.slug}`,
    },
  };
}

async function getProjectData(slug: string) {
    if (!db) {
        return { project: null, tasks: [] };
    }
    
    try {
        const projectsCol = collection(db, 'projects');
        const q = query(projectsCol, where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);
        const docSnap = querySnapshot.docs[0];

        if (!docSnap || !docSnap.exists()) {
            return { project: null, tasks: [] };
        }

        const project = { id: docSnap.id, ...docSnap.data() } as FirestoreProject;

        // Fetch tasks for this project
        let tasks: FirestoreTask[] = [];
        try {
            const tasksQuery = query(
                collection(db, 'tasks'),
                where('parentId', '==', project.id),
                orderBy('endDate', 'asc')
            );
            const tasksSnap = await getDocs(tasksQuery);
            tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreTask));
        } catch (error) {
            console.error(`[ERROR] getProjectData - Error al buscar tareas:`, error);
        }

        return { project, tasks };
    } catch (error) {
        console.error(`[ERROR] getProjectData - Error general:`, error);
        return { project: null, tasks: [] };
    }
}



function renderBlock(block: ProjectBlock, index: number) {
    switch (block.type) {
        case 'text': return (<div key={block.id || index}><Separator className="my-8" /><section className="space-y-4"><h3 className="font-headline text-2xl font-semibold text-primary flex items-center"><TextIcon className="mr-3 h-6 w-6"/>{block.title}</h3><div className="prose prose-lg max-w-none text-foreground/80 leading-relaxed whitespace-pre-wrap">{block.content}</div></section></div>);
        case 'video':
            const embedUrl = getYoutubeEmbedUrl(block.youtubeUrl);
            return (<div key={block.id || index}><Separator className="my-8" /><section className="space-y-4"><h3 className="font-headline text-2xl font-semibold text-primary flex items-center"><Youtube className="mr-3 h-6 w-6 text-red-600"/>{block.title}</h3>{embedUrl ? (<Card className="overflow-hidden shadow-lg"><div className="aspect-video"><iframe className="w-full h-full" src={embedUrl} title={block.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div></Card>) : <p className="text-destructive">URL de video no válida.</p>}</section></div>);
        case 'image': return (<div key={block.id || index}><Separator className="my-8" /><section className="space-y-4 text-center"><h3 className="font-headline text-2xl font-semibold text-primary flex items-center justify-center"><ImageIcon className="mr-3 h-6 w-6"/>{block.title}</h3><div className="relative aspect-video w-full max-w-3xl mx-auto rounded-lg overflow-hidden shadow-xl"><Image src={block.imageUrl} alt={block.title} layout="fill" objectFit="cover" data-ai-hint="project content image" /></div>{block.description && <p className="text-center text-sm text-muted-foreground italic mt-3 max-w-2xl mx-auto">{block.description}</p>}</section></div>);
        case 'carousel': return (<div key={block.id || index}><Separator className="my-8" /><section className="space-y-4"><h3 className="font-headline text-2xl font-semibold text-primary flex items-center"><Layers className="mr-3 h-6 w-6"/>{block.title}</h3>{block.description && <p className="text-muted-foreground max-w-3xl">{block.description}</p>}<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{block.images.map(image => (<div key={image.id} className="relative aspect-square rounded-lg overflow-hidden shadow-md transition-transform hover:scale-105"><Image src={image.imageUrl} alt="Imagen de carrusel" layout="fill" objectFit="cover" data-ai-hint="project carousel image"/></div>))}</div></section></div>);
        case 'link': return (<div key={block.id || index}><Separator className="my-8" /><Card className="bg-muted/30 hover:shadow-lg transition-shadow"><CardHeader><CardTitle className="flex items-center text-primary"><LinkIcon className="mr-3 h-5 w-5"/>{block.title}</CardTitle>{block.description && <CardDescription>{block.description}</CardDescription>}</CardHeader><CardContent><Button asChild><a href={block.url} target="_blank" rel="noopener noreferrer">Visitar enlace <ArrowLeft className="ml-2 h-4 w-4 rotate-180" /></a></Button></CardContent></Card></div>);
        case 'contact': return (<div key={block.id || index}><Separator className="my-8" /><Card className="bg-card max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="font-headline flex items-center justify-center text-xl text-primary"><Contact className="mr-3 h-6 w-6"/>{block.title || 'Contacto'}</CardTitle></CardHeader><CardContent className="space-y-3 text-center"><p className="flex items-center justify-center gap-2"><User className="h-4 w-4 text-muted-foreground"/><strong>{block.name}</strong></p><p className="flex items-center justify-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/><a href={`mailto:${block.email}`} className="hover:underline">{block.email}</a></p>{block.phone && <p className="flex items-center justify-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{block.phone}</p>}{block.socialLink && <p className="flex items-center justify-center gap-2"><LinkIcon className="h-4 w-4 text-muted-foreground"/><a href={block.socialLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Perfil Social</a></p>}</CardContent></Card></div>);
        case 'papers': return (<div key={block.id || index}><Separator className="my-8" /><section className="space-y-4"><h3 className="font-headline text-2xl font-semibold text-primary flex items-center"><Newspaper className="mr-3 h-6 w-6"/>{block.title}</h3><div className="space-y-4">{block.papers.map(paper => (<Card key={paper.id} className="hover:border-primary/50 transition-colors"><CardHeader><CardTitle className="text-lg">{paper.title} ({paper.year})</CardTitle><CardDescription>{paper.authors}</CardDescription></CardHeader><CardContent><Button asChild variant="outline" size="sm"><a href={paper.link} target="_blank" rel="noopener noreferrer"><FileText className="mr-2 h-4 w-4"/>Ver publicación</a></Button></CardContent></Card>))}</div></section></div>);
        case 'resources': return (<div key={block.id || index}><Separator className="my-8" /><section className="space-y-4"><h3 className="font-headline text-2xl font-semibold text-primary flex items-center"><FolderArchive className="mr-3 h-6 w-6"/>{block.title}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{block.resources.map(resource => (<a key={resource.id} href={resource.link} target="_blank" rel="noopener noreferrer" className="block group"><Card className="h-full transition-all group-hover:bg-accent/50 group-hover:shadow-md"><CardHeader><CardTitle className="text-lg text-accent-foreground group-hover:text-primary">{resource.title}</CardTitle>{resource.description && <CardDescription>{resource.description}</CardDescription>}</CardHeader></Card></a>))}</div></section></div>);
        default: return null;
    }
}


export default async function ProjectPage({ params }: ProjectPageParams) {
  const { project, tasks } = await getProjectData((await params).slug);

  if (!project) {
    notFound();
  }

  // Serialize tasks for the client component (convert Timestamps to ISO strings)
  const serializedTasks: SerializedTask[] = tasks.map(task => {
    const endDate = task.endDate?.toDate ? task.endDate.toDate() : new Date(task.endDate as any);
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      endDate: endDate.toISOString(),
      hours: task.hours,
      maxSlots: task.maxSlots,
      status: task.status,
      usedSlots: task.usedSlots,
      parentId: task.parentId,
    };
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <Button asChild variant="outline" className="mb-8 group">
            <Link href="/proyectos">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Todos los Proyectos
            </Link>
        </Button>
      

      <article>
        <header className="mb-10 border-b pb-8 text-center">
            {project.category && (<Badge variant="secondary" className="text-base mb-4"><Tag className="mr-1.5 h-4 w-4" /> {project.category}</Badge>)}
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary mb-3">{project.name}</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{project.description}</p>
        </header>

        <section className="mb-12">
            <Card className="overflow-hidden shadow-xl border-none">
                <div className="aspect-video w-full relative">
                    <Image src={project.coverImageUrl} alt={`Imagen del proyecto ${project.name}`} fill className="object-cover" priority data-ai-hint="project cover" />
                </div>
                <CardContent className="p-6 md:p-8 bg-card">
                    <h2 className="font-headline text-2xl md:text-3xl font-semibold text-primary mb-4 flex items-center"><Layers className="mr-3 h-6 w-6"/>Detalles del Proyecto</h2>
                    <div className="prose prose-lg max-w-none text-foreground/80 leading-relaxed whitespace-pre-wrap">{project.longDescription}</div>
                </CardContent>
            </Card>
        </section>
        
        {serializedTasks.length > 0 && (
          <ProjectTasksSection tasks={serializedTasks} projectLeaderIds={project.leaderIds || []} />
        )}

        {project.blocks && project.blocks.length > 0 && (
            <div className="space-y-8">
                {project.blocks.map((block, index) => renderBlock(block, index))}
            </div>
        )}
      </article>
    </div>
  );
}

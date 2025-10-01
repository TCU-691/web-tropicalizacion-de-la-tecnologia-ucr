
import { doc, getDoc, getDocs, collection, query, where, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreProject, ProjectBlock, RelatedCoursesBlock } from '@/types/project';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tag, Layers, Link as LinkIcon, Youtube, Mail, Phone, User, Newspaper, FolderArchive, TextIcon, Image as ImageIcon, Contact, FileText, BookHeart, GitMerge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getYoutubeEmbedUrl } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { CourseCard } from '@/components/course-card';
import { ProjectCard } from '@/components/project-card';
import type { FirestoreCourse } from '@/types/course';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

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
    console.log(`[DEBUG] getProjectData - Iniciando búsqueda para slug: ${slug}`);
    if (!db) {
        console.error('[ERROR] getProjectData - Firestore no está inicializado');
        return { project: null, subProjects: [], parentProject: null };
    }
    
    try {
        const projectsCol = collection(db, 'projects');
        console.log('[DEBUG] getProjectData - Colección de proyectos obtenida');
        
        const q = query(projectsCol, where('slug', '==', slug), limit(1));
        console.log(`[DEBUG] getProjectData - Query creada para slug: ${slug}`);
        
        const querySnapshot = await getDocs(q);
        console.log(`[DEBUG] getProjectData - Query ejecutada, docs encontrados: ${querySnapshot.docs.length}`);
        
        const docSnap = querySnapshot.docs[0];

        if (!docSnap || !docSnap.exists()) {
            console.error(`[ERROR] getProjectData - No se encontró proyecto con slug: ${slug}`);
            return { project: null, subProjects: [], parentProject: null };
        }

        const project = { id: docSnap.id, ...docSnap.data() } as FirestoreProject;
        console.log(`[INFO] getProjectData - Proyecto encontrado: ${project.name} (ID: ${project.id})`);

        let subProjects: FirestoreProject[] = [];
        let parentProject: FirestoreProject | null = null;

        if (!project.parentId) {
            console.log(`[INFO] getProjectData - Proyecto es padre, buscando subproyectos para ID: ${project.id}`);
            try {
                const subProjectsQuery = query(collection(db, 'projects'), where('parentId', '==', project.id));
                console.log(`[DEBUG] getProjectData - Query de subproyectos creada para parentId: ${project.id}`);
                
                const subProjectsSnap = await getDocs(subProjectsQuery);
                console.log(`[INFO] getProjectData - Subproyectos encontrados: ${subProjectsSnap.docs.length}`);
                
                subProjects = subProjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreProject));
                console.log(`[DEBUG] getProjectData - Datos de subproyectos procesados: ${JSON.stringify(subProjects.map(p => ({ id: p.id, name: p.name })))}`);
            } catch (error) {
                console.error(`[ERROR] getProjectData - Error al buscar subproyectos:`, error);
                if ((error as any).code === 'failed-precondition') {
                    console.error(`[ERROR] getProjectData - Error de índice compuesto. Verifica que existe un índice para la consulta where('parentId', '==', [valor])`);
                }
            }
        } else {
            console.log(`[INFO] getProjectData - Proyecto es subproyecto, buscando proyecto padre con ID: ${project.parentId}`);
            try {
                const parentDocSnap = await getDoc(doc(db, 'projects', project.parentId));
                if (parentDocSnap.exists()) {
                    parentProject = { id: parentDocSnap.id, ...parentDocSnap.data() } as FirestoreProject;
                    console.log(`[INFO] getProjectData - Proyecto padre encontrado: ${parentProject.name}`);
                } else {
                    console.warn(`[WARN] getProjectData - Proyecto padre con ID ${project.parentId} no encontrado`);
                }
            } catch (error) {
                console.error(`[ERROR] getProjectData - Error al buscar proyecto padre:`, error);
            }
        }

        console.log(`[DEBUG] getProjectData - Finalizando con éxito para ${project.name}`);
        return { project, subProjects, parentProject };
    } catch (error) {
        console.error(`[ERROR] getProjectData - Error general:`, error);
        return { project: null, subProjects: [], parentProject: null };
    }
}


async function getRelatedCourses(courseIds: string[]): Promise<FirestoreCourse[]> {
    console.log(`[DEBUG] getRelatedCourses - Buscando cursos relacionados, IDs: ${JSON.stringify(courseIds)}`);
    
    if (!db) {
        console.error('[ERROR] getRelatedCourses - Firestore no está inicializado');
        return [];
    }
    
    if (courseIds.length === 0) {
        console.log('[INFO] getRelatedCourses - No hay IDs de cursos para buscar');
        return [];
    }
    
    try {
        const coursesRef = collection(db, "courses");
        console.log('[DEBUG] getRelatedCourses - Colección de cursos obtenida');
        
        const q = query(coursesRef, where('__name__', 'in', courseIds), where('estado', '==', 'aprobado'));
        console.log(`[DEBUG] getRelatedCourses - Query creada para ${courseIds.length} cursos`);
        
        const querySnapshot = await getDocs(q);
        console.log(`[INFO] getRelatedCourses - Cursos encontrados: ${querySnapshot.docs.length} de ${courseIds.length} solicitados`);
        
        const courses = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            fechaCreacion: (docSnap.data().fechaCreacion as Timestamp).toDate().toISOString(),
            fechaActualizacion: docSnap.data().fechaActualizacion ? (docSnap.data().fechaActualizacion as Timestamp).toDate().toISOString() : undefined,
        } as FirestoreCourse));
        
        console.log(`[DEBUG] getRelatedCourses - Datos de cursos procesados: ${JSON.stringify(courses.map(c => ({ id: c.id, titulo: c.titulo })))}`);
        return courses;
    } catch (error) {
        console.error("[ERROR] getRelatedCourses - Error al buscar cursos relacionados:", error);
        if ((error as any).code === 'failed-precondition') {
            console.error(`[ERROR] getRelatedCourses - Error de índice compuesto. Verifica que existe un índice para la consulta con múltiples condiciones where`);
        }
        return [];
    }
}

async function RelatedCoursesComponent({ block }: { block: RelatedCoursesBlock }) {
    const courses = await getRelatedCourses(block.courseIds);

    if (courses.length === 0) {
        return null;
    }

    return (
        <div key={block.id}>
            <Separator className="my-8" />
            <section className="space-y-4">
                <h3 className="font-headline text-2xl font-semibold text-primary flex items-center">
                    <BookHeart className="mr-3 h-6 w-6"/>{block.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </div>
            </section>
        </div>
    );
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
        case 'relatedCourses': return <RelatedCoursesComponent key={block.id || index} block={block} />;
        default: return null;
    }
}


export default async function ProjectPage({ params }: ProjectPageParams) {
  console.log(`[DEBUG] ProjectPage - Iniciando renderizado para slug: ${(await params).slug}`);
  
  const { project, subProjects, parentProject } = await getProjectData((await params).slug);
  console.log(`[INFO] ProjectPage - Datos obtenidos: proyecto ${project?.name || 'no encontrado'}, ${subProjects.length} subproyectos, proyecto padre ${parentProject?.name || 'ninguno'}`);

  if (!project) {
    console.error(`[ERROR] ProjectPage - Proyecto no encontrado para slug: ${(await params).slug}`);
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        {parentProject ? (
             <div className="mb-6">
                <Button asChild variant="link" className="p-0 text-muted-foreground">
                    <Link href={`/proyectos/${parentProject.slug}`}>
                        <GitMerge className="mr-2 h-4 w-4" />
                        Subproyecto de: {parentProject.name}
                    </Link>
                </Button>
            </div>
        ) : (
            <Button asChild variant="outline" className="mb-8 group">
                <Link href="/proyectos">
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Todos los Proyectos
                </Link>
            </Button>
        )}
      

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
        
        {(() => {
            if (subProjects.length > 0) {
                console.log(`[INFO] ProjectPage - Renderizando ${subProjects.length} subproyectos`);
                return (
                    <div key="subprojects-section">
                        <Separator className="my-8" />
                        <section className="space-y-4">
                            <h3 className="font-headline text-2xl font-semibold text-primary flex items-center">
                                <GitMerge className="mr-3 h-6 w-6"/>Subproyectos Relacionados
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {subProjects.map(sub => {
                                    console.log(`[DEBUG] ProjectPage - Renderizando subproyecto: ${sub.name} (ID: ${sub.id})`);
                                    return <ProjectCard key={sub.id} project={sub} />;
                                })}
                            </div>
                        </section>
                    </div>
                );
            } else {
                console.log(`[INFO] ProjectPage - No hay subproyectos para mostrar para el proyecto ${project.name}`);
                return null;
            }
        })()}

        {project.blocks && project.blocks.length > 0 && (
            <div className="space-y-8">
                {project.blocks.map((block, index) => renderBlock(block, index))}
            </div>
        )}
      </article>
    </div>
  );
}

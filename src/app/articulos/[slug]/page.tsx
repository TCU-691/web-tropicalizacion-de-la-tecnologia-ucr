
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreArticle, ContentBlock } from '@/types/article';
import type { UserProfile } from '@/types/user';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Tag, User, Calendar, Mail } from 'lucide-react';
import { ScrollProgress } from '@/components/scroll-progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TableOfContents } from '@/components/table-of-contents';
import type { Metadata } from 'next';


interface ArticlePageParams {
  params: {
    slug: string;
  };
}

// Helper function to generate IDs for headings
function slugify(text: string) {
  return text.toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')         // Trim - from start of text
    .replace(/-+$/, '');        // Trim - from end of text
}


async function getArticleData(slug: string) {
  if (!db) return null;
  const articlesCol = collection(db, 'articles');
  const q = query(articlesCol, where('slug', '==', slug), where('status', '==', 'aprobado'), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }
  
  const articleSnap = querySnapshot.docs[0];
  const article = { id: articleSnap.id, ...articleSnap.data() } as FirestoreArticle;
  
  let author: UserProfile | null = null;
  if (article.authorId) {
    try {
        const authorDocRef = doc(db, 'users', article.authorId);
        const authorSnap = await getDoc(authorDocRef);
        author = authorSnap.exists() ? (authorSnap.data() as UserProfile) : null;
    } catch(e){
        console.error("Could not fetch author", e);
    }
  }
  
  return { article, author };
}


function renderContentBlock(block: ContentBlock, index: number) {
  const id = `${slugify(block.content)}-${index}`; // Append index for uniqueness
  switch(block.type) {
      case 'heading': return <h2 key={index} id={id} className="font-headline text-3xl font-bold mt-8 mb-4 text-primary scroll-mt-24">{block.content}</h2>
      case 'subheading': return <h3 key={index} id={id} className="font-headline text-2xl font-semibold mt-6 mb-3 text-foreground/90 scroll-mt-24">{block.content}</h3>
      case 'paragraph': return <p key={index} className="mb-6 leading-relaxed text-lg">{block.content}</p>
      default: return null;
  }
}

export async function generateMetadata({ params }: ArticlePageParams): Promise<Metadata> {
  const data = await getArticleData((await params).slug);
  const article = data?.article;
  const author = data?.author;

  if (!article) {
    return {
      title: 'Artículo no encontrado | TCU TC-691',
      description: 'El artículo solicitado no existe o ha sido removido.',
    };
  }

  return {
    title: `${article.title} | Artículos | TCU TC-691`,
    description: article.summary || 'Artículo del TCU TC-691',
    keywords: [
      article.category,
      'artículo',
      'TCU',
      'TC-691',
      'UCR',
      'Universidad de Costa Rica',
      'tropicalización',
      'educación',
      'comunidad',
      'Costa Rica',
      'aprendizaje',
      'impacto social',
    ].filter(Boolean),
    openGraph: {
      title: `${article.title} | Artículos | TCU TC-691`,
      description: article.summary,
      images: article.coverImageUrl ? [article.coverImageUrl] : [],
      siteName: 'TCU TC-691',
      locale: 'es_CR',
      type: 'article',
      authors: author?.displayName ? [author.displayName] : undefined,
    },
    alternates: {
      canonical: `/articulos/${article.slug}`,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageParams) {
  const data = await getArticleData((await params).slug);
  
  if (!data) {
    notFound();
  }

  const { article, author } = data;
  const imageUrl = article.coverImageUrl || `https://placehold.co/1200x600.png?text=${encodeURIComponent(article.category)}`;

  // Prepare headings for the client-side TableOfContents component
  const headings = article.contentBlocks
      .map((block, index) => ({ block, index })) // Keep original index
      .filter(({ block }) => block.type === 'heading' || block.type === 'subheading')
      .map(({ block, index }) => ({
        id: `${slugify(block.content)}-${index}`, // Append index for uniqueness
        level: block.type === 'heading' ? 1 : 2,
        title: block.content,
      }));

  return (
    <>
      <ScrollProgress />
      <div className="flex flex-row-reverse max-w-6xl mx-auto py-8 gap-12">
        <main className="flex-1 min-w-0">
          <Button asChild variant="outline" className="mb-8 group print:hidden">
            <Link href="/articulos">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Todos los Artículos
            </Link>
          </Button>

          <article className="space-y-8">
            <header className="space-y-4 border-b pb-6 text-center">
              <Badge variant="secondary" className="text-base capitalize">
                <Tag className="mr-1.5 h-4 w-4" /> {article.category}
              </Badge>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">{article.title}</h1>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{author?.displayName || 'Autor Desconocido'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(article.createdAt.toDate(), 'dd MMMM, yyyy', { locale: es })}</span>
                </div>
              </div>
            </header>

            <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-xl my-8">
              <Image
                src={imageUrl}
                alt={`Portada de ${article.title}`}
                layout="fill"
                objectFit="cover"
                priority
                data-ai-hint="article cover"
              />
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap">
              {article.contentBlocks.map(renderContentBlock)}
            </div>

            <footer className="pt-8 border-t">
               <div className="bg-card p-6 rounded-lg shadow-sm text-center">
                  <h3 className="font-headline text-xl font-semibold text-primary mb-3">¿Tienes preguntas sobre este artículo?</h3>
                  <p className="text-muted-foreground mb-4">
                      Contacta al autor para más información o para colaborar.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-lg">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <a href={`mailto:${author?.email || 'contacto.tcu.tropical@ucr.ac.cr'}`} className="text-foreground hover:text-primary hover:underline">
                          {author?.email || 'contacto.tcu.tropical@ucr.ac.cr'}
                      </a>
                  </div>
               </div>
            </footer>
          </article>
        </main>
        <TableOfContents headings={headings} />
      </div>
    </>
  );
}

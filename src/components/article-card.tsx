
import type { FirestoreArticle } from '@/types/article';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Calendar, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Image as ImageKitImage } from '@imagekit/next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ArticleCardProps {
  article: FirestoreArticle;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const imageUrl = article.imageUrl || null;

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-xl">
      <Link href={`/anuncios/${article.id}`} className="block">
        {imageUrl && (
          <CardHeader className="p-0">
            <div className="aspect-video relative w-full overflow-hidden">
              <ImageKitImage
                src={imageUrl}
                alt={`Imagen para ${article.title}`}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
                data-ai-hint="announcement cover"
              />
            </div>
          </CardHeader>
        )}
        <CardContent className="flex-grow p-5 space-y-3">
          <CardTitle className="font-headline text-xl">
            {article.title}
          </CardTitle>
          <CardDescription className="text-sm text-foreground/70 whitespace-pre-wrap">
            {article.description}
          </CardDescription>
        </CardContent>
      </Link>
      <CardFooter className="p-5 pt-0 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>{format(article.createdAt.toDate(), 'dd MMMM, yyyy', { locale: es })}</span>
          </div>
          {article.linkUrl && (
            <LinkIcon className="h-3 w-3 text-primary" title="Tiene un enlace externo" />
          )}
        </div>
        <Button asChild variant="link" className="px-0">
          <Link href={`/anuncios/${article.id}`}>
            Ver completo <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

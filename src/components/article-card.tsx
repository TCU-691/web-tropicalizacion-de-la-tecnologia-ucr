
import Link from 'next/link';
import type { FirestoreArticle } from '@/types/article';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Tag, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Image as ImageKitImage } from '@imagekit/next';

interface ArticleCardProps {
  article: FirestoreArticle;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const imageUrl = article.coverImageUrl || `https://placehold.co/1200x600.png?text=${encodeURIComponent(article.category)}`;

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-xl group">
      <CardHeader className="p-0">
        <Link href={`/articulos/${article.slug}`} className="block aspect-video relative w-full">
          <ImageKitImage
            src={imageUrl}
            alt={`Imagen para el artículo ${article.title}`}
            fill
            className="object-cover transform group-hover:scale-105 transition-transform duration-300"
            data-ai-hint="article cover"
          />
        </Link>
      </CardHeader>
      <CardContent className="flex-grow p-5 space-y-3">
        <Badge variant="secondary" className="text-xs font-normal mb-2 capitalize">
            <Tag className="mr-1.5 h-3 w-3" /> {article.category}
        </Badge>
        <CardTitle className="font-headline text-xl mb-1">
            <Link href={`/articulos/${article.slug}`} className="hover:text-primary transition-colors">
                {article.title}
            </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 text-sm text-foreground/70">{article.summary}</CardDescription>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex flex-col items-start gap-4">
        <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>{format(article.createdAt.toDate(), 'dd MMMM, yyyy', { locale: es })}</span>
            </div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/articulos/${article.slug}`}>
            Leer más <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

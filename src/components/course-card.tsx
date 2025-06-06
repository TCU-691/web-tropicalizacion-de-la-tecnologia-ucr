
import Link from 'next/link';
import type { FirestoreCourse } from '@/types/course';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Tag } from 'lucide-react';
import { Image as ImageKitImage } from '@imagekit/next'; // Using ImageKit's Image component

interface CourseCardProps {
  course: FirestoreCourse;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden transition-shadow duration-300 hover:shadow-xl group">
      <CardHeader className="p-0">
        <div className="aspect-video relative w-full">
          <ImageKitImage
            src={course.imagenUrl || "https://placehold.co/600x400.png"}
            alt={`Portada del curso ${course.titulo}`}
            layout="fill"
            objectFit="cover"
            className="transform group-hover:scale-105 transition-transform duration-300"
            data-ai-hint="course cover"
            // Removed loader prop as ImageKit handles its own loading
            // transformation={[{ height: 400, width: 600 }]} // Example transformation
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-5 space-y-3">
        <CardTitle className="font-headline text-xl mb-1">{course.titulo}</CardTitle>
        {course.categoria && (
          <Badge variant="secondary" className="text-xs font-normal">
             <Tag className="mr-1.5 h-3 w-3" /> {course.categoria}
          </Badge>
        )}
        <CardDescription className="line-clamp-3 text-sm text-foreground/70">{course.descripcion}</CardDescription>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button asChild variant="default" className="w-full">
          <Link href={`/cursos-publicos/${course.id}`}>
            Ver curso <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

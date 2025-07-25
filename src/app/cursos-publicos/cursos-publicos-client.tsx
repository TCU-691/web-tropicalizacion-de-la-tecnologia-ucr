
'use client';

import { useState, useEffect } from 'react';
import { CourseCard } from '@/components/course-card';
import type { FirestoreCourse } from '@/types/course';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ListFilter, Search, BookOpen, Loader2 } from 'lucide-react';

export const revalidate = 0;

interface CursosPublicosClientPageProps {
  initialCourses: FirestoreCourse[];
}

export function CursosPublicosClientPage({ initialCourses }: CursosPublicosClientPageProps) {
  const [courses, setCourses] = useState<FirestoreCourse[]>(initialCourses);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false); // For potential future client-side refetches

  useEffect(() => {
    setCourses(initialCourses); // Set courses when initialCourses prop changes
  }, [initialCourses]);
  
  const allCategories = Array.from(new Set(initialCourses.map(c => c.categoria).filter(Boolean)));

  const filteredCourses = courses.filter(course => {
    const matchesSearchTerm = course.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (course.descripcion && course.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || course.categoria === selectedCategory;
    return matchesSearchTerm && matchesCategory;
  });

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-primary/5 rounded-lg shadow-sm">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Cursos Públicos</h1>
        <p className="mt-3 text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto">
          Explora contenido educativo abierto creado por estudiantes y profesores del TCU TC-691.
        </p>
      </section>

      <section className="sticky top-[calc(theme(spacing.16)_+_1px)] md:top-[calc(theme(spacing.16)_+_1px)] z-40 bg-background/90 backdrop-blur-md py-4 rounded-b-lg shadow-md -mx-4 px-4 md:-mx-0 md:px-0">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center p-4 border rounded-lg bg-card shadow">
            <div className="relative w-full md:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar cursos por nombre o descripción..."
                className="pl-10 w-full text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar cursos"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[220px] text-base">
                  <ListFilter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category!}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchTerm || selectedCategory !== 'all') && (
                <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }} className="text-base">
                  Limpiar
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 text-right">
            Mostrando {filteredCourses.length} de {courses.length} cursos aprobados.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
            <h3 className="font-headline text-2xl text-muted-foreground">No se encontraron cursos aprobados</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Intenta ajustar tu búsqueda o filtros, o vuelve más tarde para ver nuevo contenido.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

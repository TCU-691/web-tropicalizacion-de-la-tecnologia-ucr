'use client';

import { useState } from 'react';
import { ProjectCard } from '@/components/project-card';
import { projectsData, type Project } from '@/lib/projects-data';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ListFilter, Search } from 'lucide-react';

const allCategories = Array.from(new Set(projectsData.map(p => p.category).filter(Boolean)));

export default function ProyectosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredProjects = projectsData.filter(project => {
    const matchesSearchTerm = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
    return matchesSearchTerm && matchesCategory;
  });

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-primary/5 rounded-lg">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Nuestros Proyectos</h1>
        <p className="mt-3 text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto">
          Explora la diversidad de iniciativas que conforman el TCU TC-691 "Tropicalización de la Tecnología".
        </p>
      </section>

      {/* Filter Bar */}
      <section className="sticky top-16 z-40 bg-background/80 backdrop-blur-md py-4 rounded-lg shadow">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center p-4 border rounded-lg bg-card">
            <div className="relative w-full md:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar proyectos..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
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
                <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-right">Mostrando {filteredProjects.length} de {projectsData.length} proyectos.</p>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="container mx-auto px-4">
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-headline text-2xl text-muted-foreground">No se encontraron proyectos</h3>
            <p className="text-muted-foreground mt-2">Intenta ajustar tu búsqueda o filtros.</p>
          </div>
        )}
      </section>
    </div>
  );
}

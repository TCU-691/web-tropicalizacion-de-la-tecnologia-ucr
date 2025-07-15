
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Eye, Trash2, Tag, Loader2, Link as LinkIcon, GitMerge } from 'lucide-react';
import type { FirestoreProject } from '@/types/project';

interface ProjectAdminCardProps {
  project: FirestoreProject;
  onDelete: (id: string) => void;
  isSubProject?: boolean;
}

export function ProjectAdminCard({ project, onDelete, isSubProject = false }: ProjectAdminCardProps) {
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeleteButtonDisabled = deleteInput.toLowerCase() !== 'borrar';

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete(project.id);
  };

  return (
    <Card className={`flex flex-col h-full overflow-hidden shadow-md transition-shadow hover:shadow-xl ${isSubProject ? 'bg-muted/30 border-dashed' : ''}`}>
      <CardHeader className="p-0">
        <div className="aspect-video relative w-full">
          <Image
            src={project.coverImageUrl}
            alt={`Portada de ${project.name}`}
            layout="fill"
            objectFit="cover"
            data-ai-hint="project cover"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 space-y-2">
        <CardTitle className="font-headline text-lg line-clamp-1">{project.name}</CardTitle>
        {project.category && (
          <Badge variant="secondary" className="font-normal">
            <Tag className="mr-1.5 h-3 w-3" /> {project.category}
          </Badge>
        )}
        <CardDescription className="line-clamp-2 text-sm">{project.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/profesor/panel-proyectos/editar/${project.id}`}>
                <Edit className="mr-1 md:mr-2 h-4 w-4" />
                <span className="hidden md:inline">Editar</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/proyectos/${project.slug}`} target="_blank">
                <Eye className="mr-1 md:mr-2 h-4 w-4" />
                <span className="hidden md:inline">Ver</span>
              </Link>
            </Button>
        </div>
        {!isSubProject && (
             <Button asChild variant="default" size="sm" className="col-span-2 flex-1">
              <Link href={`/profesor/panel-proyectos/crear?parentId=${project.id}`}>
                <GitMerge className="mr-1 md:mr-2 h-4 w-4" />Crear subproyecto
              </Link>
            </Button>
        )}
        <div className="col-span-2">
            <AlertDialog onOpenChange={() => setDeleteInput('')}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                  <Trash2 className="mr-1 md:mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Eliminar</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de que deseas eliminar este {isSubProject ? 'sub' : ''}proyecto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer y eliminará permanentemente el proyecto. Para confirmar, escribe
                    <strong className="text-destructive mx-1">borrar</strong> en el campo siguiente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-2">
                  <Label htmlFor={`delete-confirm-${project.id}`} className="sr-only">Confirmar borrado</Label>
                  <Input
                    id={`delete-confirm-${project.id}`}
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="Escribe 'borrar' para confirmar"
                    autoComplete="off"
                    className="border-primary focus-visible:ring-primary"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleteButtonDisabled || isDeleting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" /> : `Sí, eliminar`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}

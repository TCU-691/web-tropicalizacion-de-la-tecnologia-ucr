
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
import { Edit, Eye, Trash2, Loader2, Calendar } from 'lucide-react';
import type { FirestoreTour } from '@/types/tour';

interface TourAdminCardProps {
  tour: FirestoreTour;
  onDelete: (id: string) => void;
}

export function TourAdminCard({ tour, onDelete }: TourAdminCardProps) {
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeleteButtonDisabled = deleteInput.toLowerCase() !== 'borrar';

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete(tour.id);
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-md transition-shadow hover:shadow-xl">
      <CardHeader className="p-0">
        <div className="aspect-video relative w-full">
          <Image
            src={tour.imageUrl}
            alt={`Portada de ${tour.title}`}
            layout="fill"
            objectFit="cover"
            data-ai-hint="tour cover"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 space-y-2">
        <CardTitle className="font-headline text-lg line-clamp-1">{tour.title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4"/> <span>{tour.date}</span>
        </div>
        <CardDescription>
            <Badge variant={tour.status === 'Realizada' ? 'outline' : 'secondary'}>{tour.status}</Badge>
        </CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/profesor/panel-giras/editar/${tour.id}`}>
            <Edit className="mr-2 h-4 w-4" />Editar
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/giras/${tour.slug}`} target="_blank">
            <Eye className="mr-2 h-4 w-4" />Ver
          </Link>
        </Button>
        <div className="col-span-2">
            <AlertDialog onOpenChange={() => setDeleteInput('')}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de que deseas eliminar esta gira?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer y eliminará permanentemente la gira. Para confirmar, escribe
                    <strong className="text-destructive mx-1">borrar</strong> en el campo siguiente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-2">
                  <Label htmlFor={`delete-confirm-${tour.id}`} className="sr-only">Confirmar borrado</Label>
                  <Input
                    id={`delete-confirm-${tour.id}`}
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

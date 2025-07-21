
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';

function UnauthorizedClient() {
  const searchParams = useSearchParams();
  const page = searchParams.get('page');

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-20rem)] py-12">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-6" />
          <CardTitle className="font-headline text-3xl text-destructive">Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-lg text-muted-foreground mb-8">
            No tienes los permisos necesarios para acceder
            {page ? ` a la página "${page}"` : ' a esta página'}.
            Si crees que esto es un error, por favor contacta al administrador.
          </CardDescription>
          <Button asChild size="lg">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-20rem)] py-12">Cargando...</div>}>
      <UnauthorizedClient />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const resetSchema = z.object({
  email: z.string().trim().email('Por favor ingresa un correo válido.'),
});

export default function PasswordRecoveryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(data: z.infer<typeof resetSchema>) {
    setError(null);
    setIsLoading(true);
    try {
      if (!auth) {
        setError('No se pudo conectar con el servicio de autenticación. Intenta de nuevo más tarde.');
        return;
      }
      auth.languageCode = 'es';
      // Basado en
      // https://firebase.google.com/docs/auth/web/manage-users#send_a_password_reset_email
      await sendPasswordResetEmail(auth, data.email);
      setSent(true);
    } catch (caught) {
      // Keep the response identical when Firebase reports an unknown account.
      if (caught instanceof FirebaseError && (caught.code === 'auth/user-not-found' || caught.code === 'auth/user-disabled')) {
        setSent(true);
      } else if (caught instanceof FirebaseError && caught.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera un momento antes de volver a intentarlo.');
      } else {
        setError('No se pudo enviar la solicitud. Revisa tu conexión e intenta de nuevo más tarde.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-20rem)] py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Recuperar contraseña</CardTitle>
          <CardDescription>Ingresa tu correo para solicitar un enlace de recuperación.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {sent ? (
            <div role="status" className="space-y-3 text-sm">
              <p>Si existe una cuenta que permite recuperar la contraseña con ese correo, recibirás un enlace para cambiarla. Revisa también la carpeta de spam.</p>
              <Button variant="outline" onClick={() => setSent(false)}>Usar otro correo</Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" autoCapitalize="none" placeholder="tu@correo.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </Button>
              </form>
            </Form>
          )}
          <p className="text-sm text-muted-foreground">Si te registraste con Google, puedes ingresar con el botón de Google.</p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="link" asChild><Link href="/login">Volver a iniciar sesión</Link></Button>
        </CardFooter>
      </Card>
    </div>
  );
}

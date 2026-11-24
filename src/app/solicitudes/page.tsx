'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { applicationRequestSchema, newApplicationRequestId, submitApplicationRequest } from '@/lib/application-requests';
import { ApplicationRequestsPanel } from '@/components/application-requests-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function ApplicationRequestsPage() {
  const { currentUser, loading } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const pendingId = useRef<{ uid: string; id: string } | null>(null);
  const form = useForm<z.infer<typeof applicationRequestSchema>>({
    resolver: zodResolver(applicationRequestSchema),
    defaultValues: { category: 'feature', title: '', description: '' },
  });

  async function submit(data: z.infer<typeof applicationRequestSchema>) {
    if (!currentUser) return;
    setError('');
    setSuccess(false);
    try {
      if (!pendingId.current || pendingId.current.uid !== currentUser.uid) {
        pendingId.current = { uid: currentUser.uid, id: newApplicationRequestId() };
      }
      await submitApplicationRequest(pendingId.current.id, currentUser.uid, data);
      pendingId.current = null;
      form.reset();
      setSuccess(true);
    } catch {
      setError('No se pudo confirmar el envío. Intenta de nuevo.');
    }
  }

  if (loading) return <p role="status" className="p-8">Cargando...</p>;
  if (!currentUser) return <div className="p-8"><Button asChild><Link href="/login">Inicia sesión para enviar solicitudes</Link></Button></div>;

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Card>
        <CardHeader><CardTitle>Sugerencias y reportes de la aplicación</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p>Comparte una mejora o describe un error. Para los errores, incluye los pasos para reproducirlo y qué esperabas que ocurriera.</p>
          {error && <p role="alert" className="text-destructive">{error}</p>}
          {success && <p role="status">Tu solicitud fue enviada. Puedes seguir su estado abajo.</p>}
          {!db && <p role="alert">El servicio no está disponible. Intenta más tarde.</p>}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Tipo de solicitud</FormLabel><FormControl>
                  <select {...field} disabled={form.formState.isSubmitting || !db} className="block w-full rounded-md border bg-background p-2"><option value="feature">Idea de mejora</option><option value="bug">Reporte de error</option></select>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} maxLength={120} disabled={form.formState.isSubmitting || !db} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} rows={6} maxLength={3000} disabled={form.formState.isSubmitting || !db} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" disabled={form.formState.isSubmitting || !db}>{form.formState.isSubmitting ? 'Enviando...' : 'Enviar solicitud'}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <ApplicationRequestsPanel key={currentUser.uid} uid={currentUser.uid} />
    </div>
  );
}

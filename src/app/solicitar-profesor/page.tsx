'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { normalizeRole, PROFESSOR_ASSIGNABLE_ROLES, type AppRole } from '@/lib/roles';
import { ROLE_LABELS, submitTeacherRequest, type TeacherRequest } from '@/lib/teacher-requests';
import { RequestComments } from '@/components/request-comments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function TeacherRequestPage() {
  const { currentUser, userProfile, loading } = useAuth();
  const [request, setRequest] = useState<TeacherRequest | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reason, setReason] = useState('');
  const [requestedRole, setRequestedRole] = useState<AppRole>('profesor');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRequest(null);
    setError('');
    setFetching(true);
    setLoadFailed(false);
    if (!currentUser || !db) {
      setFetching(false);
      return;
    }
    return onSnapshot(doc(db, 'teacherRequests', currentUser.uid), snapshot => {
      setLoadFailed(false);
      setRequest(snapshot.exists() ? snapshot.data() as TeacherRequest : null);
      setFetching(false);
    }, () => {
      setLoadFailed(true);
      setError('No se pudo cargar tu solicitud. Intenta de nuevo más tarde.');
      setFetching(false);
    });
  }, [currentUser]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setError('');
    try {
      await submitTeacherRequest(currentUser.uid, reason, requestedRole);
      setRequest({ uid: currentUser.uid, reason: reason.trim(), requestedRole, status: 'pending' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo enviar la solicitud.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status" className="p-8">Cargando...</p>;
  if (!currentUser) return <div className="p-8"><Button asChild><Link href="/login">Inicia sesión para solicitar un rol</Link></Button></div>;

  return (
    <div className="container max-w-xl py-8">
      <Card>
        <CardHeader><CardTitle>Solicitar un rol</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {error && <p role="alert" className="text-destructive">{error}</p>}
          {!db ? <p>El servicio no está disponible. Intenta más tarde.</p> : fetching ? <p role="status">Cargando solicitud...</p> : request ? (
            <div role="status" className="space-y-3">
              <p>Rol solicitado: {ROLE_LABELS[request.requestedRole ?? 'profesor']}</p>
              <p>{request.status === 'pending' ? 'Tu solicitud está pendiente de revisión por un profesor.' : request.status === 'approved' ? 'Tu solicitud fue aprobada. Vuelve a iniciar sesión para actualizar tus permisos.' : 'Tu solicitud fue rechazada. Contacta al equipo del TCU si necesitas más información.'}</p>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{request.reason}</p>
              <RequestComments requestCollection="teacherRequests" requestId={currentUser.uid} />
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p>Selecciona el rol que necesitas y explica tu vínculo con el TCU. Un profesor revisará tu solicitud.</p>
              <Label htmlFor="requested-role">Rol solicitado</Label>
              <select id="requested-role" className="block w-full rounded-md border bg-background p-2" value={requestedRole} onChange={event => setRequestedRole(event.target.value as AppRole)} disabled={saving}>
                {PROFESSOR_ASSIGNABLE_ROLES.map(role => <option key={role} value={role} disabled={role === normalizeRole(userProfile?.rol)}>{ROLE_LABELS[role]}</option>)}
              </select>
              <Label htmlFor="reason">Motivo de la solicitud</Label>
              <Textarea id="reason" value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={1000} required disabled={saving || loadFailed || !userProfile} />
              <Button type="submit" disabled={saving || loadFailed || !userProfile || requestedRole === normalizeRole(userProfile.rol) || reason.trim().length < 10}>{saving ? 'Enviando...' : 'Enviar solicitud'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

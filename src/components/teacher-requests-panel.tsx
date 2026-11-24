'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ROLE_LABELS, reviewTeacherRequest, type TeacherRequest } from '@/lib/teacher-requests';
import { RequestComments } from '@/components/request-comments';
import type { UserProfile } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TeacherRequestsPanel({ actorUid, users }: { actorUid: string; users: UserProfile[] }) {
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  useEffect(() => {
    setLoading(true);
    setError('');
    if (!db) {
      setError('El servicio no está disponible.');
      setLoading(false);
      return;
    }
    const source = collection(db, 'teacherRequests');
    const requestsQuery = filter === 'all' ? query(source) : query(source, where('status', '==', filter));
    return onSnapshot(requestsQuery, snapshot => {
      setRequests(snapshot.docs.map(item => ({ ...item.data(), uid: item.id } as TeacherRequest)));
      setLoading(false);
    }, () => {
      setError('No se pudieron cargar las solicitudes.');
      setLoading(false);
    });
  }, [filter]);

  async function review(uid: string, status: 'approved' | 'rejected') {
    setBusy(uid);
    setError('');
    try {
      await reviewTeacherRequest(actorUid, uid, status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo revisar la solicitud.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Solicitudes de roles</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <label className="block text-sm font-medium">Filtrar por estado
          <select className="mt-2 block w-full rounded-md border bg-background p-2" value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {loading ? <p role="status">Cargando solicitudes...</p> : requests.length === 0 && !error ? <p>No hay solicitudes para este filtro.</p> : requests.map(request => {
          const user = users.find(item => item.uid === request.uid);
          return (
            <div key={request.uid} className="rounded-md border p-4 space-y-3">
              <p className="font-medium">{user?.displayName || user?.email || request.uid}</p>
              {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
              <p className="whitespace-pre-wrap break-words">{request.reason}</p>
              <p>Rol solicitado: {ROLE_LABELS[request.requestedRole ?? 'profesor']}</p>
              <p>Estado: {request.status === 'pending' ? 'Pendiente' : request.status === 'approved' ? 'Aprobada' : 'Rechazada'}</p>
              {request.status === 'pending' && <div className="flex flex-wrap gap-2">
                <Button disabled={busy !== null || request.uid === actorUid} onClick={() => review(request.uid, 'approved')}>Aprobar como {ROLE_LABELS[request.requestedRole ?? 'profesor']}</Button>
                <Button variant="outline" disabled={busy !== null || request.uid === actorUid} onClick={() => review(request.uid, 'rejected')}>Rechazar solicitud</Button>
              </div>}
              <RequestComments requestCollection="teacherRequests" requestId={request.uid} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

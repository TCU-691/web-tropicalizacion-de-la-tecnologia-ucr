'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { REQUEST_STATUSES, updateApplicationRequestStatus, type ApplicationRequest, type RequestStatus } from '@/lib/application-requests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { UserProfile } from '@/types/user';
import { RequestComments } from '@/components/request-comments';

export function ApplicationRequestsPanel({ uid, review = false, users = [] }: { uid: string; review?: boolean; users?: UserProfile[] }) {
  const [requests, setRequests] = useState<ApplicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    setRequests([]);
    setLoading(true);
    setLoadError('');
    if (!db) {
      setLoadError('El servicio no está disponible.');
      setLoading(false);
      return;
    }
    const source = collection(db, 'applicationRequests');
    const requestsQuery = review ? query(source) : query(source, where('uid', '==', uid));
    return onSnapshot(requestsQuery, snapshot => {
      setRequests(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as ApplicationRequest)));
      setLoading(false);
      setLoadError('');
    }, () => {
      setRequests([]);
      setLoadError('No se pudieron cargar las solicitudes.');
      setLoading(false);
    });
  }, [uid, review]);

  async function changeStatus(id: string, status: RequestStatus) {
    setBusy(true);
    setUpdateError('');
    try {
      await updateApplicationRequestStatus(uid, id, status);
    } catch {
      setUpdateError('No se pudo actualizar la solicitud. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const filtered = requests.filter(item => filter === 'all' || item.status === filter);
  return (
    <Card>
      <CardHeader><CardTitle>{review ? 'Solicitudes de la aplicación' : 'Mis solicitudes'}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <label className="block text-sm font-medium">Filtrar por estado
          <select className="mt-2 block w-full rounded-md border bg-background p-2" value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="all">Todos los estados</option>
            {Object.entries(REQUEST_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {(loadError || updateError) && <p role="alert" className="text-destructive">{loadError || updateError}</p>}
        {loading ? <p role="status">Cargando solicitudes...</p> : filtered.length === 0 && !loadError ? <p>No hay solicitudes para este filtro.</p> : filtered.map(item => {
          const user = users.find(user => user.uid === item.uid);
          return (
            <article key={item.id} className="rounded-md border p-4 space-y-3">
              <div className="flex flex-wrap gap-2"><Badge variant="outline">{item.category === 'bug' ? 'Reporte de error' : 'Idea de mejora'}</Badge><Badge>{REQUEST_STATUSES[item.status]}</Badge></div>
              <h3 className="font-semibold break-words">{item.title}</h3>
              {review && <p className="text-sm text-muted-foreground">{user?.displayName || user?.email || item.uid}</p>}
              <p className="whitespace-pre-wrap break-words">{item.description}</p>
              {review && <label className="block text-sm font-medium">Estado de «{item.title}»
                <select className="mt-2 block w-full rounded-md border bg-background p-2" value={item.status} disabled={busy} onChange={event => changeStatus(item.id, event.target.value as RequestStatus)}>
                  {Object.entries(REQUEST_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>}
              <RequestComments requestCollection="applicationRequests" requestId={item.id} />
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}

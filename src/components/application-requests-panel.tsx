'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { REQUEST_STATUSES, updateApplicationRequestStatus, type ApplicationRequest, type RequestStatus } from '@/lib/application-requests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UserProfile } from '@/types/user';
import { RequestComments } from '@/components/request-comments';
import { RequestHelp } from '@/components/request-help';

const GROUP_STATUSES = {
  open: ['pending', 'in_progress'],
  closed: ['resolved', 'declined'],
} satisfies Record<string, RequestStatus[]>;

const CATEGORY_LABELS = { bug: 'Reporte de error', feature: 'Idea de mejora' };
const dateFormatter = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'America/Costa_Rica' });
const selectClassName = 'mt-2 block w-full rounded-md border bg-background p-2';

function RequestDate({ date }: { date: ApplicationRequest['createdAt'] }) {
  if (!date) return <span className="text-muted-foreground">Sin fecha</span>;
  const value = date.toDate();
  return <time dateTime={value.toISOString()}>{dateFormatter.format(value)}</time>;
}

export function ApplicationRequestsPanel({ uid, review = false, users = [] }: { uid: string; review?: boolean; users?: UserProfile[] }) {
  const [requests, setRequests] = useState<ApplicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState<keyof typeof GROUP_STATUSES>('open');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const openButton = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
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

  const selected = requests.find(item => item.id === selectedId);
  const usersById = new Map(users.map(user => [user.uid, user]));
  function requesterName(request: ApplicationRequest) {
    const user = usersById.get(request.uid);
    return user?.displayName || user?.email || request.uid;
  }

  const searchTerm = search.trim().toLocaleLowerCase('es-CR');
  const visibleStatuses: RequestStatus[] = GROUP_STATUSES[group];
  const filtered = requests.filter(item =>
    visibleStatuses.includes(item.status) &&
    (statusFilter === 'all' || item.status === statusFilter) &&
    (categoryFilter === 'all' || item.category === categoryFilter) &&
    (item.title.toLocaleLowerCase('es-CR').includes(searchTerm) ||
      (review && requesterName(item).toLocaleLowerCase('es-CR').includes(searchTerm))),
  ).sort((a, b) =>
    (b.createdAt?.toMillis() ?? Number.MIN_SAFE_INTEGER) - (a.createdAt?.toMillis() ?? Number.MIN_SAFE_INTEGER),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{review ? 'Solicitudes de la aplicación' : 'Mis solicitudes'}</CardTitle>
          <RequestHelp label={review ? 'Ayuda sobre sugerencias y reportes de errores' : 'Ayuda sobre el seguimiento de mis solicitudes'}>
            {review ? (
              <p>Esta bandeja reúne las mejoras que proponen los usuarios y los errores que encuentran en la plataforma. Abre una solicitud para leerla, responder con un comentario o actualizar su estado. Las resueltas y descartadas pasan a Cerradas.</p>
            ) : (
              <p>Esta tabla muestra las sugerencias y los reportes que has enviado. Busca o filtra las solicitudes y pulsa un título para ver el detalle o comentar. En Cerradas puedes consultar las resueltas y descartadas.</p>
            )}
          </RequestHelp>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={group} onValueChange={value => {
          setGroup(value as keyof typeof GROUP_STATUSES);
          setStatusFilter('all');
        }}>
          <TabsList aria-label="Solicitudes por estado">
            <TabsTrigger value="open">Abiertas</TabsTrigger>
            <TabsTrigger value="closed">Cerradas</TabsTrigger>
          </TabsList>
          <TabsContent key={group} value={group} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm font-medium">Buscar solicitudes
                <Input ref={searchInput} className="mt-2" value={search} onChange={event => setSearch(event.target.value)} placeholder={review ? 'Título o solicitante' : 'Título'} />
              </label>
              <label className="block text-sm font-medium">Estado
                <select className={selectClassName} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                  <option value="all">Todos los estados</option>
                  {visibleStatuses.map(status => <option key={status} value={status}>{REQUEST_STATUSES[status]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Tipo
                <select className={selectClassName} value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
                  <option value="all">Todos los tipos</option>
                  {Object.entries(CATEGORY_LABELS).map(([category, label]) => <option key={category} value={category}>{label}</option>)}
                </select>
              </label>
            </div>
            {loadError ? <p role="alert" className="text-destructive">{loadError}</p> : loading ? (
              <p role="status">Cargando solicitudes...</p>
            ) : filtered.length === 0 ? (
              <p>No hay solicitudes para estos filtros.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solicitud</TableHead>
                      <TableHead>Tipo</TableHead>
                      {review && <TableHead>Solicitante</TableHead>}
                      <TableHead aria-sort="descending">Fecha de envío</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Button variant="link" className="h-auto whitespace-normal break-words p-0 text-left" onClick={event => {
                            openButton.current = event.currentTarget;
                            setUpdateError('');
                            setSelectedId(item.id);
                          }}>{item.title}</Button>
                        </TableCell>
                        <TableCell>{CATEGORY_LABELS[item.category]}</TableCell>
                        {review && <TableCell>{requesterName(item)}</TableCell>}
                        <TableCell className="whitespace-nowrap"><RequestDate date={item.createdAt} /></TableCell>
                        <TableCell><Badge variant="outline" className="whitespace-nowrap">{REQUEST_STATUSES[item.status]}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelectedId(null); }}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl" onCloseAutoFocus={event => {
            event.preventDefault();
            const target = openButton.current?.isConnected ? openButton.current : searchInput.current;
            target?.focus();
          }}>
            {selected && <>
              <DialogHeader>
                <DialogTitle className="break-words pr-5">{selected.title}</DialogTitle>
                <DialogDescription>
                  {CATEGORY_LABELS[selected.category]} · <RequestDate date={selected.createdAt} />
                  {review && <> · {requesterName(selected)}</>}
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap break-words">{selected.description}</p>
              {review ? (
                <label className="block text-sm font-medium">Estado de la solicitud
                  <select className={selectClassName} value={selected.status} disabled={busy} onChange={event => changeStatus(selected.id, event.target.value as RequestStatus)}>
                    {Object.entries(REQUEST_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              ) : <Badge variant="outline" className="w-fit">{REQUEST_STATUSES[selected.status]}</Badge>}
              {updateError && <p role="alert" className="text-destructive">{updateError}</p>}
              <RequestComments key={selected.id} requestCollection="applicationRequests" requestId={selected.id} />
            </>}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

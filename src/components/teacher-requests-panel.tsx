'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PROFESSOR_ASSIGNABLE_ROLES, type AppRole } from '@/lib/roles';
import { ROLE_LABELS, ROLE_REQUEST_STATUSES, reviewTeacherRequest, saveTeacherRequest, withdrawTeacherRequest, type TeacherRequest } from '@/lib/teacher-requests';
import type { UserProfile } from '@/types/user';
import { RequestComments } from '@/components/request-comments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const dateFormatter = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'America/Costa_Rica' });
const CLOSED_STATUSES = ['approved', 'rejected', 'withdrawn'] as const;

export function TeacherRequestsPanel({ actorUid, review = true, users = [], currentRole }: {
  actorUid: string;
  review?: boolean;
  users?: UserProfile[];
  currentRole?: AppRole;
}) {
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState('open');
  const [closedStatus, setClosedStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const [reason, setReason] = useState('');
  const [requestedRole, setRequestedRole] = useState<AppRole | ''>('');
  const openButton = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!db) {
      setLoadError('El servicio no está disponible.');
      setLoading(false);
      return;
    }

    const source = collection(db, 'teacherRequests');
    const requestsQuery = review ? query(source) : query(source, where('uid', '==', actorUid));
    return onSnapshot(requestsQuery, snapshot => {
      setRequests(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as TeacherRequest)));
      setLoading(false);
      setLoadError('');
    }, () => {
      setRequests([]);
      setLoadError('No se pudieron cargar las solicitudes de rol.');
      setLoading(false);
    });
  }, [actorUid, review]);

  const pending = requests.find(request => request.status === 'pending');
  const selected = requests.find(request => request.id === selectedId);
  const canEdit = !review && selected?.status === 'pending';
  const dialogOpen = !!selected || (editing && !selectedId && !review);
  const usersById = new Map(users.map(user => [user.uid, user]));

  function requesterName(request: TeacherRequest) {
    const user = usersById.get(request.uid);
    return user?.displayName || user?.email || request.uid;
  }

  const searchTerm = search.trim().toLocaleLowerCase('es-CR');
  const filtered = requests.filter(request =>
    (group === 'open'
      ? request.status === 'pending'
      : request.status !== 'pending' && (closedStatus === 'all' || request.status === closedStatus)) &&
    (ROLE_LABELS[request.requestedRole ?? 'profesor'].toLocaleLowerCase('es-CR').includes(searchTerm) ||
      (review && requesterName(request).toLocaleLowerCase('es-CR').includes(searchTerm))),
  ).sort((a, b) =>
    (b.createdAt?.toMillis() ?? Number.MIN_SAFE_INTEGER) - (a.createdAt?.toMillis() ?? Number.MIN_SAFE_INTEGER),
  );

  function closeDialog() {
    setSelectedId(null);
    setEditing(false);
    setConfirmWithdrawal(false);
    setActionError('');
  }

  function startEditing(request?: TeacherRequest) {
    setRequestedRole(request ? request.requestedRole ?? 'profesor' : '');
    setReason(request?.reason ?? '');
    setActionError('');
    setEditing(true);
  }

  async function runAction(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo guardar el cambio.');
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestedRole || (selectedId ? !canEdit : pending)) return;
    void runAction(async () => {
      await saveTeacherRequest(actorUid, reason, requestedRole, selectedId ?? undefined);
      if (selectedId) setEditing(false);
      else {
        setGroup('open');
        setSearch('');
        closeDialog();
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>{review ? 'Solicitudes de roles' : 'Mis solicitudes de cambio de rol'}</CardTitle>
        {!review && (
          <Button disabled={loading || !!loadError || !currentRole} onClick={event => {
            openButton.current = event.currentTarget;
            if (pending) setSelectedId(pending.id);
            else startEditing();
          }}>{pending ? 'Ver solicitud abierta' : 'Nueva solicitud'}</Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={group} onValueChange={setGroup}>
          <TabsList aria-label="Solicitudes de rol por estado" className="h-auto flex-wrap justify-start">
            <TabsTrigger value="open">Abiertas</TabsTrigger>
            <TabsTrigger value="closed">Cerradas</TabsTrigger>
          </TabsList>
          <TabsContent key={group} value={group} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input ref={searchInput} aria-label="Buscar solicitudes de rol" value={search} onChange={event => setSearch(event.target.value)}
                placeholder={review ? 'Buscar por rol o solicitante' : 'Buscar por rol'} className="max-w-sm" />
              {group === 'closed' && (
                <select aria-label="Filtrar solicitudes cerradas por estado" className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={closedStatus} onChange={event => setClosedStatus(event.target.value)}>
                  <option value="all">Todos los estados</option>
                  {CLOSED_STATUSES.map(status => <option key={status} value={status}>{ROLE_REQUEST_STATUSES[status]}</option>)}
                </select>
              )}
            </div>
            {loadError ? <p role="alert" className="text-destructive">{loadError}</p> : loading ? (
              <p role="status">Cargando solicitudes...</p>
            ) : filtered.length === 0 ? (
              <p>No hay solicitudes para este filtro.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rol solicitado</TableHead>
                      {review && <TableHead>Solicitante</TableHead>}
                      <TableHead aria-sort="descending">Fecha de envío</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(request => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Button variant="link" className="h-auto p-0" onClick={event => {
                            openButton.current = event.currentTarget;
                            setSelectedId(request.id);
                          }}>{ROLE_LABELS[request.requestedRole ?? 'profesor']}</Button>
                        </TableCell>
                        {review && <TableCell>{requesterName(request)}</TableCell>}
                        <TableCell className="whitespace-nowrap">{request.createdAt
                          ? <time dateTime={request.createdAt.toDate().toISOString()}>{dateFormatter.format(request.createdAt.toDate())}</time>
                          : 'Sin fecha'}</TableCell>
                        <TableCell><Badge variant="outline">{ROLE_REQUEST_STATUSES[request.status]}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open && !busy) closeDialog(); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl" onCloseAutoFocus={event => {
          event.preventDefault();
          (openButton.current?.isConnected ? openButton.current : searchInput.current)?.focus();
        }}>
          <DialogHeader>
            <DialogTitle>{selected ? `Solicitud de rol · ${ROLE_LABELS[selected.requestedRole ?? 'profesor']}` : 'Solicitar cambio de rol'}</DialogTitle>
            <DialogDescription>
              {selected ? `${ROLE_REQUEST_STATUSES[selected.status]}${review ? ` · ${requesterName(selected)}` : ''}` : 'Selecciona un rol y explica por qué necesitas el cambio.'}
            </DialogDescription>
          </DialogHeader>
          {actionError && <p role="alert" className="text-destructive">{actionError}</p>}
          {editing && (canEdit || !selectedId) ? (
            <form onSubmit={save} className="space-y-4">
              <label className="block text-sm font-medium">Rol solicitado
                <select className="mt-2 block w-full rounded-md border bg-background p-2" value={requestedRole} required disabled={busy}
                  onChange={event => setRequestedRole(event.target.value as AppRole | '')}>
                  <option value="" disabled>Selecciona un rol</option>
                  {PROFESSOR_ASSIGNABLE_ROLES.map(role => <option key={role} value={role} disabled={role === currentRole}>{ROLE_LABELS[role]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Motivo de la solicitud
                <Textarea className="mt-2" value={reason} onChange={event => setReason(event.target.value)}
                  minLength={10} maxLength={1000} required disabled={busy} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy || !requestedRole || requestedRole === currentRole || reason.trim().length < 10}>
                  {busy ? 'Guardando...' : selected ? 'Guardar cambios' : 'Enviar solicitud'}
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => selected ? setEditing(false) : closeDialog()}>Cancelar</Button>
              </div>
            </form>
          ) : selected && (
            <>
              <p className="whitespace-pre-wrap break-words">{selected.reason}</p>
              {canEdit && (confirmWithdrawal ? (
                <div className="space-y-2">
                  <p>Al retirar esta solicitud podrás enviar una nueva.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive" disabled={busy} onClick={() => runAction(async () => {
                      await withdrawTeacherRequest(actorUid, selected.id);
                      closeDialog();
                    })}>Confirmar retiro</Button>
                    <Button variant="outline" disabled={busy} onClick={() => setConfirmWithdrawal(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={busy || !currentRole} onClick={() => startEditing(selected)}>Editar solicitud</Button>
                  <Button variant="outline" disabled={busy} onClick={() => setConfirmWithdrawal(true)}>Retirar solicitud</Button>
                </div>
              ))}
              {review && selected.status === 'pending' && selected.uid !== actorUid && (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => runAction(() => reviewTeacherRequest(actorUid, selected, 'approved'))}>Aprobar solicitud</Button>
                  <Button variant="outline" disabled={busy} onClick={() => runAction(() => reviewTeacherRequest(actorUid, selected, 'rejected'))}>Denegar solicitud</Button>
                </div>
              )}
              <RequestComments key={selected.id} requestCollection="teacherRequests" requestId={selected.id} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

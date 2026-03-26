'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { upload as imageKitUpload } from '@imagekit/next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays,
  Clock,
  Users,
  MessageSquare,
  FileUp,
  Send,
  Loader2,
  Trash2,
  FileText,
  Download,
  UserCircle,
  Copy,
  Check,
} from 'lucide-react';
import type { FirestoreTaskComment } from '@/types/task-comment';
import type { FirestoreTaskDocument } from '@/types/task-document';
import type { UserProfile } from '@/types/user';
import { normalizeRole } from '@/lib/roles';

export interface TaskDetailData {
  id: string;
  name: string;
  description: string;
  endDate: string; // ISO string or displayable date string
  hours: number;
  maxSlots: number;
  status: string;
  usedSlots: number;
  parentId: string;
}

interface TaskDetailDialogProps {
  task: TaskDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canModerateTask?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────
function assertDb(
  db: typeof import('@/lib/firebase').db
): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const authenticator = async () => {
  const response = await fetch('/api/upload-auth');
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with status ${response.status}: ${errorText}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
};

// ─── Component ────────────────────────────────────────────
export function TaskDetailDialog({ task, open, onOpenChange, canModerateTask = false }: TaskDetailDialogProps) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  // --- Participants ---
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);

  // --- Comments ---
  const [comments, setComments] = useState<FirestoreTaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // --- Documents ---
  const [documents, setDocuments] = useState<FirestoreTaskDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Copy emails function ──
  const handleCopyEmails = async () => {
    const emails = participants.map(p => p.email).filter(Boolean);
    if (emails.length === 0) {
      toast({ title: 'No hay correos para copiar', variant: 'destructive' });
      return;
    }

    const emailsText = emails.join('; ');
    try {
      await navigator.clipboard.writeText(emailsText);
      setCopiedEmails(true);
      toast({ title: `${emails.length} correo(s) copiado(s)` });
      setTimeout(() => setCopiedEmails(false), 2000);
    } catch (error) {
      console.error('Error copying emails:', error);
      toast({ title: 'Error al copiar correos', variant: 'destructive' });
    }
  };

  // Reset state when task changes
  useEffect(() => {
    if (!task) {
      setParticipants([]);
      setComments([]);
      setDocuments([]);
      setNewComment('');
      return;
    }
  }, [task]);

  // ── Fetch participants (assignments -> users) ──
  useEffect(() => {
    if (!task || !open || !db) return;
    setLoadingParticipants(true);

    const fetchParticipants = async () => {
      try {
        assertDb(db);
        const assignmentsSnap = await getDocs(
          query(collection(db, 'assignments'), where('taskId', '==', task.id))
        );

        const userIds = assignmentsSnap.docs.map((d) => d.data().userId as string);
        if (userIds.length === 0) {
          setParticipants([]);
          setLoadingParticipants(false);
          return;
        }

        // Fetch each user profile
        const userProfiles: UserProfile[] = [];
        for (const uid of userIds) {
          const userSnap = await getDocs(
            query(collection(db, 'users'), where('uid', '==', uid))
          );
          userSnap.docs.forEach((d) => userProfiles.push(d.data() as UserProfile));
        }
        setParticipants(userProfiles);
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [task, open]);

  const normalizedRole = normalizeRole(userProfile?.rol);
  const isProfesor = normalizedRole === 'profesor';
  const isAsistente = normalizedRole === 'asistente';
  const isLider = normalizedRole === 'lider';
  const canModerateByRole = isProfesor || isAsistente || (isLider && canModerateTask);
  const isAlumno = normalizedRole === 'alumno';
  // Alumnos that are assigned to the task can submit evidence; profs/admins/asistentes can view all
  const isAssignedAlumno = isAlumno && participants.some((p) => p.uid === currentUser?.uid);
  const canAccessEvidence = canModerateByRole || isAssignedAlumno;

  // ── Real-time comments listener ──
  // Profesores/admins/asistentes: ven todos los comentarios de la tarea
  // Alumnos asignados: solo ven sus propios comentarios
  useEffect(() => {
    if (!task || !open || !db || !canAccessEvidence || !currentUser) return;
    assertDb(db);

    let q;
    if (canModerateByRole) {
      q = query(
        collection(db, 'taskComments'),
        where('taskId', '==', task.id),
        orderBy('createdAt', 'asc')
      );
    } else {
      // Alumno: solo sus propios comentarios
      q = query(
        collection(db, 'taskComments'),
        where('taskId', '==', task.id),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreTaskComment))
      );
    });

    return () => unsubscribe();
  }, [task, open, canAccessEvidence, canModerateByRole, currentUser]);

  // ── Real-time documents listener ──
  // Profesores/admins: ven todos los documentos de la tarea
  // Alumnos asignados: ven todos los documentos de la tarea (no solo los suyos)
  useEffect(() => {
    if (!task || !open || !db || !canAccessEvidence || !currentUser) return;
    assertDb(db);

    // Todos (profesores, admins, asistentes y alumnos) ven todos los documentos
    const q = query(
      collection(db, 'taskDocuments'),
      where('taskId', '==', task.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setDocuments(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreTaskDocument))
      );
    });

    return () => unsubscribe();
  }, [task, open, canAccessEvidence, currentUser]);

  // ── Add comment ──
  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser || !userProfile || !task) return;
    setSubmittingComment(true);
    try {
      assertDb(db);
      await addDoc(collection(db, 'taskComments'), {
        taskId: task.id,
        userId: currentUser.uid,
        userName: userProfile.displayName || userProfile.email || 'Usuario',
        text: newComment.trim(),
        createdAt: Timestamp.now(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: 'Error al agregar comentario', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  // ── Delete comment ──
  const handleDeleteComment = async (commentId: string) => {
    try {
      assertDb(db);
      await deleteDoc(doc(db, 'taskComments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({ title: 'Error al eliminar comentario', variant: 'destructive' });
    }
  };

  // ── Upload document ──
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !userProfile || !task) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Archivo muy grande',
        description: 'El tamaño máximo permitido es 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingDoc(true);
    try {
      const authParams = await authenticator();
      const response = await imageKitUpload({
        file,
        fileName: file.name,
        ...authParams,
        folder: `/task-documents/${task.id}`,
        useUniqueFileName: true,
      });

      if (!response.url) throw new Error('No se obtuvo URL del archivo subido.');

      assertDb(db);
      await addDoc(collection(db, 'taskDocuments'), {
        taskId: task.id,
        userId: currentUser.uid,
        userName: userProfile.displayName || userProfile.email || 'Usuario',
        fileName: file.name,
        fileUrl: response.url,
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Documento subido', description: file.name });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error al subir documento',
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
        variant: 'destructive',
      });
    } finally {
      setUploadingDoc(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Delete document ──
  const handleDeleteDocument = async (docId: string) => {
    try {
      assertDb(db);
      await deleteDoc(doc(db, 'taskDocuments', docId));
      toast({ title: 'Documento eliminado' });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({ title: 'Error al eliminar documento', variant: 'destructive' });
    }
  };

  if (!task) return null;

  const endDate = new Date(task.endDate);
  const isOverdue = endDate < new Date() && task.status !== 'completada';
  const slotsPercentage = task.maxSlots > 0 ? (task.usedSlots / task.maxSlots) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{task.name}</DialogTitle>
            <Badge
              variant={
                task.status === 'completada'
                  ? 'default'
                  : task.status === 'en-progreso'
                  ? 'secondary'
                  : task.status === 'cancelada'
                  ? 'destructive'
                  : 'outline'
              }
            >
              {task.status}
            </Badge>
          </div>
          <DialogDescription>
            <div className="space-y-3 pt-2">
              <p className="text-sm text-foreground/80">{task.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                  <CalendarDays className="h-4 w-4" />
                  {endDate.toLocaleDateString('es-CR')}
                  {isOverdue && ' (Vencida)'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {task.hours}h estimadas
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {task.usedSlots}/{task.maxSlots} participantes
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(slotsPercentage, 100)}%` }}
                />
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Tabs defaultValue="participants" className="flex-1 min-h-0 flex flex-col">
          <TabsList className={`grid w-full ${canAccessEvidence ? 'grid-cols-3' : 'grid-cols-1'}`}>
            <TabsTrigger value="participants" className="text-xs sm:text-sm">
              <Users className="mr-1.5 h-4 w-4" />
              Participantes
            </TabsTrigger>
            {canAccessEvidence && (
              <TabsTrigger value="documents" className="text-xs sm:text-sm">
                <FileUp className="mr-1.5 h-4 w-4" />
                {canModerateByRole ? 'Evidencias' : 'Mi Evidencia'}
              </TabsTrigger>
            )}
            {canAccessEvidence && (
              <TabsTrigger value="comments" className="text-xs sm:text-sm">
                <MessageSquare className="mr-1.5 h-4 w-4" />
                {canModerateByRole ? 'Comentarios' : 'Mis Notas'}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Participants Tab ── */}
          <TabsContent value="participants" className="flex-1 min-h-0">
          <div className="flex flex-col h-[280px] gap-3">
            {/* Copy button */}
            {!loadingParticipants && participants.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyEmails}
                className="w-full"
              >
                {copiedEmails ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Correos copiados
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar correos ({participants.length})
                  </>
                )}
              </Button>
            )}

            <ScrollArea className="h-[280px] pr-3">
              {loadingParticipants ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : participants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <UserCircle className="h-10 w-10 mb-2" />
                  <p className="text-sm">No hay participantes asignados aún.</p>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  {participants.map((p) => (
                    <div
                      key={p.uid}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(p.displayName || p.email || '??')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.displayName || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {p.rol}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

          {/* ── Documents / Evidence Tab ── */}
          {canAccessEvidence && <TabsContent value="documents" className="flex-1 min-h-0">
            <div className="flex flex-col h-[280px]">
              {/* Upload area — alumnos suben evidencia, profes también pueden subir */}
              {currentUser && userProfile && (isAssignedAlumno || canModerateByRole) && (
                <div className="pb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleUploadDocument}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.jpg,.jpeg,.png,.webp"
                  />
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="mr-2 h-4 w-4" />
                    )}
                    {uploadingDoc ? 'Subiendo...' : 'Subir documento como evidencia'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Máximo 10MB. PDF, Word, Excel, imágenes, ZIP, etc.
                  </p>
                </div>
              )}

              {/* Document list */}
              <ScrollArea className="flex-1">
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-2" />
                    <p className="text-sm">
                      {canModerateByRole
                        ? 'Ningún alumno ha subido evidencia aún.'
                        : 'No has subido evidencia aún. ¡Sube tus documentos!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((d) => {
                      const createdAt = d.createdAt?.toDate
                        ? d.createdAt.toDate()
                        : new Date(d.createdAt as unknown as string);
                      const canDelete =
                        currentUser?.uid === d.userId ||
                        canModerateByRole;

                      return (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          <FileText className="h-8 w-8 text-primary/60 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{d.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {d.userName} · {createdAt.toLocaleDateString('es-CR')}{' '}
                              {createdAt.toLocaleTimeString('es-CR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                            >
                              <a
                                href={d.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Descargar"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDocument(d.id)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>}

          {/* ── Comments Tab ── */}
          {canAccessEvidence && <TabsContent value="comments" className="flex-1 min-h-0">
            <div className="flex flex-col h-[280px]">
              {/* Comments list */}
              <ScrollArea className="flex-1 pr-3">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mb-2" />
                    <p className="text-sm">
                      {canModerateByRole
                        ? 'Ningún alumno ha dejado comentarios aún.'
                        : 'No has dejado comentarios aún. ¡Describe tu avance!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {comments.map((c) => {
                      const createdAt = c.createdAt?.toDate
                        ? c.createdAt.toDate()
                        : new Date(c.createdAt as unknown as string);
                      const canDelete =
                        currentUser?.uid === c.userId ||
                        canModerateByRole;

                      return (
                        <div key={c.id} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {getInitials(c.userName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{c.userName}</span>
                              <span className="text-xs text-muted-foreground">
                                {createdAt.toLocaleDateString('es-CR')}{' '}
                                {createdAt.toLocaleTimeString('es-CR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteComment(c.id)}
                                title="Eliminar comentario"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 pl-8">{c.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Add comment — alumnos asignados y profes/admins */}
              {currentUser && userProfile && (isAssignedAlumno || canModerateByRole) && (
                <div className="pt-3 flex gap-2">
                  <Textarea
                    placeholder={canModerateByRole ? 'Escribe un comentario o retroalimentación...' : 'Describe tu avance o deja una nota...'}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[40px] max-h-[80px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="shrink-0"
                  >
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

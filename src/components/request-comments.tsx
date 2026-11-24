'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { normalizeRole } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface RequestComment {
  id: string;
  authorName: string;
  text: string;
  createdAt: Timestamp | null;
}

export function RequestComments({ requestCollection, requestId }: {
  requestCollection: 'teacherRequests' | 'applicationRequests';
  requestId: string;
}) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setComments([]);
    setLoading(true);
    setLoadError('');
    setText('');
    setSaveError('');
    if (!db || !currentUser) {
      setLoading(false);
      setLoadError('Inicia sesión para consultar los comentarios.');
      return;
    }
    const source = collection(db, requestCollection, requestId, 'comments');
    return onSnapshot(query(source, orderBy('createdAt', 'asc')), snapshot => {
      setComments(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as RequestComment)));
      setLoading(false);
      setLoadError('');
    }, () => {
      setLoading(false);
      setLoadError('No se pudieron cargar los comentarios.');
    });
  }, [requestCollection, requestId, currentUser]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const commentText = text.trim();
    if (!db || !currentUser || saving || !commentText || commentText.length > 2000) return;
    setSaving(true);
    setSaveError('');
    const commentRef = doc(collection(db, requestCollection, requestId, 'comments'));
    const requestRef = doc(db, requestCollection, requestId);
    const authorRef = doc(db, 'users', currentUser.uid);
    try {
      await runTransaction(db, async transaction => {
        const request = await transaction.get(requestRef);
        const author = await transaction.get(authorRef);
        if (!request.exists() || !author.exists()) throw new Error('Solicitud o perfil no disponible.');
        if (request.data().uid !== currentUser.uid && normalizeRole(author.data().rol) !== 'profesor') {
          throw new Error('No tienes permiso para comentar esta solicitud.');
        }
        transaction.set(commentRef, {
          authorUid: currentUser.uid,
          authorName: author.data().displayName || author.data().email || currentUser.uid,
          text: commentText,
          createdAt: serverTimestamp(),
        });
      });
      setText('');
    } catch {
      setSaveError('No se pudo enviar el comentario. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 border-t pt-4" aria-label="Comentarios de la solicitud">
      <h4 className="font-medium">Comentarios</h4>
      {loadError && <p role="alert" className="text-destructive">{loadError}</p>}
      {loading ? <p role="status">Cargando comentarios...</p> : !loadError && comments.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p> : comments.map(comment => (
        <article key={comment.id} className="rounded-md bg-muted p-3 space-y-1">
          <p className="text-sm font-medium">{comment.authorName}</p>
          {comment.createdAt && <time className="text-xs text-muted-foreground" dateTime={comment.createdAt.toDate().toISOString()}>{comment.createdAt.toDate().toLocaleString('es-CR')}</time>}
          <p className="whitespace-pre-wrap break-words text-sm">{comment.text}</p>
        </article>
      ))}
      <form onSubmit={submit} className="space-y-2">
        <label className="block text-sm font-medium">Agregar comentario
          <Textarea value={text} onChange={event => setText(event.target.value)} maxLength={2000} required disabled={saving || loading || !!loadError} className="mt-2" />
        </label>
        {saveError && <p role="alert" className="text-destructive">{saveError}</p>}
        <Button type="submit" size="sm" disabled={saving || loading || !!loadError || !text.trim()}>{saving ? 'Enviando...' : 'Enviar comentario'}</Button>
      </form>
    </section>
  );
}

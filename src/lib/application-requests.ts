import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { normalizeRole } from '@/lib/roles';

export const applicationRequestSchema = z.object({
  category: z.enum(['feature', 'bug']),
  title: z.string().trim().min(5, 'Usa al menos 5 caracteres.').max(120, 'Usa como máximo 120 caracteres.'),
  description: z.string().trim().min(20, 'Usa al menos 20 caracteres.').max(3000, 'Usa como máximo 3000 caracteres.'),
});
export const REQUEST_STATUSES = {
  pending: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelta',
  declined: 'Descartada',
} as const;
export type RequestStatus = keyof typeof REQUEST_STATUSES;
export interface ApplicationRequest extends z.infer<typeof applicationRequestSchema> {
  id: string;
  uid: string;
  status: RequestStatus;
}

export function newApplicationRequestId() {
  if (!db) throw new Error('El servicio no está disponible.');
  return doc(collection(db, 'applicationRequests')).id;
}

export async function submitApplicationRequest(id: string, uid: string, input: z.infer<typeof applicationRequestSchema>) {
  if (!db) throw new Error('El servicio no está disponible.');
  const data = applicationRequestSchema.parse(input);
  const requestRef = doc(db, 'applicationRequests', id);
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(requestRef);
    if (existing.exists()) {
      if (existing.data().uid !== uid) throw new Error('No se pudo enviar la solicitud.');
      return;
    }
    transaction.set(requestRef, { ...data, uid, status: 'pending', createdAt: serverTimestamp() });
  });
}

export async function updateApplicationRequestStatus(actorUid: string, id: string, status: RequestStatus) {
  if (!db) throw new Error('El servicio no está disponible.');
  if (!Object.hasOwn(REQUEST_STATUSES, status)) throw new Error('Estado inválido.');
  const requestRef = doc(db, 'applicationRequests', id);
  await runTransaction(db, async transaction => {
    const actor = await transaction.get(doc(db!, 'users', actorUid));
    const existing = await transaction.get(requestRef);
    if (!actor.exists() || normalizeRole(actor.data().rol) !== 'profesor') throw new Error('Solo un profesor puede revisar solicitudes.');
    if (!existing.exists()) throw new Error('La solicitud ya no existe.');
    transaction.update(requestRef, { status, reviewedBy: actorUid, updatedAt: serverTimestamp() });
  });
}

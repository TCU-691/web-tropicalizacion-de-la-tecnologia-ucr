import { collection, doc, runTransaction, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeRole, PROFESSOR_ASSIGNABLE_ROLES, type AppRole } from '@/lib/roles';

export const ROLE_LABELS: Record<AppRole, string> = { invitado: 'Invitado', alumno: 'Alumno', lider: 'Líder', asistente: 'Asistente', profesor: 'Profesor' };
export const ROLE_REQUEST_STATUSES = { pending: 'Abierta', approved: 'Aprobada', rejected: 'Denegada', withdrawn: 'Retirada' } as const;

export interface TeacherRequest {
  id: string;
  uid: string;
  reason: string;
  requestedRole?: AppRole;
  status: keyof typeof ROLE_REQUEST_STATUSES;
  createdAt?: Timestamp | null;
}

export async function saveTeacherRequest(uid: string, reason: string, requestedRole: AppRole, requestId?: string) {
  if (!db) throw new Error('Firestore no está inicializado.');
  const trimmedReason = reason.trim();
  if (!PROFESSOR_ASSIGNABLE_ROLES.includes(requestedRole)) throw new Error('Selecciona un rol válido.');
  if (trimmedReason.length < 10 || trimmedReason.length > 1000) {
    throw new Error('Explica tu solicitud en entre 10 y 1000 caracteres.');
  }

  const requests = collection(db, 'teacherRequests');
  const requestRef = requestId ? doc(requests, requestId) : doc(requests);
  const legacyRef = doc(requests, uid);
  const lockRef = doc(db, 'teacherRequestLocks', uid);
  const userRef = doc(db, 'users', uid);

  await runTransaction(db, async transaction => {
    const user = await transaction.get(userRef);
    if (!user.exists()) throw new Error('No se encontró tu perfil.');
    if (normalizeRole(user.data().rol) === requestedRole) throw new Error('Tu cuenta ya tiene el rol solicitado.');

    if (requestId) {
      const existing = await transaction.get(requestRef);
      if (existing.data()?.uid !== uid || existing.data()?.status !== 'pending') {
        throw new Error('La solicitud ya no está abierta.');
      }
      transaction.update(requestRef, { reason: trimmedReason, requestedRole, updatedAt: serverTimestamp() });
      return;
    }

    const legacy = await transaction.get(legacyRef);
    const lock = await transaction.get(lockRef);
    const previousId = lock.data()?.requestId;
    const previous = previousId ? await transaction.get(doc(requests, previousId)) : null;
    if (legacy.data()?.status === 'pending' || previous?.data()?.status === 'pending') {
      throw new Error('Ya tienes una solicitud abierta. Edítala o retírala antes de enviar otra.');
    }

    transaction.set(requestRef, { uid, reason: trimmedReason, requestedRole, status: 'pending', createdAt: serverTimestamp() });
    transaction.set(lockRef, { requestId: requestRef.id });
  });
}

export async function withdrawTeacherRequest(uid: string, requestId: string) {
  if (!db) throw new Error('Firestore no está inicializado.');
  const requestRef = doc(db, 'teacherRequests', requestId);
  await runTransaction(db, async transaction => {
    const request = await transaction.get(requestRef);
    if (request.data()?.uid !== uid || request.data()?.status !== 'pending') {
      throw new Error('La solicitud ya no está abierta.');
    }
    transaction.update(requestRef, { status: 'withdrawn', withdrawnAt: serverTimestamp() });
  });
}

export async function reviewTeacherRequest(actorUid: string, selected: TeacherRequest, status: 'approved' | 'rejected') {
  if (!db) throw new Error('Firestore no está inicializado.');
  const { uid: targetUid, id: requestId } = selected;
  const actorRef = doc(db, 'users', actorUid);
  const userRef = doc(db, 'users', targetUid);
  const requestRef = doc(db, 'teacherRequests', requestId);
  await runTransaction(db, async transaction => {
    const actor = await transaction.get(actorRef);
    const user = await transaction.get(userRef);
    const request = await transaction.get(requestRef);
    if (!actor.exists() || normalizeRole(actor.data().rol) !== 'profesor' || actorUid === targetUid) {
      throw new Error('Solo un profesor puede revisar esta solicitud.');
    }
    if (!user.exists() || request.data()?.uid !== targetUid || request.data()?.status !== 'pending') {
      throw new Error('La solicitud ya fue revisada, retirada o el usuario no existe.');
    }
    const requestedRole = request.data()?.requestedRole ?? 'profesor';
    if (request.data()?.reason !== selected.reason || requestedRole !== (selected.requestedRole ?? 'profesor')) {
      throw new Error('La solicitud cambió. Revisa el motivo y el rol antes de continuar.');
    }
    if (!PROFESSOR_ASSIGNABLE_ROLES.includes(requestedRole)) throw new Error('El rol solicitado no es válido.');
    transaction.update(requestRef, { status, reviewedBy: actorUid, reviewedAt: serverTimestamp() });
    if (status === 'approved') transaction.update(userRef, { rol: requestedRole });
  });
}

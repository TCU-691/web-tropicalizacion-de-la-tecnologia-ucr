import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeRole } from '@/lib/roles';
import type { UserProfile } from '@/types/user';
import { PROFESSOR_ASSIGNABLE_ROLES, type AppRole } from '@/lib/roles';

export const ROLE_LABELS: Record<AppRole, string> = { invitado: 'Invitado', alumno: 'Alumno', lider: 'Líder', asistente: 'Asistente', profesor: 'Profesor' };

export interface TeacherRequest {
  uid: string;
  reason: string;
  requestedRole?: AppRole;
  status: 'pending' | 'approved' | 'rejected';
}

export async function submitTeacherRequest(uid: string, reason: string, requestedRole: AppRole = 'profesor') {
  if (!db) throw new Error('Firestore no está inicializado.');
  const trimmedReason = reason.trim();
  if (!PROFESSOR_ASSIGNABLE_ROLES.includes(requestedRole)) throw new Error('Selecciona un rol válido.');
  if (trimmedReason.length < 10 || trimmedReason.length > 1000) {
    throw new Error('Explica tu solicitud en entre 10 y 1000 caracteres.');
  }
  const requestRef = doc(db, 'teacherRequests', uid);
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async transaction => {
    const request = await transaction.get(requestRef);
    const user = await transaction.get(userRef);
    if (!user.exists()) throw new Error('No se encontró tu perfil.');
    if (normalizeRole(user.data().rol) === requestedRole) throw new Error('Tu cuenta ya tiene el rol solicitado.');
    if (request.exists()) throw new Error('Ya enviaste una solicitud.');
    transaction.set(requestRef, { uid, reason: trimmedReason, requestedRole, status: 'pending', createdAt: serverTimestamp() });
  });
}

export async function reviewTeacherRequest(actorUid: string, targetUid: string, status: 'approved' | 'rejected') {
  if (!db) throw new Error('Firestore no está inicializado.');
  const actorRef = doc(db, 'users', actorUid);
  const userRef = doc(db, 'users', targetUid);
  const requestRef = doc(db, 'teacherRequests', targetUid);
  await runTransaction(db, async transaction => {
    const actor = await transaction.get(actorRef);
    const user = await transaction.get(userRef);
    const request = await transaction.get(requestRef);
    if (!actor.exists() || normalizeRole((actor.data() as UserProfile).rol) !== 'profesor' || actorUid === targetUid) {
      throw new Error('Solo un profesor puede revisar esta solicitud.');
    }
    if (!user.exists() || !request.exists() || request.data().status !== 'pending') {
      throw new Error('La solicitud ya fue revisada o el usuario no existe.');
    }
    const requestedRole = request.data().requestedRole ?? 'profesor';
    if (!PROFESSOR_ASSIGNABLE_ROLES.includes(requestedRole)) throw new Error('El rol solicitado no es válido.');
    transaction.update(requestRef, { status, reviewedBy: actorUid, reviewedAt: serverTimestamp() });
    if (status === 'approved') transaction.update(userRef, { rol: requestedRole });
  });
}

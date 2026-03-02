import type { Timestamp } from 'firebase/firestore';

export interface FirestoreTask {
  id: string;
  description: string;
  endDate: Timestamp;
  hours: number;
  maxSlots: number;
  name: string;
  parentId: string; // ID of the parent project
  status: string;
  usedSlots: number;
}

export type TaskStatus = 'pendiente' | 'en-progreso' | 'completada' | 'cancelada';

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en-progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
];

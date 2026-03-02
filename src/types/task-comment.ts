import type { Timestamp } from 'firebase/firestore';

export interface FirestoreTaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp;
}

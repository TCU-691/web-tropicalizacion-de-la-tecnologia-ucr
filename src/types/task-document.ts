import type { Timestamp } from 'firebase/firestore';

export interface FirestoreTaskDocument {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  fileName: string;
  fileUrl: string;
  fileId?: string; // ImageKit fileId for easier deletion
  createdAt: Timestamp;
}

import type { Timestamp } from 'firebase/firestore';

export interface FirestoreTour {
  id: string; // Document ID from Firestore
  slug: string;
  title: string;
  date: string; // Storing date as a string for simplicity, can be ISO string for proper sorting
  status: 'Próximamente' | 'Realizada' | 'Cancelada';
  location: string;
  description: string;
  imageUrl: string;
  createdBy: string; // User UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dateISO?: string; // ISO 8601 date (YYYY-MM-DD) for cron-based reminder calculations
}

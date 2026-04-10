
import type { Timestamp } from 'firebase/firestore';

export interface FirestoreArticle {
  id: string; // Document ID
  title: string;
  description: string;
  imageUrl?: string; // Optional cover image
  linkUrl?: string; // Optional external link
  authorId: string; // UID of the author
  authorDisplayName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

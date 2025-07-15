
import type { Timestamp } from 'firebase/firestore';

export interface HeadingBlock {
    id?: string;
    type: 'heading';
    content: string;
}

export interface SubheadingBlock {
    id?: string;
    type: 'subheading';
    content: string;
}

export interface ParagraphBlock {
    id?: string;
    type: 'paragraph';
    content: string;
}

export type ContentBlock = HeadingBlock | SubheadingBlock | ParagraphBlock;

export interface FirestoreArticle {
  id: string; // Document ID
  title: string;
  slug: string;
  summary: string;
  category: string;
  coverImageUrl: string; // Added cover image URL
  contentBlocks: ContentBlock[];
  status: 'pendiente' | 'aprobado' | 'rechazado';
  authorId: string; // UID of the author
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Optional field populated after fetching related data
  authorDisplayName?: string;
}

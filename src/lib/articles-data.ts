
// This file is now deprecated for providing public article data,
// as it is fetched from Firestore.
// It can be kept for type reference or removed.

export interface LegacyArticle {
  id: string;
  slug: string;
  title: string;
  author: string;
  publishedDate: string; // e.g., "15 de Julio, 2024"
  category: string;
  imageUrl: string;
  dataAiHint: string;
  summary: string;
  content: string; 
}

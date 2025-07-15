
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
      videoId = urlObj.pathname.split('/embed/')[1]?.split('?')[0];
      if(videoId) return `https://www.youtube.com/embed/${videoId}`; // Already an embed URL
    }
  } catch (error) {
    console.error("Invalid URL for YouTube:", error);
    return null;
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return null;
}

export function countTotalLessons(modules: Array<{ lecciones: unknown[] }>): number {
  if (!modules || modules.length === 0) return 0;
  return modules.reduce((total, module) => total + (module.lecciones?.length || 0), 0);
}

export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
        .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/-+/g, '-'); // Replace multiple - with single -
}

export async function isSlugUnique(slug: string, collectionName: string): Promise<boolean> {
    if (!db) return false;
    const q = query(collection(db, collectionName), where('slug', '==', slug), limit(1));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
}

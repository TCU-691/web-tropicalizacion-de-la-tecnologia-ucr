
import type { Metadata } from 'next';
import { CursosPublicosClientPage } from './CursosPublicosClientPage';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreCourse } from '@/types/course';

export const metadata: Metadata = {
  title: 'Cursos Públicos | TCU TC-691',
  description: 'Accede a cursos y materiales educativos abiertos a todo público, desarrollados por el TCU TC-691 para la comunidad.',
  keywords: [
    'cursos públicos', 'educación', 'TCU', 'TC-691', 'UCR', 'universidad', 'Costa Rica', 'aprendizaje', 'material educativo', 'comunidad', 'tropicalización', 'tecnología'
  ],
  openGraph: {
    title: 'Cursos Públicos | TCU TC-691',
    description: 'Accede a cursos y materiales educativos abiertos a todo público, desarrollados por el TCU TC-691 para la comunidad.',
    siteName: 'TCU TC-691',
    locale: 'es_CR',
    type: 'website',
  },
  alternates: {
    canonical: '/cursos-publicos',
  },
};

async function getApprovedCourses(): Promise<FirestoreCourse[]> {
  if (!db) {
    console.error("Firestore (db) is not initialized.");
    return [];
  }
  const coursesCol = collection(db, 'courses');
  const q = query(coursesCol, where('estado', '==', 'aprobado'));
  try {
    const querySnapshot = await getDocs(q);
    const courses = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fechaCreacion: (data.fechaCreacion as Timestamp).toDate().toISOString(),
        fechaActualizacion: data.fechaActualizacion ? (data.fechaActualizacion as Timestamp).toDate().toISOString() : undefined,
      } as FirestoreCourse;
    });
    courses.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
    return courses;
  } catch (error) {
    console.error("Error fetching approved courses: ", error);
    if ((error as any).code === 'failed-precondition') {
      console.error(
        "Firestore query failed. This often means you're missing a composite index. " +
        "Check the Firebase console for a link to create it."
      );
    }
    return [];
  }
}

export default async function CursosPublicosPage() {
  const initialCourses = await getApprovedCourses();
  return <CursosPublicosClientPage initialCourses={initialCourses} />;
}


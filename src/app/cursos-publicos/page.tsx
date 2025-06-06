
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreCourse } from '@/types/course';
import { CursosPublicosClientPage } from './cursos-publicos-client'; // Import the new client component

async function getApprovedCourses(): Promise<FirestoreCourse[]> {
  if (!db) {
    console.error("Firestore (db) is not initialized.");
    return [];
  }
  const coursesCol = collection(db, 'courses');
  // The query now requires an index: estado ASC, fechaCreacion DESC
  const q = query(coursesCol, where('estado', '==', 'aprobado'), orderBy('fechaCreacion', 'desc'));
  
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
    return courses;
  } catch (error) {
    console.error("Error fetching approved courses: ", error);
    // Check for Firebase specific error codes if needed, e.g., for missing index
    if ((error as any).code === 'failed-precondition') {
      console.error(
        "Firestore query failed. This often means you're missing a composite index. " +
        "Check the Firebase console for a link to create it. " +
        "The query was: WHERE estado == 'aprobado' ORDER BY fechaCreacion DESC"
      );
    }
    return []; // Return empty array on error
  }
}

// Server Component Wrapper to fetch data
export default async function CursosPublicosPage() {
  const initialCourses = await getApprovedCourses();
  return <CursosPublicosClientPage initialCourses={initialCourses} />;
}

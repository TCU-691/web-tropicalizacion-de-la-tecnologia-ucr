
import type { Timestamp } from 'firebase/firestore';

export interface CourseLessonFirestore {
  id?: string; // Firestore auto-ID or custom
  tituloLeccion: string;
  youtubeUrl: string;
  descripcionLeccion?: string;
}

export interface CourseModuleFirestore {
  id?: string; // Firestore auto-ID or custom
  tituloModulo: string;
  lecciones: CourseLessonFirestore[];
}

export interface FirestoreCourse {
  id: string; // Document ID from Firestore
  titulo: string;
  slug: string;
  descripcion: string;
  categoria: string;
  imagenUrl: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  creadoPor: string; // UID of the author
  fechaCreacion: string; // Changed from Timestamp to string
  fechaActualizacion?: string; // Changed from Timestamp to string
  visitas: number;
  modulos: CourseModuleFirestore[];
  // Optional fields populated after fetching related data
  authorDisplayName?: string;
  numeroLecciones?: number;
}

// Schema for the edit form, similar to upload but might include ID
export const courseEditSchema = null; // Zod schema will be defined in the edit page component
export type CourseEditFormValues = Omit<FirestoreCourse, 'id' | 'creadoPor' | 'fechaCreacion' | 'visitas' | 'authorDisplayName' | 'numeroLecciones' | 'fechaActualizacion' | 'slug'> & {
  // modules might need slightly different handling if IDs are important for array ops
};


export interface CourseLesson {
  id: string;
  title: string;
  videoUrl?: string; // YouTube embed URL: e.g., https://www.youtube.com/embed/VIDEO_ID
  content?: string; // Text content/description for the lesson
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseMaterial {
  name: string;
  url: string; // URL to download the material
}

// This interface was for mock data. FirestoreCourse in src/types/course.ts is now the primary type.
export interface Course {
  id: string;
  slug: string;
  title: string;
  shortDescription: string; 
  description: string; 
  imageUrl: string; 
  dataAiHint: string;
  category: string;
  author?: string;
  modules?: CourseModule[];
  materials?: CourseMaterial[];
}

// Mock data is no longer used for public courses.
// export const coursesData: Course[] = [ ... ];
// export const getCourseBySlug = (slug: string): Course | undefined => { ... };

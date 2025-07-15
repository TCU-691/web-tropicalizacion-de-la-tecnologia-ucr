"use client";

import { useState } from 'react';
import type { FirestoreCourse } from '@/types/course';
import { CursosPublicosClientPage as CursosClient } from './cursos-publicos-client';

interface CursosPublicosClientPageProps {
  initialCourses: FirestoreCourse[];
}

export function CursosPublicosClientPage({ initialCourses }: CursosPublicosClientPageProps) {
  // Si el componente original ya maneja el estado y lógica, simplemente pásale initialCourses
  return <CursosClient initialCourses={initialCourses} />;
} 
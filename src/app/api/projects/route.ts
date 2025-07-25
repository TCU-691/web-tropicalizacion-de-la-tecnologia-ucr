import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreProject } from '@/types/project';
import { NextResponse } from 'next/server';

export const fetchCache = 'force-no-store'

export async function GET() {
  if (!db) {
    console.error("Firestore (db) is not initialized.");
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }
  try {
    const projectsCollection = collection(db, 'projects');
    const querySnapshot = await getDocs(query(projectsCollection, orderBy('createdAt', 'desc')));
    
    const projectsData = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as FirestoreProject))
      .filter(project => project.parentId === null || project.parentId === undefined);

    return NextResponse.json(projectsData, { status: 200 });
  } catch (error) {
    console.error("Error fetching projects: ", error);
    return NextResponse.json({ error: "Error fetching projects" }, { status: 500 });
  }
}
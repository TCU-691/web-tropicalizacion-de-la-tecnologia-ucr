import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreTask } from '@/types/task';
import { NextResponse } from 'next/server';

export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  if (!db) {
    return NextResponse.json({ error: 'Firestore not initialized' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    const tasksCollection = collection(db, 'tasks');
    const q = query(
      tasksCollection,
      where('parentId', '==', projectId),
      orderBy('endDate', 'asc')
    );
    const querySnapshot = await getDocs(q);

    const tasksData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as FirestoreTask));

    return NextResponse.json(tasksData, { status: 200 });
  } catch (error) {
    console.error('Error fetching tasks: ', error);
    return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 });
  }
}

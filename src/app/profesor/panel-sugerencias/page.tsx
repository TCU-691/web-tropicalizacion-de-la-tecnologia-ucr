'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { ApplicationRequestsPanel } from '@/components/application-requests-panel';
import { db } from '@/lib/firebase';
import { canManageProjects } from '@/lib/roles';
import type { UserProfile } from '@/types/user';

export default function PanelSugerenciasPage() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersError, setUsersError] = useState('');
  const canReview = canManageProjects(userProfile?.rol);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.replace('/login?redirect=/profesor/panel-sugerencias');
    } else if (userProfile && !canReview) {
      router.replace('/unauthorized?page=panel-sugerencias');
    }
  }, [loading, currentUser, userProfile, canReview, router]);

  useEffect(() => {
    if (!currentUser || !canReview || !db) return;
    return onSnapshot(collection(db, 'users'), snapshot => {
      setUsers(snapshot.docs.map(item => ({ ...item.data(), uid: item.id } as UserProfile)));
      setUsersError('');
    }, () => {
      setUsers([]);
      setUsersError('No se pudieron cargar los nombres de los usuarios.');
    });
  }, [currentUser, canReview]);

  if (loading || !currentUser || !userProfile) {
    return <p role="status" className="container mx-auto py-8">Cargando sugerencias y reportes...</p>;
  }

  if (!canReview) return null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="font-headline text-3xl text-primary">Sugerencias y reportes</h1>
      {usersError && <p role="alert" className="text-destructive">{usersError}</p>}
      <ApplicationRequestsPanel uid={currentUser.uid} review users={users} />
    </div>
  );
}

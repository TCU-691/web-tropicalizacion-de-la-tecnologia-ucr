'use client';

import Link from 'next/link';
import { TeacherRequestsPanel } from '@/components/teacher-requests-panel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { normalizeRole } from '@/lib/roles';

export default function TeacherRequestPage() {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) return <p role="status" className="p-8">Cargando...</p>;
  if (!currentUser) {
    return <div className="p-8"><Button asChild><Link href="/login?redirect=/solicitar-profesor">Inicia sesión para solicitar un cambio de rol</Link></Button></div>;
  }

  return (
    <div className="container max-w-4xl py-8">
      <TeacherRequestsPanel key={currentUser.uid} actorUid={currentUser.uid} review={false}
        currentRole={userProfile ? normalizeRole(userProfile.rol) : undefined} />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert, UsersRound, Search, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, onSnapshot, doc, updateDoc, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types/user';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserTasksDialog } from '@/components/user-tasks-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function assertDb(db: typeof import('@/lib/firebase').db): asserts db is Exclude<typeof db, null> {
  if (!db) throw new Error('Firestore no está inicializado');
}

const ROLES: { value: UserProfile['rol']; label: string }[] = [
  { value: 'invitado', label: 'Invitado' },
  { value: 'alumno', label: 'Alumno' },
  { value: 'profesor', label: 'Profesor' },
  { value: 'admin', label: 'Admin' },
];

function rolBadgeVariant(rol: string) {
  switch (rol) {
    case 'admin': return 'default' as const;
    case 'profesor': return 'default' as const;
    case 'alumno': return 'secondary' as const;
    case 'invitado': return 'outline' as const;
    default: return 'outline' as const;
  }
}

export default function PanelUsuariosPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRol, setFilterRol] = useState<string>('todos');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/login?redirect=/profesor/panel-usuarios');
      } else if (userProfile && userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
        router.push('/unauthorized?page=panel-usuarios');
      }
    }
  }, [currentUser, userProfile, authLoading, router]);

  useEffect(() => {
    if (currentUser && (userProfile?.rol === 'profesor' || userProfile?.rol === 'admin')) {
      assertDb(db);
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, orderBy('displayName', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(d => ({
          ...d.data(),
          uid: d.id,
        } as UserProfile));
        setUsers(usersData);
        setLoadingUsers(false);
      }, (error) => {
        console.error('Error fetching users:', error);
        toast({ title: 'Error al cargar usuarios', variant: 'destructive' });
        setLoadingUsers(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser, userProfile, toast]);

  const handleChangeRole = async (userId: string, newRole: UserProfile['rol']) => {
    setUpdatingUserId(userId);
    try {
      assertDb(db);
      await updateDoc(doc(db, 'users', userId), { rol: newRole });
      toast({
        title: 'Rol actualizado',
        description: `El usuario ha sido cambiado a "${newRole}".`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el rol del usuario.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (authLoading || !currentUser || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando panel de usuarios...</p>
      </div>
    );
  }

  if (userProfile.rol !== 'profesor' && userProfile.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
        <h1 className="font-headline text-3xl text-destructive mb-3">Acceso Denegado</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          No tienes los permisos necesarios para gestionar usuarios.
        </p>
        <Button asChild>
          <Link href="/">Volver al Inicio</Link>
        </Button>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesFilter = filterRol === 'todos' || u.rol === filterRol;
    return matchesSearch && matchesFilter;
  });

  const invitadosCount = users.filter(u => u.rol === 'invitado').length;
  const alumnosCount = users.filter(u => u.rol === 'alumno').length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6">
          <div className="mb-4 md:mb-0">
            <CardTitle className="font-headline text-3xl text-primary flex items-center">
              <UsersRound className="mr-3 h-8 w-8" />
              Gestión de Usuarios
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              {users.length} usuarios registrados · {invitadosCount} invitados · {alumnosCount} alumnos
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o correo..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRol} onValueChange={setFilterRol}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los roles</SelectItem>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loadingUsers ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No se encontraron usuarios.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol Actual</TableHead>
                    <TableHead className="text-right">Cambiar Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow
                      key={u.uid}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => { setSelectedUser(u); setDialogOpen(true); }}
                    >
                      <TableCell className="font-medium">{u.displayName || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={rolBadgeVariant(u.rol)}>{u.rol}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div onClick={(e) => e.stopPropagation()}>
                        {u.uid === currentUser?.uid ? (
                          <span className="text-xs text-muted-foreground italic">Tu cuenta</span>
                        ) : updatingUserId === u.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                        ) : (
                          <Select
                            value={u.rol}
                            onValueChange={(val) => handleChangeRole(u.uid, val as UserProfile['rol'])}
                          >
                            <SelectTrigger className="w-[130px] ml-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserTasksDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

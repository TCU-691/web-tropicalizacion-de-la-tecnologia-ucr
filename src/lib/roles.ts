import type { UserProfile } from '@/types/user';

export type AppRole = Exclude<UserProfile['rol'], 'admin'>;

const ROLE_WEIGHT: Record<AppRole, number> = {
  profesor: 5,
  asistente: 4,
  lider: 3,
  alumno: 2,
  invitado: 1,
};

export const ASSISTANT_ASSIGNABLE_ROLES: AppRole[] = ['lider', 'alumno', 'invitado'];
export const PROFESSOR_ASSIGNABLE_ROLES: AppRole[] = ['profesor', 'asistente', 'lider', 'alumno', 'invitado'];

export function normalizeRole(role: UserProfile['rol'] | undefined | null): AppRole {
  if (role === 'admin') return 'profesor';
  return role ?? 'invitado';
}

export function hasAtLeastRole(role: UserProfile['rol'] | undefined | null, minimumRole: AppRole): boolean {
  return ROLE_WEIGHT[normalizeRole(role)] >= ROLE_WEIGHT[minimumRole];
}

export function canAccessUserPanel(role: UserProfile['rol'] | undefined | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'profesor' || normalized === 'asistente';
}

export function canAccessProjectPanel(role: UserProfile['rol'] | undefined | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'profesor' || normalized === 'asistente' || normalized === 'lider';
}

export function canManageProjects(role: UserProfile['rol'] | undefined | null): boolean {
  return normalizeRole(role) === 'profesor';
}

export function canAssignProjectLeaders(role: UserProfile['rol'] | undefined | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'profesor' || normalized === 'asistente';
}

export function canManageTasksGlobally(role: UserProfile['rol'] | undefined | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'profesor' || normalized === 'asistente';
}

export function canManageTasksForProject(
  role: UserProfile['rol'] | undefined | null,
  isLeaderForProject: boolean
): boolean {
  const normalized = normalizeRole(role);
  if (normalized === 'profesor' || normalized === 'asistente') return true;
  return normalized === 'lider' && isLeaderForProject;
}

export function canParticipateInTasks(role: UserProfile['rol'] | undefined | null): boolean {
  return normalizeRole(role) !== 'invitado';
}

export function canModerateTaskEvidence(
  role: UserProfile['rol'] | undefined | null,
  isLeaderForProject: boolean
): boolean {
  const normalized = normalizeRole(role);
  if (normalized === 'profesor' || normalized === 'asistente') return true;
  return normalized === 'lider' && isLeaderForProject;
}

export function canChangeUserRole(
  actorRole: UserProfile['rol'] | undefined | null,
  targetCurrentRole: UserProfile['rol'],
  targetNewRole: UserProfile['rol']
): boolean {
  const actor = normalizeRole(actorRole);
  const current = normalizeRole(targetCurrentRole);
  const next = normalizeRole(targetNewRole);

  if (actor === 'profesor') {
    return PROFESSOR_ASSIGNABLE_ROLES.includes(next);
  }

  if (actor === 'asistente') {
    const currentIsProtected = current === 'profesor' || current === 'asistente';
    if (currentIsProtected) return false;
    return ASSISTANT_ASSIGNABLE_ROLES.includes(next);
  }

  return false;
}

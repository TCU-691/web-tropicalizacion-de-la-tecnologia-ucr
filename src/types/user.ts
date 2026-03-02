
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  rol: 'invitado' | 'alumno' | 'profesor' | 'admin';
}

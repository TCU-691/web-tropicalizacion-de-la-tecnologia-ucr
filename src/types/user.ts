
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  rol: 'alumno' | 'profesor' | 'admin'; // admin es un rol potencial futuro
}


'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User as FirebaseAuthUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types/user';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: FirebaseAuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && db) { // Asegurarse que db esté inicializado
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else {
            // Crear perfil si no existe (ej. primer login con Google o nuevo registro)
            const newUserProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email || 'Usuario Anónimo', // Fallback para displayName
              rol: 'alumno', // Rol por defecto
            };
            try {
              await setDoc(userDocRef, newUserProfile);
              setUserProfile(newUserProfile);
            } catch (setDocError) {
              console.error("Error creating user profile in Firestore (setDoc):", setDocError);
              const errorMessage = setDocError instanceof Error ? setDocError.message : 'Error desconocido al guardar perfil.';
              toast({
                title: "Error de Perfil",
                description: `No se pudo crear tu perfil de usuario. ${errorMessage}`,
                variant: "destructive",
              });
            }
          }
        } catch (getDocError) {
          console.error("Error fetching user profile from Firestore (getDoc):", getDocError);
          const errorMessage = getDocError instanceof Error ? getDocError.message : 'Error desconocido al cargar perfil.';
          // El error "client is offline" usualmente se captura aquí
           toast({
            title: "Error de Conexión o Permisos",
            description: `No se pudo cargar tu perfil de Firestore. Verifica tu conexión y la configuración de Firebase. Detalle: ${errorMessage}`,
            variant: "destructive",
          });
          setUserProfile(null); // Asegurar que el perfil quede nulo si hay error
        }
      } else {
        setUserProfile(null);
        if (user && !db) {
            console.error("Firestore (db) no está inicializado. No se puede obtener el perfil de usuario.");
             toast({
                title: "Error de Configuración",
                description: "La base de datos Firestore no parece estar inicializada correctamente.",
                variant: "destructive",
            });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // setCurrentUser(null); // onAuthStateChanged se encargará de esto
      // setUserProfile(null); // onAuthStateChanged se encargará de esto
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente.",
      });
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión.",
        variant: "destructive",
      });
    } finally {
      // setLoading(false); // onAuthStateChanged maneja el estado de carga final
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/user';
import { UserPlus, Mail, KeyRound, UserCircle, AlertTriangle } from 'lucide-react';

const signupSchema = z.object({
  displayName: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  email: z.string().email({ message: 'Por favor ingresa un correo válido.' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      // Actualizar perfil de Firebase Auth
      await updateProfile(firebaseUser, { displayName: data.displayName });

      // Crear documento de usuario en Firestore
      const newUserProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: data.displayName,
        rol: 'alumno', // Rol por defecto
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);

      toast({
        title: '¡Cuenta Creada!',
        description: 'Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error("Error signing up: ", error);
      setAuthError(getFirebaseAuthErrorMessage(error.code));
      toast({
        title: 'Error de Registro',
        description: getFirebaseAuthErrorMessage(error.code),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // El perfil de Firestore se crea/actualiza en el AuthContext,
      // aquí solo redirigimos y mostramos toast.
      
      toast({
        title: '¡Cuenta Creada!',
        description: 'Has sido registrado con Google exitosamente.',
      });
      router.push('/'); // Redirigir a la página principal o dashboard
    } catch (error: any) {
      console.error("Error signing up with Google: ", error);
      setAuthError(getFirebaseAuthErrorMessage(error.code));
      toast({
        title: 'Error de Registro con Google',
        description: getFirebaseAuthErrorMessage(error.code),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFirebaseAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está registrado.';
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/operation-not-allowed':
        return 'El registro por correo y contraseña no está habilitado.';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil.';
      case 'auth/popup-closed-by-user':
         return 'El proceso de registro con Google fue cancelado.';
      default:
        return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-20rem)] py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-3xl">Crear Cuenta</CardTitle>
          <CardDescription>Regístrate para empezar a compartir tus conocimientos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {authError && (
            <div className="bg-destructive/10 p-3 rounded-md flex items-center text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {authError}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@correo.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Registrando...' : 'Registrarse'}
              </Button>
            </form>
          </Form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O regístrate con
              </span>
            </div>
          </div>

           <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={isLoading}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 381.7 512 244 512 112.8 512 0 398.9 0 256S112.8 0 244 0c71.8 0 129.4 29.3 172.9 72.5l-63.9 62.4C325.5 100.3 288.6 80 244 80c-66.6 0-120.9 54.4-120.9 121.4s54.3 121.4 120.9 121.4c47.7 0 84.1-20.1 100.4-36.9l64 63.3C392.1 427.2 328.5 464 244 464c-132.3 0-240-107.4-240-240S111.7 16 244 16c75.1 0 132.3 30.8 177.4 76.9l.1.1C453.5 134.1 488 193.3 488 261.8z"></path>
            </svg>
            Google
          </Button>

        </CardContent>
        <CardFooter className="text-sm text-center block">
          <p>¿Ya tienes una cuenta?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/login">Inicia sesión aquí</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}


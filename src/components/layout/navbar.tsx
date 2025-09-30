
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Menu, TentTree, LogOut, UploadCloud, UserCircle, ChevronDown, FolderKanban, Map, FileText, BookCheck, PenSquare } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

export function Navbar() {
  const { currentUser, userProfile, loading, logout } = useAuth();

  const navLinksBase = [
    { href: '/', label: 'Inicio' },
    { href: '/proyectos', label: 'Proyectos' },
    { href: '/cursos-publicos', label: 'Cursos' },
    { href: '/giras', label: 'Giras' },
    { href: '/articulos', label: 'Artículos' },
  ];

  const authenticatedNavLinks = [
    { href: '/subir-curso', label: 'Subir Curso', icon: UploadCloud },
    { href: '/crear-articulo', label: 'Escribir Artículo', icon: PenSquare },
  ];

  const isProfessorOrAdmin = userProfile?.rol === 'profesor' || userProfile?.rol === 'admin';

  const renderAuthSection = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      );
    }

    if (currentUser && userProfile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              <span className="hidden sm:inline">{userProfile.displayName || userProfile.email}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Mi Cuenta ({userProfile.rol})</DropdownMenuLabel>
            <DropdownMenuSeparator />
             <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/subir-curso" className="flex items-center">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Subir Curso
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/crear-articulo" className="flex items-center">
                    <PenSquare className="mr-2 h-4 w-4" />
                    Escribir Artículo
                  </Link>
                </DropdownMenuItem>
             </DropdownMenuGroup>
            
            {isProfessorOrAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Paneles de Profesor</DropdownMenuLabel>
                 <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard-aprobaciones" className="flex items-center">
                        <BookCheck className="mr-2 h-4 w-4" />
                        Panel de Cursos
                      </Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                      <Link href="/profesor/panel-articulos" className="flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        Panel de Artículos
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profesor/panel-proyectos" className="flex items-center">
                        <FolderKanban className="mr-2 h-4 w-4" />
                        Panel de Proyectos
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profesor/panel-giras" className="flex items-center">
                        <Map className="mr-2 h-4 w-4" />
                        Panel de Giras
                      </Link >
                    </DropdownMenuItem>
                 </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className="hidden md:flex items-center gap-2">
        <Button asChild variant="outline">
          <Link href="/login">Ingresar</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Registrarse</Link>
        </Button>
      </div>
    );
  };
  
  const renderMobileAuthSection = () => {
    if (loading) return <Skeleton className="h-20 w-full mt-4" />;

    if (currentUser && userProfile) {
      return (
        <>
          <div className="border-t border-border/40 pt-4 mt-4">
            <p className="px-4 text-sm font-medium text-muted-foreground mb-2">
              {userProfile.displayName || userProfile.email} ({userProfile.rol})
            </p>
             {authenticatedNavLinks.map(link => (
                <SheetClose asChild key={link.href}>
                  <Link href={link.href} className="flex items-center w-full py-2 px-4 text-muted-foreground transition-colors hover:text-foreground">
                    <link.icon className="mr-2 h-5 w-5" /> {link.label}
                  </Link>
                </SheetClose>
            ))}
            
             {isProfessorOrAdmin && (
              <>
                <p className="px-4 text-xs font-semibold text-muted-foreground mt-4 mb-2 uppercase">Profesor</p>
                <SheetClose asChild>
                  <Link href="/dashboard-aprobaciones" className="flex items-center w-full py-2 px-4 text-muted-foreground transition-colors hover:text-foreground">
                    <BookCheck className="mr-2 h-5 w-5" /> Panel de Cursos
                  </Link>
                </SheetClose>
                 <SheetClose asChild>
                  <Link href="/profesor/panel-articulos" className="flex items-center w-full py-2 px-4 text-muted-foreground transition-colors hover:text-foreground">
                    <FileText className="mr-2 h-5 w-5" /> Panel de Artículos
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/profesor/panel-proyectos" className="flex items-center w-full py-2 px-4 text-muted-foreground transition-colors hover:text-foreground">
                    <FolderKanban className="mr-2 h-5 w-5" /> Panel de Proyectos
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/profesor/panel-giras" className="flex items-center w-full py-2 px-4 text-muted-foreground transition-colors hover:text-foreground">
                    <Map className="mr-2 h-5 w-5" /> Panel de Giras
                  </Link>
                </SheetClose>
              </>
            )}
          </div>
          <SheetClose asChild>
             <Button variant="ghost" onClick={logout} className="w-full justify-start text-destructive hover:text-destructive mt-2 py-2 px-4">
                <LogOut className="mr-2 h-5 w-5" /> Cerrar Sesión
            </Button>
          </SheetClose>
        </>
      );
    }
    return (
       <div className="mt-6 space-y-2 border-t pt-6">
        <SheetClose asChild>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Ingresar</Link>
          </Button>
        </SheetClose>
        <SheetClose asChild>
          <Button asChild className="w-full">
            <Link href="/signup">Registrarse</Link>
          </Button>
        </SheetClose>
      </div>
    );
  }

  const allPublicLinks = [...navLinksBase];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <Image src="/logo.png" alt="TCU-691 Logo" width={40} height={40} />
          <span className="font-headline text-xl font-semibold hidden sm:inline-block">TCU-691</span>
        </Link>
        
        <nav className="hidden md:flex gap-6 items-center">
          {allPublicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {renderAuthSection()}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>
                    <SheetClose asChild>
                      <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo.png" alt="TCU-691 Logo" width={28} height={28} />
                        <span className="font-headline text-xl font-semibold">TCU-691</span>
                      </Link>
                    </SheetClose>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
                  {allPublicLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className="block py-2 px-3 rounded-md text-base text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="p-4 border-t">
                  {renderMobileAuthSection()}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

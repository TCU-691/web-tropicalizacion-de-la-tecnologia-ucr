'use client';

import Link from 'next/link';
import { Facebook, Instagram } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();


  const hideFooter =
    pathname === '/simulador-junior' ||
    pathname.startsWith('/simulador-junior/');

  if (hideFooter) return null;

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container py-8 text-center text-sm">
        <p>&copy; {currentYear} TCU TC-691 "Tropicalización de la Tecnología". Todos los derechos reservados.</p>
        <p>Universidad de Costa Rica</p>
        <div className="flex justify-center gap-4 mt-4">
          <Link
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors"
          >
            <Instagram className="h-7 w-7" />
          </Link>
          <Link
            href="https://www.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors"
          >
            <Facebook className="h-7 w-7" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
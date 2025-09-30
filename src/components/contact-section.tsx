'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ContactForm } from '@/components/contact-form';
import Link from 'next/link';
import { Facebook, Instagram } from 'lucide-react';

export function ContactSection() {
  return (
    <section className="container mx-auto px-4 text-center">
      <div className="bg-card p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
        <h2 className="font-headline text-3xl font-semibold text-primary mb-4">Contáctanos</h2>
        <p className="text-muted-foreground mb-6">
          ¿Tienes preguntas o quieres colaborar? Nos encantaría saber de ti.
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg">Envíanos un mensaje</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Formulario de Contacto</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ContactForm />
            </div>
          </DialogContent>
        </Dialog>
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">O contáctanos por:</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="https://www.facebook.com/Tropicalizacion" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Facebook className="h-7 w-7" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

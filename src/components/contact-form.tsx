'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function ContactForm() {
  const [status, setStatus] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Enviando...');
    
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setStatus('¡Mensaje enviado con éxito!');
        (event.target as HTMLFormElement).reset();
      } else {
        const errorData = await response.json();
        setStatus(`Error: ${errorData.error || 'Something went wrong'}`);
      }
    } catch (error) {
      setStatus('Error: No se pudo enviar el mensaje.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" type="text" required />
      </div>
      <div>
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="message">Mensaje</Label>
        <Textarea id="message" name="message" required />
      </div>
      <Button type="submit" className="w-full">Enviar Mensaje</Button>
      {status && <p className="text-center text-sm text-muted-foreground mt-2">{status}</p>}
    </form>
  );
}

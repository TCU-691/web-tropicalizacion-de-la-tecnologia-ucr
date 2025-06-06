import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2, Construction } from 'lucide-react';

export default function SimuladorJuniorPage() {
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <Gamepad2 className="h-20 w-20 mx-auto mb-6 text-primary" />
      <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary mb-4">
        Simulador Junior
      </h1>
      <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto mb-8">
        ¡Prepárate para una experiencia de aprendizaje interactiva y divertida!
      </p>
      <div className="bg-accent/10 p-8 rounded-lg inline-block shadow-lg">
        <Construction className="h-12 w-12 mx-auto mb-4 text-accent" />
        <p className="font-semibold text-accent text-xl mb-2">¡En Construcción!</p>
        <p className="text-foreground/80">
          El Simulador Junior está siendo desarrollado con mucho cariño. 
          <br />
          Muy pronto podrás explorar y aprender jugando. ¡Mantente atento!
        </p>
      </div>
      <div className="mt-12">
        <Button asChild size="lg">
          <Link href="/">Volver al Inicio</Link>
        </Button>
      </div>
    </div>
  );
}

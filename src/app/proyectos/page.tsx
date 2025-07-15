
import type { Metadata } from 'next';
import { ProyectosClient } from './ProyectosClient';

export const metadata: Metadata = {
  title: 'Proyectos | TCU TC-691',
  description: 'Explora la diversidad de proyectos desarrollados en el TCU TC-691: innovación, tecnología y compromiso social desde el trópico.',
  keywords: [
    'proyectos', 'TCU', 'TC-691', 'tropicalización', 'tecnología', 'innovación', 'impacto social', 'Costa Rica', 'universidad', 'comunidad', 'sostenibilidad', 'UCR'
  ],
  openGraph: {
    title: 'Proyectos | TCU TC-691',
    description: 'Explora la diversidad de proyectos desarrollados en el TCU TC-691: innovación, tecnología y compromiso social desde el trópico.',
    siteName: 'TCU TC-691',
    locale: 'es_CR',
    type: 'website',
  },
  alternates: {
    canonical: '/proyectos',
  },
};

export default function ProyectosPage() {
  return <ProyectosClient />;
}

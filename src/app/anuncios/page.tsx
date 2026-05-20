import type { Metadata } from 'next';
import { ArticulosClient } from '../articulos/ArticulosClient';

export const metadata: Metadata = {
  title: 'Anuncios | TCU TC-691',
  description: 'Lee los anuncios y actualizaciones sobre los proyectos, eventos y actividades del TCU TC-691.',
  keywords: [
    'anuncios',
    'noticias',
    'TCU',
    'TC-691',
    'actualizaciones',
    'eventos',
    'proyectos',
    'comunidad',
    'Costa Rica',
    'universidad',
    'tropicalización',
    'educación',
  ],
  openGraph: {
    title: 'Anuncios | TCU TC-691',
    description: 'Lee los anuncios y actualizaciones sobre los proyectos, eventos y actividades del TCU TC-691.',
    siteName: 'TCU TC-691',
    locale: 'es_CR',
    type: 'website',
  },
  alternates: {
    canonical: '/anuncios',
  },
};

export default function AnunciosPage() {
  return <ArticulosClient />;
}

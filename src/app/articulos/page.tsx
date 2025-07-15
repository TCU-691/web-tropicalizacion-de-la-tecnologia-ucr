
import type { Metadata } from 'next';
import { ArticulosClient } from './ArticulosClient';

export const metadata: Metadata = {
  title: 'Artículos e Información | TCU TC-691',
  description: 'Lee artículos, análisis y reflexiones sobre los proyectos, la filosofía y el impacto del TCU TC-691 en la comunidad.',
  keywords: [
    'artículos', 'información', 'TCU', 'TC-691', 'análisis', 'reflexiones', 'proyectos', 'comunidad', 'Costa Rica', 'universidad', 'tropicalización', 'educación'
  ],
  openGraph: {
    title: 'Artículos e Información | TCU TC-691',
    description: 'Lee artículos, análisis y reflexiones sobre los proyectos, la filosofía y el impacto del TCU TC-691 en la comunidad.',
    siteName: 'TCU TC-691',
    locale: 'es_CR',
    type: 'website',
  },
  alternates: {
    canonical: '/articulos',
  },
};

export default function ArticulosPage() {
  return <ArticulosClient />;
}

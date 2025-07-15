
import type { Metadata } from 'next';
import { GirasClient } from './GirasClient';

export const metadata: Metadata = {
  title: 'Giras y Actividades | TCU TC-691',
  description: 'Descubre las giras, talleres y actividades de campo organizadas por el TCU TC-691 para el aprendizaje y la vinculación comunitaria.',
  keywords: [
    'giras', 'actividades', 'TCU', 'TC-691', 'talleres', 'campo', 'comunidad', 'Costa Rica', 'universidad', 'aprendizaje', 'vinculación', 'tropicalización'
  ],
  openGraph: {
    title: 'Giras y Actividades | TCU TC-691',
    description: 'Descubre las giras, talleres y actividades de campo organizadas por el TCU TC-691 para el aprendizaje y la vinculación comunitaria.',
    siteName: 'TCU TC-691',
    locale: 'es_CR',
    type: 'website',
  },
  alternates: {
    canonical: '/giras',
  },
};

export default function GirasPage() {
  return <GirasClient />;
}


import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { ImageKitProvider } from '@imagekit/next';

export const metadata: Metadata = {
  title: 'TCU Tropicalización de la Tecnología',
  description: 'Innovación educativa desde el trópico: visibilizando proyectos, compartiendo conocimiento.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const imageKitUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (!imageKitUrlEndpoint) {
    console.warn(
      "NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is not defined in environment variables. " +
      "ImageKit <Image> components might not work as expected without a global urlEndpoint " +
      "or one provided directly as a prop if using relative image paths."
    );
  }
  
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          {/* 
            Pass imageKitUrlEndpoint (which could be undefined) directly.
            If undefined, ImageKitProvider context will not have a urlEndpoint.
            ImageKitImage components will then require an absolute src URL 
            or their own urlEndpoint prop for relative src paths.
            This is better than passing an empty string which causes an error.
          */}
          <ImageKitProvider urlEndpoint={imageKitUrlEndpoint}>
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <Footer />
            <Toaster />
          </ImageKitProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

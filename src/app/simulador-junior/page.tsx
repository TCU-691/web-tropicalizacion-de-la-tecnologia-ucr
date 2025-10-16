'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2, Construction, Upload, FileText } from 'lucide-react';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PowerProfileData {
  time: string[];
  power: number[];
}

export default function SimuladorJuniorPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<PowerProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV válido');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 10MB permitido.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);

      const response = await fetch('http://localhost:8000/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.detail || 'Error al procesar el archivo');
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      const data: PowerProfileData = await response.json();
      setUploadResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <Gamepad2 className="h-20 w-20 mx-auto mb-6 text-primary" />
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary mb-4">
          Simulador Junior
        </h1>
        <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto mb-8">
          ¡Prepárate para una experiencia de aprendizaje interactiva y divertida!
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 max-w-6xl mx-auto">
        {/* Original construction card */}
        <Card className="bg-accent/10">
          <CardHeader className="text-center">
            <Construction className="h-12 w-12 mx-auto mb-4 text-accent" />
            <CardTitle className="text-accent text-xl">¡En Construcción!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-foreground/80">
              El Simulador Junior está siendo desarrollado con mucho cariño. 
              <br />
              Muy pronto podrás explorar y aprender jugando. ¡Mantente atento!
            </p>
          </CardContent>
        </Card>

        {/* CSV Upload card */}
        <Card className="bg-primary/10">
          <CardHeader className="text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle className="text-primary text-xl">Analizador de Perfil de Potencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground/80 text-center">
              Sube un archivo CSV con datos de tiempo y potencia para analizarlo
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button
              onClick={triggerFileUpload}
              disabled={isUploading}
              className="w-full"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isUploading ? 'Procesando...' : 'Seleccionar archivo CSV'}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploadResult && (
              <Alert>
                <AlertDescription>
                  ¡Archivo procesado exitosamente! 
                  <br />
                  Datos encontrados: {uploadResult.time.length} registros de tiempo y potencia
                  <br />
                  <small className="text-muted-foreground">
                    Rango de potencia: {Math.min(...uploadResult.power).toFixed(2)} - {Math.max(...uploadResult.power).toFixed(2)} W
                  </small>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <Button asChild size="lg">
          <Link href="/">Volver al Inicio</Link>
        </Button>
      </div>
    </div>
  );
}

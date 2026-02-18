'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface FileUpload {
  id: string;
  file: File;
  type: string;
  customLabel?: string;
}

interface MultipleProfilesData {
  time: string[];
  profiles: Record<string, number[]>;
}

const PROFILE_TYPES = [
  { value: 'demand', label: 'Demanda de Energía' },
  { value: 'pv', label: 'Generación Solar (PV)' },
  { value: 'wind', label: 'Generación Eólica' },
  { value: 'hydro', label: 'Generación Hidráulica' },
  { value: 'other', label: 'Otro' },
];

export default function UploadProfilesPage() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<MultipleProfilesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: FileUpload[] = Array.from(selectedFiles).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      type: 'demand', // Default type
    }));

    // Validate file types
    const invalidFiles = newFiles.filter(f => !f.file.name.endsWith('.csv'));
    if (invalidFiles.length > 0) {
      setError(`Los siguientes archivos no son CSV válidos: ${invalidFiles.map(f => f.file.name).join(', ')}`);
      return;
    }

    // Validate file sizes (max 10MB each)
    const largeFiles = newFiles.filter(f => f.file.size > 10 * 1024 * 1024);
    if (largeFiles.length > 0) {
      setError(`Los siguientes archivos son demasiado grandes (máx 10MB): ${largeFiles.map(f => f.file.name).join(', ')}`);
      return;
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
    
    // Reset the input
    event.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setUploadResult(null);
  };

  const updateFileType = (id: string, type: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, type } : f))
    );
  };

  const updateCustomLabel = (id: string, customLabel: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, customLabel } : f))
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Por favor selecciona al menos un archivo CSV');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      files.forEach((fileUpload) => {
        formData.append('files', fileUpload.file);
      });

      console.log('Uploading files to backend...', files.map(f => f.file.name));

      const response = await fetch('http://localhost:8000/api/v1/upload-multiple', {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(errorData.detail || `Error HTTP: ${response.status}`);
      }

      const data: MultipleProfilesData = await response.json();
      setUploadResult(data);
      console.log('Upload successful:', data);
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = 'Error al subir los archivos';
      
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        errorMessage = 'No se puede conectar al servidor backend. Asegúrate de que esté corriendo en http://localhost:8000';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Cargar Perfiles de Energía</h1>
        <p className="text-muted-foreground">
          Sube múltiples archivos CSV con perfiles de generación y demanda de energía para el simulador
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleccionar Archivos CSV</CardTitle>
          <CardDescription>
            Cada archivo debe contener dos columnas: <code>timestamp</code> y <code>power</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File Selection */}
            <div>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium mb-1">
                    Haz clic para seleccionar archivos o arrástralos aquí
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV hasta 10MB cada uno (puedes seleccionar múltiples)
                  </p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </Label>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Files List */}
            {files.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Archivos seleccionados ({files.length})</h3>
                {files.map((fileUpload) => (
                  <Card key={fileUpload.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-3">
                          <div>
                            <p className="font-medium truncate">{fileUpload.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(fileUpload.file.size)}
                            </p>
                          </div>
                          
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`type-${fileUpload.id}`}>Tipo de perfil</Label>
                              <Select
                                value={fileUpload.type}
                                onValueChange={(value) => updateFileType(fileUpload.id, value)}
                              >
                                <SelectTrigger id={`type-${fileUpload.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PROFILE_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {fileUpload.type === 'other' && (
                              <div className="space-y-2">
                                <Label htmlFor={`label-${fileUpload.id}`}>Etiqueta personalizada</Label>
                                <Input
                                  id={`label-${fileUpload.id}`}
                                  placeholder="Ej: Generación geotérmica"
                                  value={fileUpload.customLabel || ''}
                                  onChange={(e) => updateCustomLabel(fileUpload.id, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(fileUpload.id)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {files.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Subiendo archivos...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir {files.length} archivo{files.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success Result */}
      {uploadResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-900">¡Archivos cargados exitosamente!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-green-900 mb-2">Resumen de datos:</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Puntos de tiempo:</span>
                  <span className="font-medium">{uploadResult.time.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Perfiles cargados:</span>
                  <span className="font-medium">{Object.keys(uploadResult.profiles).length}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-green-900 mb-2">Perfiles disponibles:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {Object.keys(uploadResult.profiles).map((profileName) => (
                  <li key={profileName}>
                    <span className="font-medium text-green-900">{profileName}</span> - {uploadResult.profiles[profileName].length} puntos de datos
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded p-3 border border-green-200">
              <p className="text-xs text-muted-foreground mb-1">Rango de tiempo:</p>
              <p className="text-sm font-mono">
                {uploadResult.time[0]} → {uploadResult.time[uploadResult.time.length - 1]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Formato de archivo esperado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>Cada archivo CSV debe contener las siguientes columnas:</p>
            <div className="bg-muted p-3 rounded font-mono text-xs">
              timestamp,power<br />
              2023-10-09 00:00:00,100.5<br />
              2023-10-09 00:15:00,95.2<br />
              2023-10-09 00:30:00,88.7<br />
              ...
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>timestamp:</strong> Fecha y hora en formato ISO o similar</li>
              <li><strong>power:</strong> Valor de potencia en kW</li>
              <li>Todos los archivos deben usar la misma serie temporal</li>
              <li>Los valores deben estar en el mismo intervalo de tiempo (ej: cada 15 minutos)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

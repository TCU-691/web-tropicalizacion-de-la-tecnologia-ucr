"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, CalendarDays, ListFilter, Loader2, MapPin, Search } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreTour } from '@/types/tour';
import { Image as ImageKitImage } from '@imagekit/next';

function TourCard({ tour }: { tour: FirestoreTour }) {
    return (
        <Card className="bg-card hover:shadow-lg transition-shadow duration-300 flex flex-col group">
            <CardHeader className="p-0">
                <div className="aspect-video relative w-full overflow-hidden rounded-t-lg">
                    <ImageKitImage
                        src={tour.imageUrl}
                        alt={`Imagen de ${tour.title}`}
                        layout="fill"
                        objectFit="cover"
                        className="transform group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint="tour cover"
                    />
                </div>
            </CardHeader>
            <CardHeader>
                <CardTitle className="flex items-start gap-3">
                    <MapPin className="h-6 w-6 text-secondary flex-shrink-0 mt-1" />
                    <span className="font-headline text-xl">{tour.title}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between p-5 pt-0">
                 <div className="flex items-center justify-between text-muted-foreground text-sm pl-9">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        <span>{tour.date}</span>
                    </div>
                    <Badge variant={tour.status === 'Realizada' ? 'outline' : 'secondary'}>{tour.status}</Badge>
                </div>
            </CardContent>
            <CardFooter className="p-5 pt-0">
                <Button asChild variant="outline" className="w-full">
                    <Link href={`/giras/${tour.slug}`}>
                        Ver más detalles <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export function GirasClient() {
    const [allTours, setAllTours] = useState<FirestoreTour[]>([]);
    const [filteredTours, setFilteredTours] = useState<FirestoreTour[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        async function fetchTours() {
            if (!db) {
                console.error("Firestore (db) is not initialized.");
                setIsLoading(false);
                return;
            }
            try {
                const toursCollection = collection(db, 'tours');
                const q = query(toursCollection, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const toursData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreTour));
                setAllTours(toursData);
                setFilteredTours(toursData);
            } catch (error) {
                console.error("Error fetching tours: ", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchTours();
    }, []);

    useEffect(() => {
        const filtered = allTours.filter(tour => {
            const matchesSearchTerm = tour.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      tour.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      tour.location.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || tour.status === statusFilter;
            return matchesSearchTerm && matchesStatus;
        });
        setFilteredTours(filtered);
    }, [searchTerm, statusFilter, allTours]);

    return (
        <div className="space-y-12">
            <section className="text-center py-10 bg-primary/5 rounded-lg">
                <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Giras y Actividades</h1>
                <p className="mt-3 text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto">
                    Descubre nuestras actividades de campo, talleres y visitas comunitarias.
                </p>
            </section>

            <section className="sticky top-16 z-40 bg-background/80 backdrop-blur-md py-4 rounded-lg shadow">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center p-4 border rounded-lg bg-card">
                        <div className="relative w-full md:flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Buscar giras..."
                                className="pl-10 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <ListFilter className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    <SelectItem value="Próximamente">Próximamente</SelectItem>
                                    <SelectItem value="Realizada">Realizada</SelectItem>
                                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                            {(searchTerm || statusFilter !== 'all') && (
                                <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                                    Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4">
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : filteredTours.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {filteredTours.map((tour) => (
                            <TourCard key={tour.id} tour={tour} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-headline text-2xl text-muted-foreground">No se encontraron giras</h3>
                        <p className="text-muted-foreground mt-2">Intenta ajustar tu búsqueda o filtros.</p>
                    </div>
                )}
            </section>
        </div>
    );
} 
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import type { FirestoreArticle } from '@/types/article';
import { ArticleCard } from '@/components/article-card';
import { Button } from '@/components/ui/button';
import { Newspaper, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function FeaturedAnnouncements() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState<FirestoreArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Solo cargar si el usuario está logueado Y no es invitado
    if (authLoading) return;
    
    if (!currentUser || userProfile?.rol === 'invitado') {
      setIsLoading(false);
      return;
    }

    const fetchArticles = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      try {
        const articlesCollection = collection(db, 'articles');
        const q = query(
          articlesCollection,
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const querySnapshot = await getDocs(q);
        const articlesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreArticle));
        setArticles(articlesData);
      } catch (error) {
        console.error("Error fetching featured articles: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, [currentUser, userProfile, authLoading]);

  // No mostrar nada si está cargando, no está autenticado o es invitado
  if (authLoading || !currentUser || userProfile?.rol === 'invitado') {
    return null;
  }

  // No mostrar sección si no hay anuncios
  if (!isLoading && articles.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4">
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
          <p className="text-muted-foreground">Cargando anuncios...</p>
        </div>
      ) : (
        <>
          <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary text-center mb-10 flex items-center justify-center gap-3">
            <Newspaper className="h-8 w-8" />
            Anuncios Recientes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild variant="link" className="text-lg text-accent hover:text-accent/80">
              <Link href="/anuncios">
                Ver todos los anuncios <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

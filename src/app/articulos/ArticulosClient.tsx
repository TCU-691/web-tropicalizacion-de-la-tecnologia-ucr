"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import type { FirestoreArticle } from '@/types/article';
import { ArticleCard } from '@/components/article-card';
import { Newspaper, Loader2, Search, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function ArticulosClient() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState<FirestoreArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<FirestoreArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
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
        const articlesCol = collection(db, 'articles');
        const q = query(articlesCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const articlesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreArticle));
        setArticles(articlesData);
        setFilteredArticles(articlesData);
      } catch (error) {
        console.error("Error fetching articles: ", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
  }, [currentUser, userProfile, authLoading]);

  useEffect(() => {
    const filtered = articles.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    );
    setFilteredArticles(filtered);
  }, [searchTerm, articles]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser || userProfile?.rol === 'invitado') {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Acceso Requerido</h2>
        <p className="text-muted-foreground mb-6">Debes iniciar sesión para ver los anuncios.</p>
        <Button asChild>
          <Link href="/login?redirect=/anuncios">Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-primary/5 rounded-lg shadow-sm">
        <Newspaper className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Anuncios</h1>
        <p className="mt-3 text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto">
          Mantente informado sobre novedades y cambios importantes.
        </p>
      </section>

      <section className="container mx-auto px-4 -mt-6">
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar anuncios..."
            className="pl-10 w-full text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar anuncios"
          />
        </div>
      </section>

      <section className="container mx-auto px-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
            <h3 className="font-headline text-2xl text-muted-foreground">No se encontraron anuncios</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Intenta ajustar tu búsqueda o vuelve más tarde para ver nuevos anuncios.
            </p>
          </div>
        )}
      </section>
    </div>
  );
} 
"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreArticle } from '@/types/article';
import { ArticleCard } from '@/components/article-card';
import { Newspaper, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function ArticulosClient() {
  const [articles, setArticles] = useState<FirestoreArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<FirestoreArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      try {
        const articlesCol = collection(db, 'articles');
        const q = query(articlesCol, where('status', '==', 'aprobado'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const articlesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreArticle));
        setArticles(articlesData);
        setFilteredArticles(articlesData);
      } catch (error) {
        console.error("Error fetching approved articles: ", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
  }, []);

  useEffect(() => {
    const filtered = articles.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredArticles(filtered);
  }, [searchTerm, articles]);

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-primary/5 rounded-lg shadow-sm">
        <Newspaper className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Artículos e Información</h1>
        <p className="mt-3 text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto">
          Explora análisis, historias y reflexiones de los proyectos y la filosofía de nuestro TCU.
        </p>
      </section>

      <section className="container mx-auto px-4 -mt-6">
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar artículos por título, resumen o categoría..."
            className="pl-10 w-full text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar artículos"
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
            <h3 className="font-headline text-2xl text-muted-foreground">No se encontraron artículos</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Intenta ajustar tu búsqueda o vuelve más tarde para ver nuevo contenido.
            </p>
          </div>
        )}
      </section>
    </div>
  );
} 
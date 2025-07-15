
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Heading {
  id: string;
  level: number;
  title: string;
}

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      let currentId = '';
      // Iterate backwards to find the last element that is above the viewport
      for (let i = headings.length - 1; i >= 0; i--) {
        const element = document.getElementById(headings[i].id);
        if (element && element.getBoundingClientRect().top < 150) {
          currentId = headings[i].id;
          break; // Found the active one
        }
      }
      setActiveId(currentId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Set initial active heading

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0 print:hidden">
      <div className="sticky top-28 space-y-3">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">En este artículo</h3>
        <nav>
          <ul className="space-y-2 text-sm">
            {headings.map(heading => (
              <li key={heading.id}>
                <Link
                  href={`#${heading.id}`}
                  className={`block transition-colors hover:text-primary ${
                    heading.level === 2 ? 'pl-4' : 'font-medium'
                  } ${
                    activeId === heading.id
                      ? 'text-primary'
                      : 'text-foreground/70'
                  }`}
                >
                  {heading.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function RequestHelp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label={label}>
          <span aria-hidden="true" className="inline-grid h-4 w-4 place-items-center rounded-full border border-current text-xs font-semibold leading-none">
            ?
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label={label} className="max-w-[calc(100vw-2rem)] text-sm">
        {children}
      </PopoverContent>
    </Popover>
  );
}

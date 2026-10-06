'use client';
import { useState } from 'react';

export function Avatar({ src, name, className = '' }: { src?: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-bold text-blue-600 ${className}`}>
    {src && failed !== src ? <img src={src} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailed(src)} /> : <span aria-hidden="true">{name[0]?.toUpperCase() || 'U'}</span>}
  </span>;
}

import React from 'react';
import { cn } from '@/utils';
import { User as UserIcon } from 'lucide-react';

export const Avatar = ({ src, alt, className, online, fallbackIcon }: { src?: string; alt?: string; className?: string; online?: boolean; fallbackIcon?: React.ReactNode }) => (
  <div className={cn("relative flex-shrink-0", className)}>
    {src ? (
      <img src={src} alt={alt} className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
    ) : (
      <div className="w-full h-full rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
        {fallbackIcon || <UserIcon size={20} />}
      </div>
    )}
    {online && (
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
    )}
  </div>
);

import React from 'react';
import { cn } from '@/utils';

export const ChatListSkeleton = () => (
  <div className="flex flex-col gap-4 p-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className="w-12 h-12 bg-slate-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

export const MessageSkeleton = () => (
  <div className="space-y-6 p-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className={cn("flex gap-3 max-w-[70%] animate-pulse", i % 2 === 0 ? "ml-auto flex-row-reverse" : "")}>
        <div className="w-8 h-8 bg-slate-200 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className={cn("h-10 bg-slate-200 rounded-2xl", i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none")} />
          <div className="h-3 bg-slate-200 rounded w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

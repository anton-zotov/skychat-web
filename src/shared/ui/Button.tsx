import React from 'react';
import { cn } from '@/utils';

export const Button = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 shadow-[0_10px_24px_-16px_rgba(2,132,199,0.9)]',
    secondary: 'border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.35)] hover:bg-slate-100 dark:border-white/10 dark:bg-white/8 dark:text-white dark:shadow-none dark:hover:bg-white/12',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/8',
    danger: 'text-rose-600 hover:bg-rose-50',
    destructive: 'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_10px_24px_-16px_rgba(244,63,94,0.9)]',
  };
  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-2xl transition-[transform,background-color,color,box-shadow,border-color] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-[#020817]",
        variants[variant as keyof typeof variants],
        className
      )} 
      {...props}
    >
      {children}
    </button>
  );
};

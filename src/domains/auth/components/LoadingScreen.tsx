import React from 'react';

export function LoadingScreen() {
  return (
    <div className="h-[100dvh] w-full flex items-center justify-center">
      <div className="rounded-[2rem] border border-white/70 bg-white/92 px-8 py-10 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-600 border-t-transparent" />
      </div>
    </div>
  );
}

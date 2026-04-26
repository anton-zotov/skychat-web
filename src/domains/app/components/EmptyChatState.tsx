import React from 'react';
import { MessageSquare } from 'lucide-react';

import { Button } from '@shared/ui/Button';

export function EmptyChatState({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-1 items-center justify-center p-6 md:p-12"
    >
      <div className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_70px_-40px_rgba(15,23,42,0.3)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_24px_80px_-48px_rgba(2,6,23,0.95)]">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-sky-100 text-sky-700 shadow-inner dark:bg-sky-500/15 dark:text-sky-300">
          <MessageSquare size={40} />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
          Ready to chat
        </p>
        <h3 className="text-2xl font-bold text-slate-950 dark:text-white">
          Выберите чат, чтобы продолжить разговор
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/60">
          Откройте существующий диалог слева или начните новый чат, если хотите
          быстро связаться с контактом или командой.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-medium text-slate-500 dark:text-white/55">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/10 dark:text-white/70">
            Поиск по чатам
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/10 dark:text-white/70">
            Быстрый старт
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/10 dark:text-white/70">
            Групповые разговоры
          </span>
        </div>
        <Button
          variant="primary"
          className="mt-6 px-6 py-2.5 md:hidden"
          onClick={onOpenSidebar}
        >
          К списку чатов
        </Button>
      </div>
    </div>
  );
}

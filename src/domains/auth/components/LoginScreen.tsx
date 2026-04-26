import React from 'react';

import { signInWithGoogle } from '@/firebase';
import { AppLogo } from '@shared/ui/AppLogo';
import { Button } from '@shared/ui/Button';

export function LoginScreen() {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 rounded-[2rem] border border-white/70 bg-white/92 p-8 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_30px_90px_-50px_rgba(2,6,23,0.95)]">
        <div className="mx-auto flex w-full justify-center">
          <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(224,242,254,0.95),rgba(240,249,255,0.85))] p-4 shadow-inner dark:bg-[linear-gradient(180deg,rgba(14,165,233,0.22),rgba(2,132,199,0.12))]">
            <AppLogo size={80} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
            Fast, familiar messaging
          </p>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
            SkyChat Messenger
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600 dark:text-white/60">
            Общайтесь в реальном времени, возвращайтесь к важным файлам и
            продолжайте разговор с любого устройства.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-sky-50/80 p-3 text-left text-[11px] font-medium text-slate-600 dark:bg-sky-500/10 dark:text-white/70">
          <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-white/10">
            Чаты
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-white/10">
            Файлы
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-white/10">
            Поиск
          </div>
        </div>

        <Button
          data-testid="google-sign-in-button"
          onClick={signInWithGoogle}
          className="w-full py-4 text-lg font-semibold"
        >
          Войти через Google
        </Button>

        <p className="text-xs leading-5 text-slate-500 dark:text-white/50">
          Вход откроет ваш список чатов и сохранит персональные настройки темы и
          уведомлений.
        </p>
      </div>
    </div>
  );
}

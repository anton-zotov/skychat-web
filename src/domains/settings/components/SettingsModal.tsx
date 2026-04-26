import React from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { Clock, Eye, Settings, Shield, X } from 'lucide-react';

import { db } from '@/firebase';
import { cn } from '@/utils';
import { updatePrivacy } from '@domains/settings/services/privacyService';
import { Theme } from '@shared/hooks/useTheme';
import { UserProfile } from '@shared/types';
import { Button } from '@shared/ui/Button';

type SettingsModalProps = {
  currentUserId: string;
  onClose: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export function SettingsModal({
  currentUserId,
  onClose,
  theme,
  setTheme,
}: SettingsModalProps) {
  const [userDoc] = useDocument(doc(db, 'users', currentUserId));
  const userData = userDoc?.data() as UserProfile | undefined;

  const handleUpdatePrivacy = async (
    key: 'showLastSeen' | 'showOnlineStatus',
    value: boolean,
  ) => {
    await updatePrivacy(currentUserId, key, value);
  };

  const lastSeenVisible = userData?.privacy?.showLastSeen !== false;
  const onlineVisible = userData?.privacy?.showOnlineStatus !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm dark:bg-slate-950/70 md:p-6">
      <div
        data-testid="settings-modal"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_30px_90px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-[#020817]/95 dark:shadow-[0_32px_96px_-48px_rgba(2,6,23,0.95)]"
      >
        <header className="border-b border-slate-100 px-5 py-5 dark:border-white/10 md:px-6 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                <Settings size={20} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                  Preferences
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  Настройки
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/60">
                  Управляйте видимостью статуса, уведомлениями и внешним видом
                  интерфейса.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              className="h-10 w-10 shrink-0 rounded-2xl dark:text-white/55 dark:hover:bg-white/5"
              onClick={onClose}
              title="Закрыть настройки"
            >
              <X size={20} />
            </Button>
          </div>
        </header>

        <div className="space-y-6 p-5 md:p-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-white/45">
              <Shield size={16} />
              <span className="text-xs font-bold uppercase tracking-[0.24em]">
                Приватность
              </span>
            </div>

            <div className="space-y-2">
              <PreferenceToggleCard
                icon={<Clock size={18} />}
                title="Время последнего входа"
                description="Показывать, когда вы были в сети"
                checked={lastSeenVisible}
                onClick={() =>
                  handleUpdatePrivacy('showLastSeen', !lastSeenVisible)
                }
                testId="toggle-last-seen-button"
              />

              <PreferenceToggleCard
                icon={<Eye size={18} />}
                title='Статус "В сети"'
                description="Показывать, что вы сейчас онлайн"
                checked={onlineVisible}
                onClick={() =>
                  handleUpdatePrivacy('showOnlineStatus', !onlineVisible)
                }
                testId="toggle-online-status-button"
              />
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              Если скрыть статус, вы тоже перестанете видеть статус других
              пользователей.
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-white/45">
              <Settings size={16} />
              <span className="text-xs font-bold uppercase tracking-[0.24em]">
                Внешний вид
              </span>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-black/25 dark:text-white/75 dark:shadow-none">
                    <Eye size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Тема оформления
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55">
                      Светлая, тёмная или автоматическая тема по системным
                      настройкам.
                    </p>
                  </div>
                </div>

                <select
                  data-testid="theme-select"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as Theme)}
                  className="min-w-[7.5rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-black/30 dark:text-white"
                >
                  <option value="light">Светлая</option>
                  <option value="dark">Тёмная</option>
                  <option value="system">Системная</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-100 bg-white/90 px-5 py-4 dark:border-white/10 dark:bg-black/15 md:px-6">
          <Button className="w-full py-3 font-bold" onClick={onClose}>
            Готово
          </Button>
        </footer>
      </div>
    </div>
  );
}

type PreferenceToggleCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
  testId: string;
};

function PreferenceToggleCard({
  icon,
  title,
  description,
  checked,
  onClick,
  testId,
}: PreferenceToggleCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-black/25 dark:text-white/75 dark:shadow-none">
            {icon}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55">
              {description}
            </p>
          </div>
        </div>

        <button
          data-testid={testId}
          onClick={onClick}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20',
            checked ? 'bg-sky-600' : 'bg-slate-300',
          )}
        >
          <span
            className={cn(
              'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
              checked ? 'left-6' : 'left-1',
            )}
          />
        </button>
      </div>
    </div>
  );
}

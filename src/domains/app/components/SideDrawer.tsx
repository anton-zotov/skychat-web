import React from 'react';
import { Bell, BellOff, LogOut, MessageSquare, Settings, X } from 'lucide-react';

import { logout } from '@/firebase';
import { APP_VERSION } from '@shared/constants';
import { AppLogo } from '@shared/ui/AppLogo';
import { Avatar } from '@shared/ui/Avatar';
import { Button } from '@shared/ui/Button';
import { cn } from '@/utils';

type SideDrawerProps = {
  isOpen: boolean;
  totalUnreadCount: number;
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  notifPermission: NotificationPermission;
  onClose: () => void;
  onOpenSettings: () => void;
  onRequestNotifications: () => void;
};

export function SideDrawer({
  isOpen,
  totalUnreadCount,
  user,
  notifPermission,
  onClose,
  onOpenSettings,
  onRequestNotifications,
}: SideDrawerProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-slate-950/75"
          onClick={onClose}
        />
      )}

      <div
        data-testid="side-drawer"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] shadow-[0_24px_60px_-32px_rgba(15,23,42,0.5)] transform transition-transform duration-300 ease-in-out flex flex-col pt-safe backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,8,23,0.96),rgba(8,15,33,0.95))] dark:shadow-[0_24px_70px_-34px_rgba(2,6,23,0.95)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 border-b border-slate-200/80 flex flex-col gap-4 bg-sky-50/70 dark:border-white/10 dark:bg-sky-500/10">
          <div className="flex items-center justify-between">
            <AppLogo size={40} showBadge={totalUnreadCount > 0} />
            <Button variant="ghost" className="w-10 h-10 rounded-full dark:text-white/70 dark:hover:bg-white/10" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Avatar
              src={user.photoURL || undefined}
              alt={user.displayName || ''}
              className="w-12 h-12 border-2 border-white shadow-sm dark:border-white/20"
            />
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-slate-900 truncate dark:text-white">{user.displayName}</span>
              <span className="text-xs text-slate-500 truncate dark:text-white/60">{user.email}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-sky-700 bg-sky-50 border border-sky-100 dark:border-sky-400/25 dark:bg-sky-500/12 dark:text-sky-200" onClick={onClose}>
            <MessageSquare size={20} />
            <span className="font-medium">Сообщения</span>
          </Button>
          <Button
            data-testid="request-notifications-button"
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 h-12 dark:hover:bg-white/10',
              notifPermission === 'granted'
                ? 'text-emerald-600 bg-emerald-50/80 dark:bg-emerald-500/12 dark:text-emerald-200'
                : 'text-slate-700 dark:text-white/70'
            )}
            onClick={onRequestNotifications}
          >
            {notifPermission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
            <span className="font-medium">Уведомления</span>
          </Button>
          <Button
            data-testid="open-settings-button"
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-slate-700 dark:text-white/70 dark:hover:bg-white/10"
            onClick={onOpenSettings}
          >
            <Settings size={20} />
            <span className="font-medium">Настройки</span>
          </Button>
          <div className="my-2 border-t border-slate-200 dark:border-white/10" />
          <Button
            data-testid="logout-button"
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/12 dark:hover:text-rose-200"
            onClick={logout}
          >
            <LogOut size={20} />
            <span className="font-medium">Выйти</span>
          </Button>
        </nav>

        <div className="p-4 border-t border-slate-200 text-center bg-white/70 dark:border-white/10 dark:bg-black/20">
          <span className="text-xs font-medium text-slate-400 dark:text-white/45">{APP_VERSION}</span>
        </div>
      </div>
    </>
  );
}

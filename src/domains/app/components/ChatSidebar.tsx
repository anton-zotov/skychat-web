import React from 'react';
import { Menu, Plus, Search } from 'lucide-react';

import { cn } from '@/utils';
import { ChatList } from '@domains/chat/components/ChatList';
import { UserProfile, type Chat } from '@shared/types';
import { Button } from '@shared/ui/Button';

type ChatSidebarProps = {
  currentUserId: string;
  selectedChatId: string | null;
  chats: Chat[];
  users: Record<string, UserProfile>;
  currentUserData?: UserProfile;
  loading: boolean;
  searchQuery: string;
  isSidebarOpen: boolean;
  totalUnreadCount: number;
  onSearchChange: (value: string) => void;
  onOpenDrawer: () => void;
  onOpenNewChat: () => void;
  onSelectChat: (chatId: string) => void;
};

export function ChatSidebar({
  currentUserId,
  selectedChatId,
  chats,
  users,
  currentUserData,
  loading,
  searchQuery,
  isSidebarOpen,
  totalUnreadCount,
  onSearchChange,
  onOpenDrawer,
  onOpenNewChat,
  onSelectChat,
}: ChatSidebarProps) {
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <section
      className={cn(
        'flex w-full flex-shrink-0 flex-col border-r border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.92))] pt-safe backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,8,23,0.94),rgba(8,15,33,0.9))] md:w-[22rem]',
        !isSidebarOpen && 'hidden md:flex',
      )}
    >
      <header className="space-y-4 px-4 pb-3 pt-4 md:px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                data-testid="open-drawer-button"
                variant="ghost"
                className="h-11 w-11 rounded-2xl"
                onClick={onOpenDrawer}
                title="Открыть меню"
              >
                <Menu size={22} />
              </Button>
              {totalUnreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-sky-600 px-1 text-[10px] font-bold text-white dark:border-[#081021]">
                  {Math.min(totalUnreadCount, 99)}
                </span>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                Inbox
              </p>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Сообщения
              </h2>
            </div>
          </div>

          <Button
            data-testid="open-new-chat-button"
            variant="secondary"
            className="h-11 w-11 rounded-2xl"
            onClick={onOpenNewChat}
            title="Новый чат"
          >
            <Plus size={20} />
          </Button>
        </div>

        <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-3 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35"
              size={18}
            />
            <input
              data-testid="chat-search-input"
              type="text"
              placeholder="Поиск по чатам"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35 dark:focus:bg-black/35"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-white/50">
              {hasSearch
                ? `Найдено чатов: ${chats.length}`
                : 'Недавние и закрепленные разговоры'}
            </span>
            {hasSearch && (
              <button
                type="button"
                className="font-medium text-sky-700 transition-colors hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                onClick={() => onSearchChange('')}
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        data-testid="chat-list"
        className="flex-1 overflow-y-auto px-2 pb-4 md:px-3 md:pb-5"
      >
        <ChatList
          currentUserId={currentUserId}
          selectedId={selectedChatId}
          onSelect={onSelectChat}
          chats={chats}
          users={users}
          currentUserData={currentUserData}
          loading={loading}
        />
      </div>
    </section>
  );
}

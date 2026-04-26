import React from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { Bookmark, ChevronRight } from 'lucide-react';

import { db } from '@/firebase';
import { cn } from '@/utils';
import { ECHO_BOT_USER } from '@shared/constants';
import { Avatar } from '@shared/ui/Avatar';
import { Chat, UserProfile } from '@shared/types';

export function ChatList({
  currentUserId,
  selectedId,
  onSelect,
  chats,
  users,
  currentUserData,
  loading,
}: {
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  chats: Chat[];
  users: Record<string, UserProfile>;
  currentUserData?: UserProfile;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-5 text-center text-sm text-slate-500 dark:text-white/55">
        Загружаем список чатов…
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="mx-2 rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 px-5 py-6 text-center dark:border-white/12 dark:bg-white/[0.04]">
        <p className="text-sm font-medium text-slate-700 dark:text-white/85">
          Чаты не найдены
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/50">
          Попробуйте другой запрос или начните новый разговор.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {chats.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          isActive={selectedId === chat.id}
          onClick={() => onSelect(chat.id)}
          currentUserId={currentUserId}
          currentUserPrivacy={currentUserData?.privacy}
        />
      ))}
    </div>
  );
}

interface ChatItemProps {
  key?: React.Key;
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
  currentUserPrivacy?: UserProfile['privacy'];
}

function ChatItem({
  chat,
  isActive,
  onClick,
  currentUserId,
  currentUserPrivacy,
}: ChatItemProps) {
  const isSaved = chat.type === 'saved';
  const otherParticipantId = chat.participants.find((id) => id !== currentUserId);
  const [otherUserValue] = useDocument(
    !isSaved && otherParticipantId && otherParticipantId !== 'echo_bot'
      ? doc(db, 'users', otherParticipantId)
      : null,
  );
  const otherUser =
    otherParticipantId === 'echo_bot'
      ? ECHO_BOT_USER
      : (otherUserValue?.data() as UserProfile | undefined);

  const name = isSaved
    ? 'Свои сообщения'
    : chat.type === 'group'
      ? chat.name
      : otherUser?.displayName || 'Загрузка…';
  const photo = isSaved || chat.type === 'group' ? undefined : otherUser?.photoURL;
  const unreadCount = chat.unreadCount?.[currentUserId] || 0;
  const preview = chat.lastMessage?.text || 'Нет сообщений';
  const isOnline =
    !isSaved &&
    (otherParticipantId === 'echo_bot' ||
      (otherUser?.lastSeen &&
        typeof otherUser.lastSeen.toMillis === 'function' &&
        Date.now() - otherUser.lastSeen.toMillis() < 120000));

  const myShowOnline = currentUserPrivacy?.showOnlineStatus !== false;
  const theirShowOnline = otherUser?.privacy?.showOnlineStatus !== false;
  const canSeeOnline = !isSaved && myShowOnline && theirShowOnline;

  return (
    <button
      type="button"
      data-testid={`chat-row-${chat.id}`}
      onClick={onClick}
      className={cn(
        'w-full rounded-[1.4rem] border px-3.5 py-3 text-left transition-all',
        isActive
          ? 'border-sky-200 bg-sky-50 shadow-[0_18px_32px_-28px_rgba(2,132,199,0.9)] dark:border-sky-400/25 dark:bg-sky-500/12 dark:shadow-none'
          : 'border-transparent bg-white/70 hover:border-slate-200 hover:bg-white dark:bg-white/[0.05] dark:hover:border-white/10 dark:hover:bg-white/[0.08]',
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={photo}
          alt={name}
          className="h-11 w-11"
          online={canSeeOnline && isOnline}
          fallbackIcon={isSaved ? <Bookmark size={18} /> : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4
                className={cn(
                  'truncate text-sm font-semibold',
                  isActive
                    ? 'text-sky-950 dark:text-sky-100'
                    : 'text-slate-900 dark:text-white'
                )}
              >
                {name}
              </h4>
              <p className="mt-1 line-clamp-1 pr-3 text-xs leading-5 text-slate-500 dark:text-white/50">
                {preview}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {chat.updatedAt && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    isActive
                      ? 'bg-white text-sky-700 dark:bg-sky-950/80 dark:text-sky-200'
                      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/45',
                  )}
                >
                  {new Date(chat.updatedAt.toDate()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {unreadCount > 0 ? (
                <span className="min-w-[22px] rounded-full bg-sky-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              ) : (
                <ChevronRight
                  size={14}
                  className={cn(
                    'mt-0.5',
                    isActive
                      ? 'text-sky-500 dark:text-sky-300'
                      : 'text-slate-300 dark:text-white/20',
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

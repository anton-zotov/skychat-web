import React, { useMemo, useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { CheckCheck, Search, Sparkles, Users, X } from 'lucide-react';

import { db } from '@/firebase';
import { cn } from '@/utils';
import { createChat } from '@domains/chat/services/chatService';
import { ECHO_BOT_USER } from '@shared/constants';
import { UserProfile } from '@shared/types';
import { Avatar } from '@shared/ui/Avatar';
import { Button } from '@shared/ui/Button';

type NewChatModalProps = {
  currentUserId: string;
  onClose: () => void;
  onChatCreated: (id: string) => void;
};

export function NewChatModal({
  currentUserId,
  onClose,
  onChatCreated,
}: NewChatModalProps) {
  const [usersValue, loading] = useCollection(collection(db, 'users'));
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [contactQuery, setContactQuery] = useState('');

  const users = useMemo(
    () => [
      ECHO_BOT_USER,
      ...((usersValue?.docs
        .map((doc) => doc.data() as UserProfile)
        .filter((user) => user.uid !== currentUserId) ?? [])),
    ],
    [currentUserId, usersValue],
  );

  const selectedContacts = useMemo(
    () => users.filter((user) => selectedUsers.includes(user.uid)),
    [selectedUsers, users],
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = contactQuery.trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((user) =>
      user.displayName.toLowerCase().includes(normalizedQuery),
    );
  }, [contactQuery, users]);

  const isGroupMode = selectedUsers.length > 1 || groupName.trim().length > 0;
  const modeLabel = isGroupMode ? 'Групповой чат' : 'Личный чат';
  const helperText = isGroupMode
    ? 'Выберите нескольких участников и при необходимости задайте название группы.'
    : 'Выберите одного участника, чтобы открыть или продолжить личный разговор.';

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const chatId = await createChat(currentUserId, selectedUsers, groupName);
      onChatCreated(chatId);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm dark:bg-slate-950/70 md:p-6">
      <div
        data-testid="new-chat-modal"
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_30px_90px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-[#020817]/95 dark:shadow-[0_32px_96px_-48px_rgba(2,6,23,0.95)]"
      >
        <header className="border-b border-slate-100 px-5 py-5 dark:border-white/10 md:px-6 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                New conversation
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                Новый разговор
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/60">
                {helperText}
              </p>
            </div>
            <Button
              variant="ghost"
              className="h-10 w-10 shrink-0 rounded-2xl"
              onClick={onClose}
              title="Закрыть окно"
            >
              <X size={20} />
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/12 dark:text-sky-200">
              <Sparkles size={14} />
              {modeLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-white/60">
              <Users size={14} />
              Участников: {selectedUsers.length}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">
              Название группы
            </label>
            <input
              data-testid="new-chat-group-name-input"
              type="text"
              placeholder="Например, Release Crew"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-500 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35 dark:focus:bg-black/35"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">
              Поиск контактов
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35"
                size={18}
              />
              <input
                data-testid="new-chat-contact-search-input"
                type="text"
                placeholder="Введите имя контакта"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35 dark:focus:bg-black/35"
                value={contactQuery}
                onChange={(event) => setContactQuery(event.target.value)}
              />
            </div>
          </div>

          {selectedContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">
                Выбранные участники
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedContacts.map((contact) => (
                  <button
                    key={contact.uid}
                    type="button"
                    data-testid={`selected-contact-chip-${contact.uid}`}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 dark:border-sky-400/20 dark:bg-sky-500/12 dark:text-sky-100"
                    onClick={() =>
                      setSelectedUsers((prev) =>
                        prev.filter((id) => id !== contact.uid),
                      )
                    }
                  >
                    <Avatar
                      src={contact.photoURL}
                      alt={contact.displayName}
                      className="h-5 w-5"
                    />
                    <span>{contact.displayName}</span>
                    <X size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-white/45">
              Контакты
            </label>
            <div className="space-y-1.5">
              {loading ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-white/[0.04] dark:text-white/55">
                  Загрузка контактов…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center dark:border-white/12 dark:bg-white/[0.04]">
                  <p className="text-sm font-medium text-slate-700 dark:text-white/85">
                    Ничего не найдено
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                    Попробуйте изменить запрос или очистить поиск.
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUsers.includes(user.uid);

                  return (
                    <div
                      data-testid={`contact-option-${user.uid}`}
                      key={user.uid}
                      onClick={() => {
                        setSelectedUsers((prev) =>
                          prev.includes(user.uid)
                            ? prev.filter((id) => id !== user.uid)
                            : [...prev, user.uid],
                        );
                      }}
                      className={cn(
                        'cursor-pointer rounded-[1.35rem] border px-3.5 py-3 transition-all',
                        isSelected
                          ? 'border-sky-200 bg-sky-50 shadow-[0_16px_28px_-24px_rgba(2,132,199,0.9)] dark:border-sky-400/25 dark:bg-sky-500/12 dark:shadow-none'
                          : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white dark:bg-white/[0.05] dark:hover:border-white/10 dark:hover:bg-white/[0.08]',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.photoURL}
                          alt={user.displayName}
                          className="h-10 w-10"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {user.displayName}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-white/50">
                            {user.email || 'Готов к разговору'}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full border transition-all',
                            isSelected
                              ? 'border-sky-600 bg-sky-600 text-white'
                              : 'border-slate-300 text-transparent dark:border-white/18'
                          )}
                        >
                          <CheckCheck size={13} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-100 bg-white/90 px-5 py-4 dark:border-white/10 dark:bg-black/15 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-slate-500 dark:text-white/55">
              {selectedUsers.length === 0
                ? 'Выберите хотя бы одного участника, чтобы продолжить.'
                : 'Нажмите, чтобы создать чат и перейти к разговору.'}
            </p>
            <Button
              data-testid="create-chat-button"
              className="min-w-[10rem] shrink-0 px-5 py-3 font-bold"
              disabled={selectedUsers.length === 0}
              onClick={handleCreate}
            >
              Создать чат
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

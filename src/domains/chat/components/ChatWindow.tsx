import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDocument, useCollection } from 'react-firebase-hooks/firestore';
import { doc, query, collection, orderBy, limit, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ChevronLeft, Search, MoreVertical, Calendar, ArrowDown, Bookmark, Phone, X } from 'lucide-react';
import { db } from '@/firebase';
import { Chat, Message, UserProfile, Call } from '@shared/types';
import { Button } from '@shared/ui/Button';
import { Avatar } from '@shared/ui/Avatar';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ECHO_BOT_USER } from '@shared/constants';
import { initiateCall } from '@domains/call/services/callService';
import { cn } from '@/utils';

const BOTTOM_THRESHOLD_PX = 50;
const MEDIA_SETTLE_WINDOW_MS = 1500;

export function ChatWindow({ chatId, currentUserId, onBack, setActiveCall }: { chatId: string; currentUserId: string; onBack: () => void, setActiveCall: (call: Call | null) => void }) {
  const [chatValue] = useDocument(doc(db, 'chats', chatId));
  const chat = useMemo(() => {
    if (!chatValue?.exists()) return undefined;
    return { id: chatValue.id, ...chatValue.data() } as Chat;
  }, [chatValue]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const pendingLoadMoreAnchorRef = useRef<{ messageId: string; offsetTop: number } | null>(null);
  const isRestoringLoadMoreRef = useRef(false);
  const loadMoreRestoreDeadlineRef = useRef(0);
  const scrollToBottomFrameRef = useRef<number | null>(null);
  const settleScrollDeadlineRef = useRef(0);
  const isAutoScrollingRef = useRef(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [msgLimit, setMsgLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const isFirstLoadRef = useRef(true);
  const lastScrollHeightRef = useRef<number>(0);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const captureLoadMoreAnchor = (container: HTMLDivElement) => {
    const containerRect = container.getBoundingClientRect();
    const firstVisibleMessage = Array.from(
      container.querySelectorAll<HTMLElement>('[data-testid^="message-"]')
    ).find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > containerRect.top + 4;
    });

    if (!firstVisibleMessage) {
      pendingLoadMoreAnchorRef.current = null;
      return;
    }

    const testId = firstVisibleMessage.getAttribute('data-testid') || '';
    if (!testId.startsWith('message-')) {
      pendingLoadMoreAnchorRef.current = null;
      return;
    }

    pendingLoadMoreAnchorRef.current = {
      messageId: testId.slice('message-'.length),
      offsetTop: firstVisibleMessage.getBoundingClientRect().top - containerRect.top,
    };
  };

  const isNearBottom = (container: HTMLDivElement) =>
    container.scrollHeight - container.scrollTop - container.clientHeight < BOTTOM_THRESHOLD_PX;

  const shouldKeepPinned = () => isPinnedRef.current || Date.now() < settleScrollDeadlineRef.current;

  const queueScrollToBottom = ({ settle = false }: { settle?: boolean } = {}) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isPinnedRef.current = true;
    setShowScrollButton(false);

    if (settle) {
      settleScrollDeadlineRef.current = Math.max(
        settleScrollDeadlineRef.current,
        Date.now() + MEDIA_SETTLE_WINDOW_MS
      );
    }

    if (scrollToBottomFrameRef.current !== null) {
      return;
    }

    scrollToBottomFrameRef.current = window.requestAnimationFrame(() => {
      scrollToBottomFrameRef.current = null;

      const nextContainer = scrollContainerRef.current;
      if (!nextContainer || isLoadingMore || isRestoringLoadMoreRef.current) {
        return;
      }

      isAutoScrollingRef.current = true;
      nextContainer.scrollTop = nextContainer.scrollHeight;
      window.requestAnimationFrame(() => {
        isAutoScrollingRef.current = false;
      });
    });
  };

  const restoreLoadMoreAnchor = (container: HTMLDivElement) => {
    const anchor = pendingLoadMoreAnchorRef.current;
    if (!anchor) return false;

    const anchoredMessage = container.querySelector<HTMLElement>(
      `[data-testid="message-${anchor.messageId}"]`
    );

    if (!anchoredMessage) return false;

    const containerRect = container.getBoundingClientRect();
    const anchoredTop = anchoredMessage.getBoundingClientRect().top - containerRect.top;
    const delta = anchoredTop - anchor.offsetTop;

    if (Math.abs(delta) > 0.5) {
      container.scrollTop += delta;
    }

    return true;
  };

  const otherParticipantId = chat?.participants.find(id => id !== currentUserId);
  const [otherUserValue] = useDocument(otherParticipantId && otherParticipantId !== 'echo_bot' ? doc(db, 'users', otherParticipantId) : null);
  const otherUser = otherParticipantId === 'echo_bot' ? ECHO_BOT_USER : (otherUserValue?.data() as UserProfile | undefined);

  const [messagesValue] = useCollection(
    query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      ...(isSearchOpen ? [] : [limit(msgLimit)])
    )
  );

  useEffect(() => {
    if (messagesValue) {
      if (messagesValue.docs.length < msgLimit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    }
  }, [messagesValue, msgLimit]);

  const allMessages = useMemo(() => {
    const msgs = messagesValue?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)) || [];
    return [...msgs].reverse();
  }, [messagesValue]);

  const messages = useMemo(() => {
    if (!isSearchOpen || (!messageSearchQuery && !searchDateFrom && !searchDateTo)) return allMessages;
    
    return allMessages.filter(msg => {
      let match = true;
      
      if (messageSearchQuery) {
        const text = msg.text?.toLowerCase() || '';
        const fileName = msg.fileName?.toLowerCase() || '';
        const searchQueryLowerCase = messageSearchQuery.toLowerCase();
        if (!text.includes(searchQueryLowerCase) && !fileName.includes(searchQueryLowerCase)) {
          match = false;
        }
      }
      
      if (match && searchDateFrom) {
        const msgDate = msg.createdAt?.toDate();
        if (msgDate) {
          const fromDate = new Date(searchDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (msgDate < fromDate) match = false;
        }
      }
      
      if (match && searchDateTo) {
        const msgDate = msg.createdAt?.toDate();
        if (msgDate) {
          const toDate = new Date(searchDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (msgDate > toDate) match = false;
        }
      }
      
      return match;
    });
  }, [allMessages, isSearchOpen, messageSearchQuery, searchDateFrom, searchDateTo]);

  const activeSearchFilters = useMemo(() => {
    let count = 0;
    if (messageSearchQuery.trim()) count += 1;
    if (searchDateFrom) count += 1;
    if (searchDateTo) count += 1;
    return count;
  }, [messageSearchQuery, searchDateFrom, searchDateTo]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !messages.length) return;

    if (isLoadingMore) {
      // Preserve viewport around the first visible message while older content is prepended.
      const restored = restoreLoadMoreAnchor(container);
      if (!restored) {
        // Fallback for cases where the anchor message is no longer in the rendered list.
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - lastScrollHeightRef.current;
        isRestoringLoadMoreRef.current = false;
        pendingLoadMoreAnchorRef.current = null;
      }
      setIsLoadingMore(false);
      return;
    }

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      queueScrollToBottom({ settle: true });
    } else if (isPinnedRef.current) {
      queueScrollToBottom({ settle: true });
    }
  }, [messages, isLoadingMore, replyTo]);

  useEffect(() => {
    const content = contentRef.current;
    const container = scrollContainerRef.current;
    if (!content || !container) return;

    const observer = new ResizeObserver(() => {
      if (isRestoringLoadMoreRef.current) {
        if (Date.now() > loadMoreRestoreDeadlineRef.current) {
          isRestoringLoadMoreRef.current = false;
          pendingLoadMoreAnchorRef.current = null;
          return;
        }

        const restored = restoreLoadMoreAnchor(container);
        if (!restored) {
          isRestoringLoadMoreRef.current = false;
          pendingLoadMoreAnchorRef.current = null;
        }
        return;
      }

      if (!isLoadingMore && !isFirstLoadRef.current && shouldKeepPinned()) {
        queueScrollToBottom();
      }
    });

    observer.observe(content);

    const handleMediaLoad = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement || target instanceof HTMLVideoElement)) {
        return;
      }

      if (!isLoadingMore && !isFirstLoadRef.current && shouldKeepPinned()) {
        queueScrollToBottom();
      }
    };

    content.addEventListener('load', handleMediaLoad, true);
    content.addEventListener('loadedmetadata', handleMediaLoad, true);

    return () => {
      observer.disconnect();
      content.removeEventListener('load', handleMediaLoad, true);
      content.removeEventListener('loadedmetadata', handleMediaLoad, true);
    };
  }, [isLoadingMore]);

  useEffect(() => () => {
    if (scrollToBottomFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollToBottomFrameRef.current);
    }
  }, []);

  useEffect(() => {
    isFirstLoadRef.current = true;
    isPinnedRef.current = true;
    setMsgLimit(50);
    setHasMore(true);
    setReplyTo(null);
    pendingLoadMoreAnchorRef.current = null;
    isRestoringLoadMoreRef.current = false;
    loadMoreRestoreDeadlineRef.current = 0;
    settleScrollDeadlineRef.current = 0;
    isAutoScrollingRef.current = false;
    if (scrollToBottomFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollToBottomFrameRef.current);
      scrollToBottomFrameRef.current = null;
    }
  }, [chatId]);

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    
    const container = scrollContainerRef.current;
    if (container) {
      lastScrollHeightRef.current = container.scrollHeight;
      captureLoadMoreAnchor(container);
    }
    
    isRestoringLoadMoreRef.current = true;
    loadMoreRestoreDeadlineRef.current = Date.now() + 3000;
    setIsLoadingMore(true);
    setMsgLimit(prev => prev + 50);
  };

  const onScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceFromBottom < BOTTOM_THRESHOLD_PX;
    isPinnedRef.current = isAtBottom;
    setShowScrollButton(!isAtBottom);

    if (!isAtBottom && (!isAutoScrollingRef.current || distanceFromBottom > BOTTOM_THRESHOLD_PX * 4)) {
      settleScrollDeadlineRef.current = 0;
      if (scrollToBottomFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollToBottomFrameRef.current);
        scrollToBottomFrameRef.current = null;
      }
    }

    if (isRestoringLoadMoreRef.current && (isAtBottom || Date.now() > loadMoreRestoreDeadlineRef.current)) {
      isRestoringLoadMoreRef.current = false;
      pendingLoadMoreAnchorRef.current = null;
    }

    if (container.scrollTop < 50 && hasMore && !isLoadingMore) {
      handleLoadMore();
    }
  };

  const scrollToBottom = () => {
    isPinnedRef.current = true;
    settleScrollDeadlineRef.current = Math.max(
      settleScrollDeadlineRef.current,
      Date.now() + MEDIA_SETTLE_WINDOW_MS
    );
    isAutoScrollingRef.current = true;
    window.requestAnimationFrame(() => {
      isAutoScrollingRef.current = false;
    });
    setShowScrollButton(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mark messages as read
  useEffect(() => {
    if (!messages.length || !currentUserId || !chatId) return;
    
    const unreadMessages = messages.filter(m => 
      m.senderId !== currentUserId && 
      (!m.readBy || !(currentUserId in m.readBy))
    );
    
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(msg => {
        updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), {
          [`readBy.${currentUserId}`]: serverTimestamp()
        }).catch(console.error);
      });
    }
  }, [messages, currentUserId, chatId]);

  // Reset unread count for this chat
  useEffect(() => {
    if (chat && chat.unreadCount && chat.unreadCount[currentUserId] > 0) {
      updateDoc(doc(db, 'chats', chatId), {
        [`unreadCount.${currentUserId}`]: 0
      }).catch(console.error);
    }
  }, [chat, currentUserId, chatId]);

  if (!chat) return null;

  const isSaved = chat.type === 'saved';
  const resetSearchFilters = () => {
    setMessageSearchQuery('');
    setSearchDateFrom('');
    setSearchDateTo('');
  };
  const chatName = isSaved ? 'Свои сообщения' : (chat.type === 'group' ? chat.name : otherUser?.displayName || 'Загрузка...');

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <header className="h-16 md:h-[4.5rem] flex-shrink-0 border-b border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-3 md:px-5 flex items-center justify-between sticky top-0 z-10 pt-safe box-content backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,8,23,0.94),rgba(8,15,33,0.9))]">
        <div className="flex items-center gap-2 md:gap-3">
          <Button data-testid="chat-back-button" variant="ghost" className="w-10 h-10 md:w-11 md:h-11 rounded-2xl" onClick={onBack} title="Назад к чатам">
            <ChevronLeft size={24} />
          </Button>
          <Avatar 
            src={isSaved || chat.type === 'group' ? undefined : otherUser?.photoURL} 
            alt={chatName} 
            className="w-10 h-10" 
            fallbackIcon={isSaved ? <Bookmark size={20} /> : undefined}
          />
          <div>
            <h3 className="font-bold text-slate-900 leading-none text-sm md:text-base truncate max-w-[150px] md:max-w-none dark:text-white">{chatName}</h3>
            {isSaved ? (
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold dark:text-white/45">
                Заметки и файлы
              </span>
            ) : chat.type === 'group' ? (
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold dark:text-white/45">
                {chat.participants.length} участников
              </span>
            ) : (
              <StatusBadge user={otherUser} showText currentUserId={currentUserId} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {!isSaved && (
            <Button 
              data-testid="start-call-button"
              variant="ghost" 
              className="w-10 h-10 md:w-11 md:h-11 rounded-2xl" 
              onClick={async () => {
                const callId = await initiateCall(chatId, currentUserId, otherParticipantId!);
                setActiveCall({
                  id: callId,
                  chatId,
                  callerId: currentUserId,
                  receiverId: otherParticipantId!,
                  status: 'ringing',
                  type: 'audio',
                  createdAt: serverTimestamp(),
                });
              }}
              title="Начать аудиозвонок"
            >
              <Phone size={20} />
            </Button>
          )}
          <Button 
            data-testid="toggle-message-search-button"
            variant="ghost" 
            className={cn(
              "w-10 h-10 md:w-11 md:h-11 rounded-2xl",
              isSearchOpen && "bg-sky-50 text-sky-700 border border-sky-100 dark:border-sky-400/25 dark:bg-sky-500/12 dark:text-sky-200"
            )}
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) {
                resetSearchFilters();
              }
            }}
            title="Поиск по сообщениям"
          >
            <Search size={20} />
          </Button>
          <Button variant="ghost" className="w-10 h-10 md:w-11 md:h-11 rounded-2xl" title="Дополнительные действия">
            <MoreVertical size={20} />
          </Button>
        </div>
      </header>

      {isSearchOpen && (
        <div className="sticky top-16 md:top-[4.5rem] z-10 bg-white/95 border-b border-slate-200/80 px-3 py-3 shadow-sm flex flex-col gap-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#020817]/90 dark:shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">Message search</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-white/55">Сначала текст, затем даты при необходимости.</p>
            </div>
            <div className="flex items-center gap-2">
              {activeSearchFilters > 0 && (
                <span
                  data-testid="message-search-active-filters"
                  className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/12 dark:text-sky-200"
                >
                  Фильтров: {activeSearchFilters}
                </span>
              )}
              <Button
                data-testid="reset-message-search-button"
                type="button"
                variant="secondary"
                className="h-9 rounded-xl px-3 text-xs font-semibold"
                onClick={resetSearchFilters}
              >
                Сбросить
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" size={16} />
            <input 
              data-testid="message-search-input"
              type="text" 
              placeholder="Поиск по сообщениям или файлам" 
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm text-slate-900 placeholder-slate-500 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35 dark:focus:bg-black/35"
              value={messageSearchQuery}
              onChange={(e) => setMessageSearchQuery(e.target.value)}
              autoFocus
            />
            {messageSearchQuery && (
              <button 
                onClick={() => setMessageSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/70"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="relative flex-1">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" size={14} />
              <input 
                data-testid="message-search-date-from"
                type="date" 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-xs text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-black/25 dark:text-white dark:focus:bg-black/35"
                value={searchDateFrom}
                onChange={(e) => setSearchDateFrom(e.target.value)}
                title="С даты"
              />
            </div>
            <span className="hidden text-center text-slate-400 text-xs md:block dark:text-white/35">—</span>
            <div className="relative flex-1">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" size={14} />
              <input 
                data-testid="message-search-date-to"
                type="date" 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-xs text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-black/25 dark:text-white dark:focus:bg-black/35"
                value={searchDateTo}
                onChange={(e) => setSearchDateTo(e.target.value)}
                title="По дату"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative min-h-0">
        <div 
          data-testid="messages-scroll-container"
          ref={scrollContainerRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto p-4 md:p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"
        >
          <div ref={contentRef} className="space-y-4 pb-16">
            {hasMore && !isSearchOpen && (
              <div className="flex justify-center py-4">
                <Button 
                  variant="ghost" 
                  className="text-xs text-slate-500 hover:text-sky-600 bg-slate-100/50 backdrop-blur-sm rounded-full px-4"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Загрузка...' : 'Загрузить еще'}
                </Button>
              </div>
            )}
            {messages.length === 0 && isSearchOpen && (
              <div className="text-center text-slate-500 mt-10 bg-slate-50/80 backdrop-blur-sm p-4 rounded-2xl inline-block mx-auto">
                Ничего не найдено
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isMine={msg.senderId === currentUserId} 
                showAvatar={i === 0 || messages[i-1].senderId !== msg.senderId}
                chat={chat}
                currentUserId={currentUserId}
                onReply={() => setReplyTo(msg)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {showScrollButton && (
          <Button
            data-testid="scroll-to-bottom-button"
            variant="secondary"
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full shadow-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-sky-600 hover:bg-white hover:scale-110 transition-all z-20"
            onClick={scrollToBottom}
          >
            <ArrowDown size={20} />
          </Button>
        )}
      </div>

      <div className="flex-shrink-0 z-10 pb-safe">
        <MessageInput 
          chat={chat} 
          currentUserId={currentUserId} 
          replyTo={replyTo} 
          onRequestScrollToBottom={() => queueScrollToBottom({ settle: true })}
          onCancelReply={() => setReplyTo(null)} 
        />
      </div>
    </div>
  );
}

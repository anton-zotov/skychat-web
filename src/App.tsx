import React, { useEffect, useMemo, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { Toaster } from 'sonner';
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { auth, db } from '@/firebase';
import { LoadingScreen } from '@domains/auth/components/LoadingScreen';
import { LoginScreen } from '@domains/auth/components/LoginScreen';
import { CallWindow } from '@domains/call/components/CallWindow';
import { ChatWindow } from '@domains/chat/components/ChatWindow';
import { NewChatModal } from '@domains/chat/components/NewChatModal';
import { ChatSidebar } from '@domains/app/components/ChatSidebar';
import { EmptyChatState } from '@domains/app/components/EmptyChatState';
import { SideDrawer } from '@domains/app/components/SideDrawer';
import { useChatRouting } from '@domains/app/hooks/useChatRouting';
import { useUnreadNotifications } from '@domains/app/hooks/useUnreadNotifications';
import { SettingsModal } from '@domains/settings/components/SettingsModal';
import { useTheme } from '@shared/hooks/useTheme';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';
import { ECHO_BOT_USER } from '@shared/constants';
import { cn } from '@/utils';
import type { Call, Chat, UserProfile } from './types';

function ensureSavedMessagesLabel() {
  return 'Свои сообщения';
}

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const { theme, setTheme } = useTheme();
  const {
    selectedChatId,
    isSidebarOpen,
    setIsSidebarOpen,
    openChat,
    closeChat,
  } = useChatRouting();

  const [chatsValue, chatsLoading] = useCollection(
    user
      ? query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid),
          orderBy('updatedAt', 'desc')
        )
      : null
  );

  const [usersValue] = useCollection(collection(db, 'users'));
  const [currentUserDoc] = useDocument(user ? doc(db, 'users', user.uid) : null);
  const currentUserData = currentUserDoc?.data() as UserProfile | undefined;

  const users = useMemo(() => {
    const map: Record<string, UserProfile> = { echo_bot: ECHO_BOT_USER };
    usersValue?.docs.forEach((userDoc) => {
      map[userDoc.id] = userDoc.data() as UserProfile;
    });
    return map;
  }, [usersValue]);

  const chats = useMemo(() => {
    return chatsValue?.docs.map((chatDoc) => ({ id: chatDoc.id, ...chatDoc.data() } as Chat)) || [];
  }, [chatsValue]);

  const filteredChats = useMemo(() => {
    if (!user || !searchQuery) return chats;

    const lowerQuery = searchQuery.toLowerCase();
    return chats.filter((chat) => {
      if (chat.type === 'saved') {
        return ensureSavedMessagesLabel().toLowerCase().includes(lowerQuery) || 'заметки'.includes(lowerQuery);
      }

      if (chat.type === 'group') {
        return chat.name?.toLowerCase().includes(lowerQuery);
      }

      const otherParticipantId = chat.participants.find((id) => id !== user.uid);
      const otherUser = otherParticipantId ? users[otherParticipantId] : undefined;
      return otherUser?.displayName?.toLowerCase().includes(lowerQuery);
    });
  }, [chats, searchQuery, user, users]);

  const { notifPermission, totalUnreadCount, requestNotifPermission } = useUnreadNotifications({
    currentUserId: user?.uid || null,
    selectedChatId,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
          return;
        }
        if (isNewChatModalOpen) {
          setIsNewChatModalOpen(false);
          return;
        }
        if (isSettingsModalOpen) {
          setIsSettingsModalOpen(false);
          return;
        }
        if (selectedChatId) {
          closeChat();
        }
        return;
      }

      if (isDrawerOpen || isNewChatModalOpen || isSettingsModalOpen) {
        return;
      }

      if (event.altKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const index = Number.parseInt(event.key, 10) - 1;
        if (filteredChats[index]) {
          openChat(filteredChats[index].id);
        }
        return;
      }

      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        if (filteredChats.length === 0) return;

        const currentIndex = selectedChatId ? filteredChats.findIndex((chat) => chat.id === selectedChatId) : -1;
        const nextIndex =
          event.key === 'ArrowUp'
            ? currentIndex <= 0
              ? filteredChats.length - 1
              : currentIndex - 1
            : currentIndex === filteredChats.length - 1
              ? 0
              : currentIndex + 1;

        openChat(filteredChats[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeChat, filteredChats, isDrawerOpen, isNewChatModalOpen, isSettingsModalOpen, openChat, selectedChatId]);

  useEffect(() => {
    if (!user) return;

    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          setActiveCall({ id: change.doc.id, ...change.doc.data() } as Call);
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const ensureSavedMessages = async () => {
      try {
        const savedMessagesQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid)
        );
        const snapshot = await getDocs(savedMessagesQuery);
        const savedChat = snapshot.docs.find((chatDoc) => chatDoc.data().type === 'saved');

        if (!savedChat) {
          await addDoc(collection(db, 'chats'), {
            name: ensureSavedMessagesLabel(),
            type: 'saved',
            participants: [user.uid],
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
          });
        }
      } catch (error) {
        console.error('Error ensuring saved messages chat:', error);
      }
    };

    ensureSavedMessages();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    const updatePresence = () => {
      setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: user.displayName || 'Аноним',
          photoURL: user.photoURL || '',
          email: user.email || '',
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );
    };

    updatePresence();
    const intervalId = window.setInterval(updatePresence, 60_000);
    return () => window.clearInterval(intervalId);
  }, [user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <ErrorBoundary>
      <div className="h-[100dvh] w-full flex overflow-hidden font-sans antialiased">
        {activeCall && (
          <CallWindow
            call={activeCall}
            onEndCall={() => setActiveCall(null)}
            onMute={() => setIsMuted((value) => !value)}
            isMuted={isMuted}
            currentUserId={user.uid}
          />
        )}

        <Toaster position="top-center" richColors />

        <SideDrawer
          isOpen={isDrawerOpen}
          totalUnreadCount={totalUnreadCount}
          user={user}
          notifPermission={notifPermission}
          onClose={() => setIsDrawerOpen(false)}
          onOpenSettings={() => {
            setIsSettingsModalOpen(true);
            setIsDrawerOpen(false);
          }}
          onRequestNotifications={() => {
            requestNotifPermission();
            setIsDrawerOpen(false);
          }}
        />

        <ChatSidebar
          currentUserId={user.uid}
          selectedChatId={selectedChatId}
          chats={filteredChats}
          users={users}
          currentUserData={currentUserData}
          loading={chatsLoading}
          searchQuery={searchQuery}
          isSidebarOpen={isSidebarOpen}
          totalUnreadCount={totalUnreadCount}
          onSearchChange={setSearchQuery}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenNewChat={() => setIsNewChatModalOpen(true)}
          onSelectChat={openChat}
        />

        <section
          className={cn(
            'flex-1 flex flex-col bg-transparent relative transition-all duration-300 min-h-0',
            isSidebarOpen && 'hidden md:flex'
          )}
        >
          {selectedChatId ? (
            <ChatWindow
              chatId={selectedChatId}
              currentUserId={user.uid}
              onBack={closeChat}
              setActiveCall={setActiveCall}
            />
          ) : (
            <EmptyChatState onOpenSidebar={() => setIsSidebarOpen(true)} />
          )}
        </section>

        {isNewChatModalOpen && (
          <NewChatModal
            currentUserId={user.uid}
            onClose={() => setIsNewChatModalOpen(false)}
            onChatCreated={(chatId) => {
              openChat(chatId);
              setIsNewChatModalOpen(false);
            }}
          />
        )}

        {isSettingsModalOpen && (
          <SettingsModal
            currentUserId={user.uid}
            onClose={() => setIsSettingsModalOpen(false)}
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

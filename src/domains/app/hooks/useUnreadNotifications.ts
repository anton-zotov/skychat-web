import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';

import { db } from '@/firebase';
import type { Chat, UserProfile } from '@shared/types';
import { ECHO_BOT_USER } from '@shared/constants';

type UseUnreadNotificationsOptions = {
  currentUserId: string | null;
  selectedChatId: string | null;
};

export function useUnreadNotifications({ currentUserId, selectedChatId }: UseUnreadNotificationsOptions) {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const lastNotifiedRef = useRef<Record<string, string>>({});
  const isFirstLoadRef = useRef(true);

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined' || !currentUserId) return;

    const permission = await Notification.requestPermission();
    setNotifPermission(permission);

    if (permission !== 'granted' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const response = await fetch('/api/vapidPublicKey');
      const vapidPublicKey = await response.text();

      const padding = '='.repeat((4 - vapidPublicKey.length % 4) % 4);
      const base64 = (vapidPublicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray,
      });

      await updateDoc(doc(db, 'users', currentUserId), {
        pushSubscription: JSON.parse(JSON.stringify(subscription)),
      });

      toast.success('Уведомления успешно включены');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Не удалось настроить фоновые уведомления');
    }
  };

  useEffect(() => {
    if (!currentUserId || notifPermission !== 'granted') return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUserId)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      let unreadTotal = 0;

      snapshot.docs.forEach((chatDoc) => {
        const chat = chatDoc.data() as Chat;
        unreadTotal += chat.unreadCount?.[currentUserId] || 0;
      });

      setTotalUnreadCount(unreadTotal);

      if (isFirstLoadRef.current) {
        snapshot.docs.forEach((chatDoc) => {
          const chat = chatDoc.data() as Chat;
          if (chat.lastMessage?.createdAt) {
            lastNotifiedRef.current[chatDoc.id] = chat.lastMessage.createdAt.toMillis().toString();
          }
        });
        isFirstLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        if (change.type !== 'modified') return;

        const chat = { id: change.doc.id, ...change.doc.data() } as Chat;
        const lastMessage = chat.lastMessage;

        if (!lastMessage || lastMessage.senderId === currentUserId) return;

        const messageId = lastMessage.createdAt?.toMillis().toString();
        if (!messageId || lastNotifiedRef.current[chat.id] === messageId) return;

        lastNotifiedRef.current[chat.id] = messageId;

        if (selectedChatId === chat.id && document.hasFocus()) {
          return;
        }

        let senderName = 'Новое сообщение';
        if (chat.type === 'private') {
          const otherParticipantId = chat.participants.find((id) => id !== currentUserId);
          if (otherParticipantId === 'echo_bot') {
            senderName = ECHO_BOT_USER.displayName;
          } else if (otherParticipantId) {
            const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
            senderName = (userDoc.data() as UserProfile | undefined)?.displayName || 'SkyChat';
          }
        } else {
          senderName = chat.name || 'Групповой чат';
        }

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(async (registration) => {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) return;

            registration.showNotification(senderName, {
              body: lastMessage.text,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: chat.id,
              data: `/chat/${chat.id}`,
            });
          });
          return;
        }

        new Notification(senderName, {
          body: lastMessage.text,
          icon: '/icon-192.png',
        });
      });
    });

    return () => unsubscribe();
  }, [currentUserId, notifPermission, selectedChatId]);

  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (totalUnreadCount > 0) {
        (navigator as Navigator & { setAppBadge(count?: number): Promise<void> }).setAppBadge(totalUnreadCount).catch(console.error);
      } else if ('clearAppBadge' in navigator) {
        (navigator as Navigator & { clearAppBadge(): Promise<void> }).clearAppBadge().catch(console.error);
      }
    }

    const baseTitle = 'SkyChat Messenger';
    document.title = totalUnreadCount > 0 ? `(${totalUnreadCount}) ${baseTitle}` : baseTitle;
  }, [totalUnreadCount]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();

    if (totalUnreadCount > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(24, 8, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(totalUnreadCount > 9 ? '9+' : totalUnreadCount.toString(), 24, 8);
    }

    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = canvas.toDataURL('image/png');
  }, [totalUnreadCount]);

  return {
    notifPermission,
    totalUnreadCount,
    requestNotifPermission,
  };
}

import { useEffect, useState } from 'react';
import { requestNotificationPermission } from '../services/notificationService';

export function useNotifications(currentUserId: string | null) {
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Update document title and badge
  useEffect(() => {
    if (unreadTotal > 0) {
      document.title = `(${unreadTotal}) SkyChat Messenger`;
      if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(unreadTotal).catch(console.error);
      }
    } else {
      document.title = 'SkyChat Messenger';
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    }
  }, [unreadTotal]);

  // Request permissions on init
  useEffect(() => {
    if (currentUserId && 'Notification' in window && Notification.permission === 'default') {
      // In a real app we'd trigger this on user interaction
      // but for SkyChat we'll request on load for simplicity if not denied
      requestNotificationPermission(currentUserId);
    }
  }, [currentUserId]);

  return { setUnreadTotal };
}

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { UserProfile } from '@shared/types';

export const requestNotificationPermission = async (currentUserId: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Fetch VAPID key
        const response = await fetch('/api/vapidPublicKey');
        const vapidPublicKey = await response.text();
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }
      
      await updateDoc(doc(db, 'users', currentUserId), {
        pushSubscription: JSON.parse(JSON.stringify(subscription))
      });
    }
  } catch (err) {
    console.error("Failed to subscribe to push notifications", err);
  }
};

// Utility function
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

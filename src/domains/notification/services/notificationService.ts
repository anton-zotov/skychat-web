import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

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

function arraysEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;

  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }

  return true;
}

async function getVapidApplicationServerKey() {
  const response = await fetch('/api/vapidPublicKey');
  const vapidPublicKey = await response.text();
  return urlBase64ToUint8Array(vapidPublicKey);
}

export async function subscribeCurrentUserToPush(currentUserId: string) {
  if (!('serviceWorker' in navigator)) return null;

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = await getVapidApplicationServerKey();
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const existingServerKey = subscription.options?.applicationServerKey;

    if (existingServerKey) {
      const existingKeyBytes = new Uint8Array(existingServerKey);
      const keysMatch = arraysEqual(existingKeyBytes, applicationServerKey);

      if (!keysMatch) {
        await subscription.unsubscribe();
        subscription = null;
      }
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  await updateDoc(doc(db, 'users', currentUserId), {
    pushSubscription: JSON.parse(JSON.stringify(subscription)),
  });

  return subscription;
}

export const requestNotificationPermission = async (currentUserId: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeCurrentUserToPush(currentUserId);
    }
  } catch (err) {
    console.error("Failed to subscribe to push notifications", err);
  }
};

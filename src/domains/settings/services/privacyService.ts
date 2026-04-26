import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export const updatePrivacy = async (currentUserId: string, key: 'showLastSeen' | 'showOnlineStatus', value: boolean) => {
  try {
    await updateDoc(doc(db, 'users', currentUserId), {
      [`privacy.${key}`]: value
    });
  } catch (err) {
    console.error("Error updating privacy:", err);
    throw err;
  }
};

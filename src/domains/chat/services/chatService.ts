import { doc, setDoc, getDocs, addDoc, collection, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

export const createChat = async (currentUserId: string, selectedUsers: string[], groupName: string) => {
  const type = selectedUsers.length > 1 || groupName ? 'group' : 'private';
  const participants = [currentUserId, ...selectedUsers];
  
  if (type === 'private') {
    const existingQuery = query(
      collection(db, 'chats'),
      where('type', '==', 'private'),
      where('participants', 'array-contains', currentUserId)
    );
    const existing = await getDocs(existingQuery);
    const found = existing.docs.find(d => d.data().participants.includes(selectedUsers[0]));
    if (found) {
      return found.id;
    }
  }

  const chatRef = await addDoc(collection(db, 'chats'), {
    name: type === 'group' ? (groupName || 'Новая группа') : '',
    type,
    participants,
    updatedAt: serverTimestamp(),
    createdBy: currentUserId,
  });

  return chatRef.id;
};

export const initSavedMessages = async (currentUserId: string) => {
  const existingQuery = query(
    collection(db, 'chats'),
    where('type', '==', 'saved'),
    where('participants', 'array-contains', currentUserId)
  );
  const existing = await getDocs(existingQuery);
  if (!existing.empty) return;

  await addDoc(collection(db, 'chats'), {
    name: 'Избранное',
    type: 'saved',
    participants: [currentUserId],
    updatedAt: serverTimestamp(),
    createdBy: currentUserId,
  });
};

export const markAsRead = async (chatId: string, currentUserId: string) => {
  await updateDoc(doc(db, 'chats', chatId), {
    [`unreadCount.${currentUserId}`]: 0
  });
};

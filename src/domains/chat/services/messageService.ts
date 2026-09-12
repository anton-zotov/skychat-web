import { addDoc, collection, updateDoc, doc, getDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { UserProfile, Chat, Message } from '@shared/types';

export const sendMessage = async (
  chat: Chat,
  currentUserId: string,
  text: string,
  type: string,
  attachments: {url: string, name: string, type: string}[],
  replyTo?: Message,
  fileUrl?: string,
  fileName?: string
) => {
  const messageData: any = {
    chatId: chat.id,
    senderId: currentUserId,
    text: text.trim(),
    type,
    createdAt: serverTimestamp(),
    readBy: { [currentUserId]: serverTimestamp() },
  };
  
  if (attachments.length > 0) {
    messageData.attachments = attachments;
    if (attachments.length === 1) {
      messageData.fileUrl = attachments[0].url;
      messageData.fileName = attachments[0].name;
    }
  } else if (fileUrl) {
    messageData.fileUrl = fileUrl;
    if (fileName) {
      messageData.fileName = fileName;
    }
  }
  
  if (replyTo) {
    messageData.replyTo = {
      id: replyTo.id,
      text: replyTo.text || '',
      senderId: replyTo.senderId,
      type: replyTo.type,
      fileUrl: replyTo.fileUrl || null
    };
  }

  await addDoc(collection(db, 'chats', chat.id, 'messages'), messageData);

  const updates: any = {
    updatedAt: serverTimestamp(),
    lastMessage: type === 'image' ? '📷 Фото' : (type === 'video' ? '📹 Видео' : (type === 'mixed' ? '📎 Вложения' : (text || ''))),
    lastSenderId: currentUserId,
  };
  
  chat.participants?.forEach(p => {
    if (p && p !== currentUserId) {
      updates[`unreadCount.${p}`] = increment(1);
    }
  });

  await updateDoc(doc(db, 'chats', chat.id), updates);

  // Send push notification
  const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
  const currentUserData = currentUserDoc.data() as UserProfile;
  const senderName = currentUserData?.displayName || 'Пользователь';
  
  const pushPayload = {
    title: chat.type === 'group' ? `${chat.name} (${senderName})` : senderName,
    body: type === 'image' ? '📷 Фото' : (type === 'video' ? '📹 Видео' : (type === 'mixed' ? '📎 Вложения' : (type === 'file' ? `📄 Файл` : text))),
    url: `/chat/${chat.id}`
  };

  chat.participants?.forEach(async (p) => {
    if (p && p !== currentUserId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', p));
        const userData = userDoc.data() as UserProfile;
        if (userData?.pushSubscription) {
          await fetch('/api/sendPush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: userData.pushSubscription,
              payload: pushPayload
            })
          });
        }
      } catch (err) {
        console.error("Failed to send push", err);
      }
    }
  });
};

export const deleteMessage = async (chatId: string, messageId: string) => {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    type: 'deleted',
    text: 'Сообщение удалено',
    fileUrl: null,
    fileName: null,
    attachments: null
  });
};

export const toggleReaction = async (chatId: string, messageId: string, reaction: string, userId: string, currentReactions: Record<string, string[]>) => {
  const newReactions = { ...currentReactions };
  if (!newReactions[reaction]) newReactions[reaction] = [];
  
  const userIdx = newReactions[reaction].indexOf(userId);
  if (userIdx > -1) {
    newReactions[reaction].splice(userIdx, 1);
    if (newReactions[reaction].length === 0) delete newReactions[reaction];
  } else {
    // Remove user from other reactions
    Object.keys(newReactions).forEach(r => {
      const idx = newReactions[r].indexOf(userId);
      if (idx > -1) {
        newReactions[r].splice(idx, 1);
        if (newReactions[r].length === 0) delete newReactions[r];
      }
    });
    if (!newReactions[reaction]) newReactions[reaction] = [];
    newReactions[reaction].push(userId);
  }

  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    reactions: newReactions
  });
};

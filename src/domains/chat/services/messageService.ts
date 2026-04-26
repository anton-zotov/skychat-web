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
    lastMessage: {
      text: type === 'image' ? '📷 Фото' : (type === 'video' ? '📹 Видео' : (type === 'mixed' ? '📎 Вложения' : (text || ''))),
      senderId: currentUserId,
      createdAt: serverTimestamp(),
    }
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
    if (p && p !== currentUserId && p !== 'echo_bot') {
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

export const scheduleEchoBotReply = (
  chat: Chat, 
  type: string, 
  text: string, 
  fileUrl?: string, 
  fileName?: string, 
  instant: boolean = false
) => {
  const delay = instant ? 1000 : 10000;
  
  setTimeout(async () => {
    try {
      const msgText = instant ? text : `Эхо: ${text}`;
      
      const messageData: any = {
        chatId: chat.id,
        senderId: 'echo_bot',
        text: msgText,
        type: type as any,
        createdAt: serverTimestamp(),
      };
      
      if (fileUrl) {
        messageData.fileUrl = fileUrl;
        if (fileName) messageData.fileName = fileName;
      }

      await addDoc(collection(db, 'chats', chat.id, 'messages'), messageData);

      const echoUpdates: any = {
        updatedAt: serverTimestamp(),
        lastMessage: {
          text: type === 'image' ? '📷 Фото' : (type === 'video' ? '📹 Видео' : (type === 'file' ? `📄 ${fileName}` : msgText)),
          senderId: 'echo_bot',
          createdAt: serverTimestamp(),
        }
      };
      
      chat.participants?.forEach(p => {
        if (p && p !== 'echo_bot') {
          echoUpdates[`unreadCount.${p}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', chat.id), echoUpdates);
      
      const pushPayload = {
        title: chat.type === 'group' ? `${chat.name} (Эхо-бот)` : 'Эхо-бот',
        body: type === 'image' ? (fileName === 'GIF' ? 'GIF' : '📷 Фото') : (type === 'video' ? '📹 Видео' : (type === 'file' ? `📄 ${fileName}` : (msgText || ''))),
        url: `/chat/${chat.id}`
      };

      chat.participants?.forEach(async (p) => {
        if (p && p !== 'echo_bot') {
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
            console.error("Failed to send push from echo bot", p, err);
          }
        }
      });
    } catch (err) {
      console.error("Error sending echo message:", err);
    }
  }, delay);
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

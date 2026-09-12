import type { Chat, Message } from '@shared/types';

// Android/Win clients store lastMessage as a plain string (with lastSenderId
// alongside); the web client stores it as a map. Normalize both shapes.
export const getLastMessageInfo = (chat: Chat) => {
  const lastMessage = chat.lastMessage;
  if (typeof lastMessage === 'string') {
    return { text: lastMessage, senderId: chat.lastSenderId, createdAt: chat.updatedAt };
  }
  return {
    text: lastMessage?.text ?? '',
    senderId: lastMessage?.senderId,
    createdAt: lastMessage?.createdAt,
  };
};

// Legacy Android/Win clients store readBy as a uid array; the web client
// stores a {uid: timestamp} map. Normalize both into map form.
export const getReadByMap = (readBy: Message['readBy']): Record<string, any> => {
  if (Array.isArray(readBy)) {
    return Object.fromEntries(
      readBy.filter((uid): uid is string => typeof uid === 'string').map((uid) => [uid, null])
    );
  }
  return readBy ?? {};
};

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  lastSeen?: any;
  recentGifs?: any[];
  pushSubscription?: any;
  privacy?: {
    showLastSeen: boolean;
    showOnlineStatus: boolean;
  };
}

export interface Chat {
  id: string;
  name?: string;
  type: 'private' | 'group' | 'saved';
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: any;
  };
  unreadCount?: Record<string, number>;
  updatedAt: any;
  createdBy: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  type: 'text' | 'image' | 'video' | 'file' | 'deleted' | 'mixed';
  fileUrl?: string;
  fileName?: string;
  attachments?: {
    url: string;
    name: string;
    type: string; // 'image' | 'video' | 'file'
  }[];
  createdAt: any;
  readBy?: Record<string, any>;
  reactions?: Record<string, string[]>;
  isEdited?: boolean;
  replyTo?: {
    id: string;
    text?: string;
    senderId: string;
    type: string;
    fileUrl?: string;
  };
}

export interface Call {
  id: string;
  chatId: string;
  callerId: string;
  receiverId: string;
  status: 'ringing' | 'connected' | 'ended' | 'rejected';
  type: 'audio';
  offer?: any;
  answer?: any;
  iceCandidates?: any[];
  createdAt: any;
}

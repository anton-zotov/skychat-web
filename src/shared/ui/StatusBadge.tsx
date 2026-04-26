import React from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { UserProfile } from '@shared/types';

export const StatusBadge = ({ user, showText = false, currentUserId }: { user?: UserProfile; showText?: boolean; currentUserId: string }) => {
  const [currentUserDoc] = useDocument(doc(db, 'users', currentUserId));
  const currentUserData = currentUserDoc?.data() as UserProfile | undefined;

  if (!user) return null;

  const isOnline = user.uid === 'echo_bot' || (user.lastSeen && typeof user.lastSeen.toMillis === 'function' && (Date.now() - user.lastSeen.toMillis() < 120000)); // 2 minutes threshold
  
  // Reciprocity: If I hide my status, I can't see others' status
  const myShowOnline = currentUserData?.privacy?.showOnlineStatus !== false;
  const myShowLastSeen = currentUserData?.privacy?.showLastSeen !== false;

  const theirShowOnline = user.privacy?.showOnlineStatus !== false;
  const theirShowLastSeen = user.privacy?.showLastSeen !== false;

  const canSeeOnline = myShowOnline && theirShowOnline;
  const canSeeLastSeen = myShowLastSeen && theirShowLastSeen;

  if (!canSeeOnline && !isOnline) return null;

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    if (date.toDateString() === now.toDateString()) {
      return `сегодня в ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-1.5">
      {canSeeOnline && isOnline ? (
        <>
          <div className="relative flex items-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75" />
          </div>
          {showText && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">В сети</span>}
        </>
      ) : canSeeLastSeen && user.lastSeen ? (
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
          Был(а) {formatLastSeen(user.lastSeen)}
        </span>
      ) : null}
    </div>
  );
};

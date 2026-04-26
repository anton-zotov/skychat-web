import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, arrayRemove, arrayUnion, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Bot, CornerUpLeft, Image as ImageIcon, Reply, Pencil, X, File as FileIcon, ChevronLeft, ChevronRight, CheckCheck, Check, SmilePlus } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db } from '@/firebase';
import { Chat, Message, UserProfile } from '@shared/types';
import { Avatar } from '@shared/ui/Avatar';
import { Button } from '@shared/ui/Button';
import { ECHO_BOT_USER } from '@shared/constants';
import { isImageFile, isVideoFile } from '@shared/helpers/file';
import { cn } from '@/utils';

function ReadReceiptItem({ uid, timestamp }: { key?: any; uid: string; timestamp: any }) {
  const [userDoc] = useDocument(uid !== 'echo_bot' ? doc(db, 'users', uid) : null);
  const user = uid === 'echo_bot' ? ECHO_BOT_USER : (userDoc?.data() as UserProfile | undefined);
  const timeString = timestamp ? new Date(timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
  
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <Avatar src={user?.photoURL} alt={user?.displayName} className="w-4 h-4" />
        <span className="truncate max-w-[80px]">{user?.displayName || '...'}</span>
      </div>
      <span className="text-slate-400">{timeString}</span>
    </div>
  );
}

interface MessageBubbleProps {
  key?: any;
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  chat: Chat;
  currentUserId: string;
  onReply: () => void;
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '💯', '👀'];

export function MessageBubble({ message, isMine, showAvatar, chat, currentUserId, onReply }: MessageBubbleProps) {
  const [senderValue] = useDocument(message.senderId !== 'echo_bot' ? doc(db, 'users', message.senderId) : null);
  const sender = message.senderId === 'echo_bot' 
    ? ECHO_BOT_USER 
    : senderValue?.data() as UserProfile | undefined;
  
  const [replySenderValue] = useDocument(message.replyTo?.senderId && message.replyTo?.senderId !== 'echo_bot' ? doc(db, 'users', message.replyTo.senderId) : null);
  const replySender = message.replyTo?.senderId === 'echo_bot' 
    ? ECHO_BOT_USER 
    : replySenderValue?.data() as UserProfile | undefined;

  const [showReadInfo, setShowReadInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.text || '');
  const [showPicker, setShowPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number, y: number } | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState<number>(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  const messageImages = useMemo(() => {
    const images: { url: string, name: string }[] = [];
    if (message.attachments) {
      message.attachments.forEach(att => {
        if (att.type === 'image' || isImageFile(att.name)) {
          images.push({ url: att.url, name: att.name });
        }
      });
    } else if (message.type === 'image' && message.fileUrl) {
      images.push({ url: message.fileUrl, name: message.fileName || 'Image' });
    }
    return images;
  }, [message.attachments, message.type, message.fileUrl, message.fileName]);

  const otherAttachments = useMemo(() => {
    return message.attachments?.filter(att => !(att.type === 'image' || isImageFile(att.name))) || [];
  }, [message.attachments]);

  const readByEntries = Object.entries(message.readBy || {}).filter(([uid]) => uid !== message.senderId);
  const isRead = readByEntries.length > 0;
  const isAllRead = chat.type === 'private' ? isRead : readByEntries.length === chat.participants.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageViewerOpen) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          setIsImageViewerOpen(false);
        } else if (showDeleteConfirm) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          setShowDeleteConfirm(false);
        } else if (showPicker) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          setShowPicker(false);
        }
      } else if (isImageViewerOpen) {
        if (e.key === 'ArrowRight' && viewerImageIndex < messageImages.length - 1) {
          setViewerImageIndex(v => v + 1);
        } else if (e.key === 'ArrowLeft' && viewerImageIndex > 0) {
          setViewerImageIndex(v => v - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isImageViewerOpen, showPicker, showDeleteConfirm, viewerImageIndex, messageImages.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const toggleReaction = async (reaction: string) => {
    const messageRef = doc(db, 'chats', message.chatId, 'messages', message.id);
    const reactions = message.reactions || {};
    const users = reactions[reaction] || [];
    
    if (users.includes(currentUserId)) {
      await updateDoc(messageRef, {
        [`reactions.${reaction}`]: arrayRemove(currentUserId)
      });
    } else {
      await updateDoc(messageRef, {
        [`reactions.${reaction}`]: arrayUnion(currentUserId)
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim() || editValue === message.text) {
      setIsEditing(false);
      setEditValue(message.text || '');
      return;
    }
    
    const messageRef = doc(db, 'chats', message.chatId, 'messages', message.id);
    await updateDoc(messageRef, {
      text: editValue.trim(),
      isEdited: true
    });
    setIsEditing(false);
    toast.success("Сообщение изменено");
  };

  const handleDelete = async () => {
    const messageRef = doc(db, 'chats', message.chatId, 'messages', message.id);
    try {
      await deleteDoc(messageRef);
      toast.info("Сообщение удалено с сервера");
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Ошибка при удалении сообщения");
    }
  };

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      toast.success("Текст скопирован");
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const menuWidth = 200;
    const menuHeight = 250;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setPickerPos({ x: Math.max(10, x), y: Math.max(10, y) });
    setShowPicker(true);
  };

  return (
    <div data-testid={`message-${message.id}`} id={`msg-${message.id}`} className={cn("flex gap-3 md:max-w-[80%] group transition-all", messageImages.length > 0 ? "max-w-[90%]" : "max-w-[85%]", isMine ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div className="w-8 flex-shrink-0">
        {!isMine && showAvatar && (
          <Avatar 
            src={sender?.photoURL} 
            alt={sender?.displayName} 
            className="w-8 h-8" 
            fallbackIcon={message.senderId === 'echo_bot' ? <Bot size={16} /> : undefined}
          />
        )}
      </div>
      <div className="flex flex-col gap-1 relative min-w-0">
        {!isMine && showAvatar && <span className="text-[10px] font-bold text-slate-500 ml-1 truncate">{sender?.displayName}</span>}
        <div className={cn("relative flex items-center gap-2", isMine ? "flex-row-reverse" : "flex-row")}>
          <div 
            onContextMenu={handleContextMenu}
            className={cn(
              "p-3 rounded-2xl shadow-sm border relative min-w-0 w-fit",
              isMine 
                ? "bg-sky-600 text-white border-sky-500 rounded-tr-sm" 
                : "bg-slate-50 text-slate-900 border-slate-200 rounded-tl-sm",
              !isEditing && message.reactions && Object.keys(message.reactions).length > 0 && "mb-3"
            )}
          >
            {message.replyTo && (
              <div 
                data-testid={`reply-preview-${message.id}`}
                className={cn(
                  "mb-2 p-2 rounded-lg border-l-4 text-xs flex flex-col gap-0.5 cursor-pointer hover:bg-black/5 transition-colors",
                  isMine ? "bg-white/10 border-white/40 text-white/90" : "bg-slate-100 border-sky-500 text-slate-600"
                )}
                onClick={() => {
                  const element = document.getElementById(`msg-${message.replyTo?.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-sky-500', 'ring-offset-2');
                    setTimeout(() => {
                      element.classList.remove('ring-2', 'ring-sky-500', 'ring-offset-2');
                    }, 2000);
                  }
                }}
              >
                <div className="font-bold flex items-center gap-1">
                  <CornerUpLeft size={10} />
                  {replySender?.displayName || '...'}
                </div>
                <div className="truncate opacity-80">
                  {message.replyTo.type === 'image' ? '📷 Фото' : (message.replyTo.type === 'video' ? '📹 Видео' : (message.replyTo.type === 'file' ? '📄 Файл' : message.replyTo.text))}
                </div>
              </div>
            )}
            {showPicker && pickerPos && (
              <div 
                ref={pickerRef}
                className="fixed z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 flex flex-col gap-1 min-w-[160px]"
                style={{ left: pickerPos.x, top: pickerPos.y }}
              >
                <div className="flex flex-wrap gap-1 p-1 border-b border-slate-100 mb-1">
                  {REACTIONS.map((r, idx) => (
                    <button 
                      data-testid={`reaction-option-${message.id}-${idx}`}
                      key={r} 
                      onClick={() => {
                        toggleReaction(r);
                        setShowPicker(false);
                      }}
                      className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors text-lg"
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button 
                  data-testid={`copy-message-${message.id}`}
                  onClick={() => {
                    handleCopy();
                    setShowPicker(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors w-full text-left"
                >
                  <ImageIcon size={14} /> Копировать текст
                </button>
                <button 
                  data-testid={`reply-from-menu-${message.id}`}
                  onClick={() => {
                    onReply();
                    setShowPicker(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors w-full text-left"
                >
                  <Reply size={14} /> Ответить
                </button>
                {isMine && message.type !== 'deleted' && (
                  <>
                    <button 
                      data-testid={`edit-message-${message.id}`}
                      onClick={() => {
                        setIsEditing(true);
                        setShowPicker(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors w-full text-left"
                    >
                      <Pencil size={14} /> Изменить
                    </button>
                    <button 
                      data-testid={`delete-message-${message.id}`}
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setShowPicker(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors w-full text-left"
                    >
                      <X size={14} /> Удалить
                    </button>
                  </>
                )}
              </div>
            )}

            {showDeleteConfirm && (
              <div 
                className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <div 
                  className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Удалить сообщение?</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Это действие нельзя будет отменить. Сообщение будет удалено для всех участников чата.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="ghost" 
                      className="flex-1 rounded-xl"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Отмена
                    </Button>
                    <Button 
                      data-testid={`confirm-delete-message-${message.id}`}
                      variant="destructive" 
                      className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
                      onClick={handleDelete}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {messageImages.length > 0 && (
              <div className={cn("mb-2", messageImages.length > 1 ? "grid grid-cols-2 gap-2" : "flex")}>
                {messageImages.map((img, idx) => (
                  <img 
                    key={idx}
                    src={img.url} 
                    alt={img.name} 
                    className={cn(
                      "w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity block",
                      messageImages.length === 1 && "max-w-full md:max-w-xs object-contain"
                    )}
                    style={{ aspectRatio: messageImages.length > 1 ? '1 / 1' : 'auto', objectFit: messageImages.length > 1 ? 'cover' : 'contain' }}
                    onClick={() => {
                      setViewerImageIndex(idx);
                      setIsImageViewerOpen(true);
                    }}
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            )}
            
            {otherAttachments.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {otherAttachments.map((att, idx) => (
                  (att.type === 'video' || isVideoFile(att.name)) ? (
                    <video 
                      key={idx}
                      src={att.url} 
                      controls 
                      playsInline
                      webkit-playsinline="true"
                      className="max-w-full h-auto md:max-w-xs rounded-lg block"
                    />
                  ) : (
                    <a 
                      key={idx}
                      href={att.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-black/10 p-2 rounded-lg hover:bg-black/20 transition-colors w-full"
                    >
                      <FileIcon size={20} />
                      <span className="text-sm font-medium truncate max-w-[200px]">{att.name}</span>
                    </a>
                  )
                ))}
              </div>
            )}

            {(message.type === 'video' || (message.type === 'file' && message.fileName && isVideoFile(message.fileName))) && message.fileUrl && !message.attachments && (
              <video 
                src={message.fileUrl} 
                controls 
                playsInline
                webkit-playsinline="true"
                className="max-w-full h-auto rounded-lg mb-2 block"
              />
            )}
            {isImageViewerOpen && messageImages[viewerImageIndex] && (
              <div 
                className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-md animate-in fade-in duration-200"
                onClick={() => setIsImageViewerOpen(false)}
              >
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                   <div className="text-white/70 text-sm font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">
                      {messageImages.length > 1 ? `${viewerImageIndex + 1} / ${messageImages.length}` : ''}
                   </div>
                   <button 
                     className="p-2 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-all"
                     onClick={(e) => {
                       e.stopPropagation();
                       setIsImageViewerOpen(false);
                     }}
                   >
                     <X size={24} />
                   </button>
                </div>
                
                {messageImages.length > 1 && viewerImageIndex > 0 && (
                  <button 
                    className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-all z-10 backdrop-blur-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerImageIndex(prev => prev - 1);
                    }}
                  >
                    <ChevronLeft size={32} />
                  </button>
                )}
                
                {messageImages.length > 1 && viewerImageIndex < messageImages.length - 1 && (
                  <button 
                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-all z-10 backdrop-blur-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerImageIndex(prev => prev + 1);
                    }}
                  >
                    <ChevronRight size={32} />
                  </button>
                )}

                <motion.img 
                  key={viewerImageIndex}
                  src={messageImages[viewerImageIndex].url} 
                  alt="Full size" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e: any, { offset, velocity }: any) => {
                    const swipe = offset.x + velocity.x * 0.2;
                    if (swipe < -50 && viewerImageIndex < messageImages.length - 1) {
                      setViewerImageIndex(prev => prev + 1);
                    } else if (swipe > 50 && viewerImageIndex > 0) {
                      setViewerImageIndex(prev => prev - 1);
                    }
                  }}
                  onClick={(e: any) => e.stopPropagation()}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {message.type === 'file' && message.fileUrl && !message.attachments && !(message.fileName && isVideoFile(message.fileName)) && (
              <a 
                href={message.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-black/10 p-2 rounded-lg mb-2 hover:bg-black/20 transition-colors"
              >
                <FileIcon size={20} />
                <span className="text-sm font-medium truncate max-w-[200px]">{message.fileName}</span>
              </a>
            )}
            
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[200px]">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setIsEditing(false);
                      setEditValue(message.text || '');
                    } else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                  }}
                  className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditValue(message.text || '');
                    }}
                    className="text-xs px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    className="text-xs px-3 py-1.5 bg-slate-50 text-sky-600 font-medium rounded-md hover:bg-sky-50 transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <>
                {message.text && (
                  <div className="markdown-body text-sm leading-relaxed break-all whitespace-pre-wrap overflow-wrap-anywhere">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
                <div className={cn("text-[10px] mt-1 flex items-center justify-end gap-1", isMine ? "text-sky-100" : "text-slate-400")}>
                  {message.isEdited && <span className="italic opacity-75 mr-1">(изменено)</span>}
                  {message.createdAt && new Date(message.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMine && (
                    <div 
                      data-testid={`toggle-read-receipts-${message.id}`}
                      className="cursor-pointer flex items-center hover:opacity-80 transition-opacity" 
                      onClick={() => setShowReadInfo(!showReadInfo)}
                      title="Нажмите, чтобы увидеть, кто прочитал"
                    >
                      {isAllRead ? <CheckCheck size={14} className="text-white" /> : isRead ? <CheckCheck size={14} className="text-sky-200" /> : <Check size={14} className="text-sky-200" />}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Reaction Badges */}
            {!isEditing && message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className={cn(
                "absolute -bottom-3 flex flex-wrap gap-1",
                isMine ? "right-0 flex-row-reverse" : "left-0"
              )}>
                {Object.entries(message.reactions).map(([emoji, users]) => {
                  if (!users || users.length === 0) return null;
                  const hasReacted = users.includes(currentUserId);
                  return (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReaction(emoji);
                      }}
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] shadow-sm border flex items-center gap-1 transition-colors",
                        hasReacted 
                          ? (isMine ? "bg-sky-100 border-sky-200 text-sky-800" : "bg-sky-50 border-sky-200 text-sky-800") 
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      )}
                    >
                      <span>{emoji}</span>
                      <span>{users.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEditing && (
              <button 
                data-testid={`reply-button-${message.id}`}
                onClick={onReply}
                className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full flex-shrink-0"
                title="Ответить"
              >
                <Reply size={14} />
              </button>
            )}
            {!isEditing && (
              <button 
                data-testid={`reaction-button-${message.id}`}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const menuWidth = 200;
                  const menuHeight = 250;
                  const x = Math.min(rect.left, window.innerWidth - menuWidth - 10);
                  const y = Math.min(rect.bottom, window.innerHeight - menuHeight - 10);
                  setPickerPos({ x: Math.max(10, x), y: Math.max(10, y) });
                  setShowPicker(!showPicker);
                }}
                className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full flex-shrink-0"
                title="Добавить реакцию"
              >
                <SmilePlus size={14} />
              </button>
            )}
            {isMine && !isEditing && message.type === 'text' && (
              <button 
                data-testid={`quick-edit-button-${message.id}`}
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full flex-shrink-0"
                title="Редактировать"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>
        {isMine && showReadInfo && readByEntries.length > 0 && (
          <div data-testid={`read-receipts-${message.id}`} className="absolute top-full right-0 z-10 text-[10px] text-slate-600 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm min-w-[120px]">
            <span className="font-bold block mb-1.5 border-b border-slate-100 pb-1">Прочитано:</span>
            <div className="space-y-1.5">
              {readByEntries.map(([uid, timestamp]) => (
                <ReadReceiptItem key={uid} uid={uid} timestamp={timestamp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { FileIcon, RefreshCw, X, Plus, Send, Reply, Paperclip, Smile, Sticker } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import i18n_ru from '@emoji-mart/data/i18n/ru.json';

import { db, storage } from '@/firebase';
import { Chat, Message, UserProfile } from '@shared/types';
import { Button } from '@shared/ui/Button';
import { ECHO_BOT_USER } from '@shared/constants';
import { isImageFile, isVideoFile } from '@shared/helpers/file';
import { searchEmojis } from '@shared/helpers/emoji';
import { cn } from '@/utils';
import { sendMessage, scheduleEchoBotReply } from '@domains/chat/services/messageService';
import { compressImage, rotateImage } from '@domains/media/services/uploadService';
import { GifPicker } from '@domains/media/components/GifPicker';

export function MessageInput({ chat, currentUserId, replyTo, onRequestScrollToBottom, onCancelReply }: { chat: Chat; currentUserId: string; replyTo: Message | null; onRequestScrollToBottom: () => void; onCancelReply: () => void }) {
  const chatId = chat.id;
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<{file: File, preview: string}[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionRange, setSuggestionRange] = useState<{ start: number, end: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const savedDraft = localStorage.getItem(`draft_${chatId}`);
    if (savedDraft) {
      setText(savedDraft);
    } else {
      setText('');
    }
  }, [chatId]);

  useEffect(() => {
    if (text) {
      localStorage.setItem(`draft_${chatId}`, text);
    } else {
      localStorage.removeItem(`draft_${chatId}`);
    }
  }, [text, chatId]);

  const [replySenderValue] = useDocument(replyTo?.senderId && replyTo?.senderId !== 'echo_bot' ? doc(db, 'users', replyTo.senderId) : null);
  const replySender = replyTo?.senderId === 'echo_bot' 
    ? ECHO_BOT_USER 
    : replySenderValue?.data() as UserProfile | undefined;

  const handleSend = async (msgText: string = '', type: 'text' | 'image' | 'video' | 'file' | 'mixed' = 'text', fileUrl?: string, fileName?: string) => {
    const safeChatId = chatId || chat.id;
    if (!safeChatId) {
      console.error("No chatId available for sending message");
      return;
    }
    
    const textToSend = msgText || text;
    if (!textToSend.trim() && !fileUrl && stagedFiles.length === 0 && !isUploading) return;

    onRequestScrollToBottom();
    
    setText('');
    localStorage.removeItem(`draft_${safeChatId}`);
    setShowGifPicker(false);
    onCancelReply();
    
    try {
      let attachments: { url: string, name: string, type: string }[] = [];
      
      if (stagedFiles.length > 0) {
        setIsUploading(true);
        const uploadPromises = stagedFiles.map(async (item) => {
          const sanitizedFileName = item.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const storagePath = `chats/${safeChatId}/${currentUserId}/${Date.now()}_${sanitizedFileName}`;
          const storageRef = ref(storage, storagePath);
          const metadata = {
            contentType: item.file.type,
            cacheControl: 'public, max-age=31536000, immutable'
          };
          const uploadTask = uploadBytesResumable(storageRef, item.file, metadata);
          
          return new Promise<{url: string, name: string, type: string}>((resolve, reject) => {
            uploadTask.on('state_changed', null, 
              (error: any) => {
                console.error(`Upload failed for ${item.file.name}:`, error);
                alert(`Ошибка загрузки ${item.file.name}: ${error.message}`);
                reject(error);
              }, 
              async () => {
                try {
                  const url = await getDownloadURL(uploadTask.snapshot.ref);
                  const isVideo = item.file.type.startsWith('video/') || isVideoFile(item.file.name);
                  const isImage = item.file.type.startsWith('image/') || isImageFile(item.file.name);
                  resolve({
                    url,
                    name: item.file.name,
                    type: isImage ? 'image' : (isVideo ? 'video' : 'file')
                  });
                } catch (err) {
                  reject(err);
                }
              }
            );
          });
        });
        
        attachments = await Promise.all(uploadPromises);
        setStagedFiles([]);
        setIsUploading(false);
      }
      
      const actualType = attachments.length > 0 ? (attachments.length === 1 && !textToSend ? attachments[0].type : 'mixed') : type;
      let finalFileUrl = fileUrl;
      let finalFileName = fileName;
      if (attachments.length === 1 && actualType !== 'mixed') {
         finalFileUrl = attachments[0].url;
         finalFileName = attachments[0].name;
      }

      await sendMessage(chat, currentUserId, textToSend, actualType, attachments, replyTo || undefined, finalFileUrl, finalFileName);

      if (chat.type === 'saved' && actualType === 'text' && textToSend && textToSend.startsWith('/echo')) {
        const echoText = textToSend.substring(5).trim() || 'Эхо!';
        scheduleEchoBotReply(chat, 'text', echoText, undefined, undefined, true);
      } else {
        scheduleEchoBotReply(chat, actualType, textToSend || '', finalFileUrl, finalFileName);
      }

    } catch (err) {
      console.error("Error sending message:", err);
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
      if (file.size === 0) {
        alert(`Файл ${file.name} пустой и не будет загружен.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsCompressing(true);
    try {
      const newStaged = await Promise.all(validFiles.map(async file => {
        let processedFile = await compressImage(file);
        return {
          file: processedFile,
          preview: processedFile.type.startsWith('image/') || isImageFile(processedFile.name) || processedFile.type.startsWith('video/') || isVideoFile(processedFile.name) ? URL.createObjectURL(processedFile) : ''
        };
      }));

      setStagedFiles(prev => [...prev, ...newStaged]);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const rotateStagedImage = async (index: number) => {
    if (isRotating) return;
    setIsRotating(true);
    
    try {
      const item = stagedFiles[index];
      if (!item.file.type.startsWith('image/')) {
        setIsRotating(false);
        return;
      }
      
      const { file: newFile, preview: newPreview } = await rotateImage(item.file, item.preview);
      setStagedFiles(prev => {
        const newFiles = [...prev];
        if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview);
        newFiles[index] = { file: newFile, preview: newPreview };
        return newFiles;
      });
      setIsRotating(false);
    } catch (err) {
      console.error("Error rotating image:", err);
      setIsRotating(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        let handled = false;
        if (stagedFiles.length > 0) {
          setStagedFiles([]);
          handled = true;
        }
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
          handled = true;
        }
        if (showGifPicker) {
          setShowGifPicker(false);
          handled = true;
        }
        if (suggestions.length > 0) {
          setSuggestions([]);
          handled = true;
        }
        
        if (handled) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [stagedFiles.length, showEmojiPicker, showGifPicker, suggestions.length]);

  const applySuggestion = (emoji: any) => {
    if (!suggestionRange) return;
    const newText = text.substring(0, suggestionRange.start) + emoji.native + ' ' + text.substring(suggestionRange.end);
    setText(newText);
    setSuggestions([]);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = suggestionRange.start + emoji.native.length + 1;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleFileUpload(files);
    }
  };

  return (
    <div className="relative border-t border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,8,23,0.96),rgba(8,15,33,0.94))] md:p-5">
      {stagedFiles.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm animate-in fade-in duration-200 dark:bg-slate-950/70 md:p-6">
          <div data-testid="staged-upload-overlay" className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_30px_90px_-42px_rgba(15,23,42,0.45)] animate-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-[#020817]/95 dark:shadow-[0_32px_96px_-48px_rgba(2,6,23,0.95)]">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Галерея загрузки ({stagedFiles.length})</h3>
              <Button variant="ghost" className="w-9 h-9 rounded-2xl text-slate-500 hover:text-slate-700 dark:text-white/55 dark:hover:text-white" onClick={() => setStagedFiles([])}>
                <X size={20} />
              </Button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {stagedFiles.map((item, index) => (
                  <div key={index} className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]">
                    {item.preview ? (
                      item.file.type.startsWith('video/') || isVideoFile(item.file.name) ? (
                        <video src={item.preview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-2 text-slate-400 dark:text-white/35">
                        <FileIcon size={32} />
                        <span className="text-[10px] truncate w-full text-center mt-2">{item.file.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-x-2 bottom-2 rounded-xl bg-slate-950/70 px-2 py-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                      {item.preview && (
                        <button onClick={() => rotateStagedImage(index)} className="p-1.5 text-white hover:bg-white/20 rounded-full" title="Повернуть">
                          <RefreshCw size={16} />
                        </button>
                      )}
                      <button onClick={() => removeStagedFile(index)} className="p-1.5 text-white hover:bg-white/20 rounded-full" title="Удалить">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-sky-500 hover:bg-slate-100 hover:text-sky-500 dark:border-white/15 dark:text-white/35 dark:hover:bg-white/[0.04]"
                >
                  <Plus size={24} />
                  <span className="text-xs mt-2 font-medium">Добавить</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/15">
              <textarea 
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35" 
                placeholder="Добавьте подпись или комментарий"
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(text);
                  } else if (e.key === 'Escape') {
                    e.stopPropagation();
                    setStagedFiles([]);
                  }
                }}
                autoFocus
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-white/55">Можно отправить сразу или добавить короткую подпись.</p>
                <Button 
                  data-testid="send-staged-files-button"
                  className="rounded-2xl px-6 py-3" 
                  onClick={() => handleSend(text)}
                  disabled={isUploading || isRotating || isCompressing}
                >
                  {isUploading ? "Загрузка..." : (isRotating ? "Обработка..." : (isCompressing ? "Сжатие..." : "Отправить"))}
                  {!isUploading && !isRotating && !isCompressing && <Send size={16} className="ml-2" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {replyTo && (
        <div data-testid="reply-banner" className="mx-auto mb-3 flex max-w-4xl items-center justify-between rounded-2xl border border-sky-100 bg-white p-3 shadow-[0_16px_32px_-28px_rgba(2,132,199,0.9)] animate-in slide-in-from-bottom-2 duration-200 dark:border-sky-400/20 dark:bg-white/[0.06] dark:shadow-none">
          <div className="flex flex-col gap-0.5 overflow-hidden">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300">
              <Reply size={10} /> Ответ пользователю {replySender?.displayName || '...'}
            </span>
            <p className="truncate text-xs text-slate-600 dark:text-white/60">
              {replyTo.type === 'image' ? '📷 Фото' : (replyTo.type === 'video' ? '📹 Видео' : (replyTo.type === 'file' ? '📄 Файл' : replyTo.text))}
            </p>
          </div>
          <button 
            onClick={onCancelReply}
            className="flex-shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-white/40 dark:hover:bg-white/8 dark:hover:text-white/70"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div data-testid="composer" className="max-w-4xl mx-auto flex items-end gap-2 md:gap-3 relative">
        {showGifPicker && (
          <GifPicker 
            onSelect={(url) => handleSend('', 'image', url, 'GIF')} 
            onClose={() => setShowGifPicker(false)} 
            currentUserId={currentUserId}
          />
        )}
        <input 
          data-testid="composer-file-input"
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple
          onChange={(e) => handleFileUpload(e.target.files ? Array.from(e.target.files) : [])}
        />
        <Button 
          variant="ghost" 
          className="h-10 w-10 flex-shrink-0 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.1] md:h-11 md:w-11" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isCompressing}
          title="Добавить вложение"
        >
          <Paperclip size={20} className="md:w-6 md:h-6" />
        </Button>
        <div className="relative flex min-h-[48px] flex-1 items-center rounded-[1.6rem] border border-slate-200 bg-white px-3 py-2 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.45)] ring-sky-500/20 transition-all focus-within:border-sky-200 focus-within:ring-2 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-2 duration-200 dark:border-white/10 dark:bg-[#020817] dark:shadow-[0_24px_60px_-36px_rgba(2,6,23,0.95)]">
              <div className="border-b border-slate-100 bg-slate-50 p-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/35">
                Подсказки эмодзи
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {suggestions.map((emoji, index) => (
                  <button
                    key={emoji.id}
                    onClick={() => applySuggestion(emoji)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                      index === suggestionIndex ? "bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-200" : "text-slate-700 hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="text-xl">{emoji.native}</span>
                    <span className="truncate flex-1 text-left">:{emoji.id}:</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea 
            data-testid="composer-input"
            ref={textareaRef}
            className="hide-scrollbar max-h-32 w-full resize-none border-none bg-transparent py-2 text-sm text-slate-900 placeholder-slate-500 focus:ring-0 dark:text-white dark:placeholder:text-white/35" 
            placeholder={isUploading ? "Загрузка..." : (isCompressing ? "Сжатие..." : "Сообщение")}
            rows={1}
            value={text}
            onChange={(e) => {
              const value = e.target.value;
              setText(value);
              
              const cursor = e.target.selectionStart;
              const textBeforeCursor = value.substring(0, cursor);
              const match = textBeforeCursor.match(/:([a-zA-Zа-яА-Я0-9_]*)$/);
              
              if (match) {
                const query = match[1];
                const results = searchEmojis(query);
                setSuggestions(results);
                setSuggestionIndex(0);
                setSuggestionRange({ start: cursor - match[0].length, end: cursor });
              } else {
                setSuggestions([]);
              }
            }}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (suggestions.length > 0) {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSuggestionIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSuggestionIndex(prev => (prev >= suggestions.length - 1 ? 0 : prev + 1));
                  return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  applySuggestion(suggestions[suggestionIndex]);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setSuggestions([]);
                  return;
                }
              }

              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(text);
              } else if (e.key === 'Escape') {
                if (showGifPicker) {
                  e.stopPropagation();
                  setShowGifPicker(false);
                } else if (showEmojiPicker) {
                  e.stopPropagation();
                  setShowEmojiPicker(false);
                } else if (replyTo) {
                  e.stopPropagation();
                  onCancelReply();
                }
              }
            }}
            disabled={isUploading}
            autoFocus
          />
          <div className="flex items-center gap-1 relative">
            <Button 
              data-testid="emoji-toggle-button"
              variant="ghost" 
              className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowGifPicker(false);
              }}
              title="Эмодзи"
            >
              <Smile size={20} />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 z-50 shadow-2xl rounded-xl overflow-hidden emoji-picker-container" ref={emojiPickerRef}>
                <Picker 
                  data={data}
                  onEmojiSelect={(emoji: any) => {
                    setText(prev => prev + emoji.native);
                    setShowEmojiPicker(false);
                  }}
                  i18n={i18n_ru}
                  theme="light"
                  autoFocus={true}
                />
              </div>
            )}
            <Button 
              data-testid="gif-toggle-button"
              variant="ghost" 
              className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70"
              onClick={() => {
                setShowGifPicker(!showGifPicker);
                setShowEmojiPicker(false);
              }}
              title="Выбрать GIF"
            >
              <Sticker size={20} />
            </Button>
          </div>
        </div>
        <Button 
          data-testid="send-message-button"
          className="w-10 h-10 md:w-11 md:h-11 rounded-2xl shadow-[0_14px_28px_-20px_rgba(2,132,199,0.9)] flex-shrink-0" 
          onClick={() => handleSend(text)}
          disabled={(!text.trim() && stagedFiles.length === 0) || isUploading || isRotating}
        >
          <Send size={20} className="md:w-6 md:h-6" />
        </Button>
      </div>
    </div>
  );
}

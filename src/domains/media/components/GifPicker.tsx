import React, { useEffect, useState } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from '@/firebase';

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  currentUserId: string;
}

export function GifPicker({ onSelect, onClose, currentUserId }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'recent'>('trending');

  const [userDoc] = useDocument(doc(db, 'users', currentUserId));
  const recentGifs = userDoc?.data()?.recentGifs || [];

  useEffect(() => {
    if (activeTab === 'recent') return;
    if (!query) {
      loadTrending();
      return;
    }
    const timeoutId = setTimeout(() => {
      searchGifs(query);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query, activeTab]);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gifs/trending');
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error loading trending GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (value: string) => {
    if (!value.trim()) {
      loadTrending();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/gifs/search?q=${encodeURIComponent(value)}`,
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (gif: any) => {
    onSelect(gif.images.original.url);

    try {
      const filteredRecent = recentGifs.filter((entry: any) => entry.id !== gif.id);
      const newRecent = [
        {
          id: gif.id,
          title: gif.title,
          images: {
            fixed_height_small: { url: gif.images.fixed_height_small.url },
            original: { url: gif.images.original.url },
          },
        },
        ...filteredRecent,
      ].slice(0, 20);

      await updateDoc(doc(db, 'users', currentUserId), {
        recentGifs: newRecent,
      });
    } catch (error) {
      console.error('Error saving recent GIF:', error);
    }
  };

  const displayGifs = activeTab === 'recent' && !query ? recentGifs : gifs;

  return (
    <div
      data-testid="gif-picker"
      className="absolute bottom-full right-0 z-20 mb-2 flex h-96 w-80 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#020817] dark:shadow-[0_28px_70px_-40px_rgba(2,6,23,0.95)]"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35"
            size={16}
          />
          <input
            type="text"
            placeholder="Поиск GIF..."
            className="w-full rounded-xl border-none bg-slate-100 py-2 pl-8 pr-2 text-sm text-slate-900 placeholder-slate-400 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value && activeTab === 'recent') {
                setActiveTab('trending');
              }
            }}
            onKeyDown={(event) => event.key === 'Enter' && searchGifs(query)}
          />
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-full p-2 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/8"
        >
          <X size={16} />
        </button>
      </div>

      {!query && (
        <div className="mb-3 flex gap-2 border-b border-slate-100 pb-2 dark:border-white/10">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'trending'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/12 dark:text-sky-200'
                : 'text-slate-500 hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/8'
            }`}
          >
            <TrendingUp size={14} />
            В тренде
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'recent'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/12 dark:text-sky-200'
                : 'text-slate-500 hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/8'
            }`}
          >
            <Clock size={14} />
            Недавние
          </button>
        </div>
      )}

      <div className="grid flex-1 content-start grid-cols-2 gap-2 overflow-y-auto">
        {loading ? (
          <div className="col-span-2 py-4 text-center text-sm text-slate-500 dark:text-white/55">
            Загрузка...
          </div>
        ) : displayGifs.length === 0 ? (
          <div className="col-span-2 py-4 text-center text-sm text-slate-500 dark:text-white/55">
            {activeTab === 'recent' ? 'Нет недавних GIF' : 'Ничего не найдено'}
          </div>
        ) : (
          displayGifs.map((gif: any) => (
            <img
              key={gif.id}
              src={gif.images.fixed_height_small.url}
              alt={gif.title}
              className="h-24 w-full cursor-pointer rounded-lg bg-slate-100 object-cover hover:opacity-80 dark:bg-white/8"
              onClick={() => handleSelect(gif)}
              referrerPolicy="no-referrer"
            />
          ))
        )}
      </div>
    </div>
  );
}

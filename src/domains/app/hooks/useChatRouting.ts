import { useEffect, useState } from 'react';

export function useChatRouting() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const syncFromLocation = () => {
      const path = window.location.pathname;
      if (path.startsWith('/chat/')) {
        const id = path.split('/chat/')[1];
        if (id) {
          setSelectedChatId(id);
          if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
          }
          return;
        }
      }

      setSelectedChatId(null);
      setIsSidebarOpen(true);
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  useEffect(() => {
    const nextPath = selectedChatId ? `/chat/${selectedChatId}` : '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (selectedChatId && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [selectedChatId]);

  const openChat = (chatId: string) => {
    setSelectedChatId(chatId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const closeChat = () => {
    setSelectedChatId(null);
    setIsSidebarOpen(true);
  };

  return {
    selectedChatId,
    setSelectedChatId,
    isSidebarOpen,
    setIsSidebarOpen,
    openChat,
    closeChat,
  };
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Check if the user is already looking at this chat
        const targetUrl = new URL(data.url || '/', self.location.origin).href;
        let isFocused = false;
        
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.focused && client.url === targetUrl) {
            isFocused = true;
            break;
          }
        }
        
        if (isFocused) {
          // Don't show notification if the user is already looking at the chat
          return;
        }
        
        return self.registration.showNotification(data.title, {
          body: data.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: data.url
        });
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, check if there's ANY window open to focus and navigate
      if (windowClients.length > 0) {
        const client = windowClients[0];
        if ('focus' in client) {
          client.focus();
        }
        if ('navigate' in client) {
          return client.navigate(urlToOpen);
        }
      }
      
      // If no windows are open, open a new one.
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

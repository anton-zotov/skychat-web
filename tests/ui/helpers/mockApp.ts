import {expect, test as base, type Page} from '@playwright/test';

declare global {
  interface Window {
    __skychatTest?: {
      notificationPermission: NotificationPermission;
      notifications: Array<{title: string; options?: NotificationOptions}>;
      badgeCount: number | null;
      clipboardText: string;
      subscription: any;
      systemTheme: 'light' | 'dark';
      focusState: boolean;
      matchMediaListeners: Set<(event: {matches: boolean}) => void>;
      lastAudioPlayCount: number;
    };
    __skychatMock?: {
      reset: () => void;
      signOut: () => void;
      signIn: () => void;
      getCurrentUser: () => unknown;
      getDocument: (path: string) => unknown;
      getCollection: (prefix: string) => Array<{path: string; data: unknown}>;
      setDocument: (path: string, payload: unknown) => Promise<void>;
      updateDocument: (path: string, payload: unknown) => Promise<void>;
      deleteDocument: (path: string) => Promise<void>;
      createIncomingCall: (payload?: Record<string, unknown>) => Promise<string>;
    };
    __setNotificationPermission?: (value: NotificationPermission) => void;
    __setPushSubscription?: (value: any) => void;
    __setSystemTheme?: (value: 'light' | 'dark') => void;
    __setDocumentFocus?: (value: boolean) => void;
  }
}

export const test = base;
export {expect};

export async function installMockApp(page: Page, baseURL: string) {
  const allowedOrigin = new URL(baseURL).origin;
  const moduleOverrides: Array<[RegExp, string]> = [
    [/\/src\/firebase\.ts(?:\?.*)?$/, '/tests/ui/module-mocks/firebase-local.js'],
    [/\/src\/shared\/constants\/index\.ts(?:\?.*)?$/, '/tests/ui/module-mocks/shared-constants.js'],
    [/\/firebase_firestore(?:\.js)?(?:\?.*)?$/, '/tests/ui/module-mocks/firebase-firestore.js'],
    [/\/firebase_storage(?:\.js)?(?:\?.*)?$/, '/tests/ui/module-mocks/firebase-storage.js'],
    [/\/react-firebase-hooks_auth(?:\.js)?(?:\?.*)?$/, '/tests/ui/module-mocks/hooks-auth.js'],
    [/\/react-firebase-hooks_firestore(?:\.js)?(?:\?.*)?$/, '/tests/ui/module-mocks/hooks-firestore.js'],
  ];

  await page.addInitScript(() => {
    const fixedNow = Date.parse('2026-04-26T09:24:30.000Z');
    Date.now = () => fixedNow;

    const testState = {
      notificationPermission: 'default' as NotificationPermission,
      notifications: [] as Array<{title: string; options?: NotificationOptions}>,
      badgeCount: null as number | null,
      clipboardText: '',
      subscription: null as any,
      systemTheme: 'light' as 'light' | 'dark',
      focusState: true,
      matchMediaListeners: new Set<(event: {matches: boolean}) => void>(),
      lastAudioPlayCount: 0,
    };
    window.__skychatTest = testState;

    const registration = {
      scope: '/',
      pushManager: {
        getSubscription: async () => testState.subscription,
        subscribe: async () => {
          testState.subscription = {
            endpoint: 'https://push.example.test/subscription',
            keys: {auth: 'auth', p256dh: 'p256dh'},
          };
          return testState.subscription;
        },
      },
      showNotification: async (title: string, options?: NotificationOptions) => {
        testState.notifications.push({title, options});
      },
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: async () => registration,
        ready: Promise.resolve(registration),
      },
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          testState.clipboardText = text;
        },
      },
    });

    Object.defineProperty(navigator, 'setAppBadge', {
      configurable: true,
      value: async (count: number) => {
        testState.badgeCount = count;
      },
    });

    Object.defineProperty(navigator, 'clearAppBadge', {
      configurable: true,
      value: async () => {
        testState.badgeCount = null;
      },
    });

    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value: () => testState.focusState,
    });

    window.__setDocumentFocus = value => {
      testState.focusState = value;
    };

    const matchMedia = (_query: string) => ({
      matches: testState.systemTheme === 'dark',
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (_event: string, handler: (event: {matches: boolean}) => void) => {
        testState.matchMediaListeners.add(handler);
      },
      removeEventListener: (_event: string, handler: (event: {matches: boolean}) => void) => {
        testState.matchMediaListeners.delete(handler);
      },
      addListener: (handler: (event: {matches: boolean}) => void) => {
        testState.matchMediaListeners.add(handler);
      },
      removeListener: (handler: (event: {matches: boolean}) => void) => {
        testState.matchMediaListeners.delete(handler);
      },
      dispatchEvent: () => true,
    });

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMedia,
    });

    window.__setSystemTheme = value => {
      testState.systemTheme = value;
      for (const listener of testState.matchMediaListeners) {
        listener({matches: value === 'dark'});
      }
    };

    class MockNotification {
      static permission: NotificationPermission = 'default';
      constructor(title: string, options?: NotificationOptions) {
        testState.notifications.push({title, options});
      }
      static async requestPermission() {
        return MockNotification.permission;
      }
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: MockNotification,
    });

    window.__setNotificationPermission = value => {
      MockNotification.permission = value;
      testState.notificationPermission = value;
    };

    window.__setPushSubscription = value => {
      testState.subscription = value;
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{stop() {}, enabled: true}],
          getAudioTracks: () => [{enabled: true}],
        }),
      },
    });

    class MockAudio {
      srcObject: unknown;
      async play() {
        testState.lastAudioPlayCount += 1;
      }
    }

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: MockAudio,
    });
  });

  await page.route('**/*', async route => {
    const url = route.request().url();
    const pathname = new URL(url).pathname;

    for (const [pattern, replacement] of moduleOverrides) {
      if (pattern.test(pathname)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: `export * from '${replacement}';`,
        });
        return;
      }
    }

    if (pathname === '/api/health') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({status: 'ok'}),
      });
      return;
    }

    if (pathname === '/api/vapidPublicKey') {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'QUFBQQ',
      });
      return;
    }

    if (pathname === '/api/sendPush') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({success: true}),
      });
      return;
    }

    if (pathname === '/api/gifs/trending' || pathname === '/api/gifs/search') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'gif-design',
              title: 'Design Sync',
              images: {
                fixed_height_small: {
                  url: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230ea5e9'/%3E%3Cstop offset='100%25' stop-color='%2322d3ee'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='180' rx='24' fill='url(%23g)'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='28' font-weight='700' fill='white'%3EDesign Sync%3C/text%3E%3C/svg%3E",
                },
                original: {
                  url: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230ea5e9'/%3E%3Cstop offset='100%25' stop-color='%2322d3ee'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' rx='36' fill='url(%23g)'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='42' font-weight='700' fill='white'%3EDesign Sync%3C/text%3E%3C/svg%3E",
                },
              },
            },
            {
              id: 'gif-release',
              title: 'Release',
              images: {
                fixed_height_small: {
                  url: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f97316'/%3E%3Cstop offset='100%25' stop-color='%23fb7185'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='180' rx='24' fill='url(%23g)'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='28' font-weight='700' fill='white'%3ERelease%3C/text%3E%3C/svg%3E",
                },
                original: {
                  url: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f97316'/%3E%3Cstop offset='100%25' stop-color='%23fb7185'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' rx='36' fill='url(%23g)'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='42' font-weight='700' fill='white'%3ERelease%3C/text%3E%3C/svg%3E",
                },
              },
            },
          ],
        }),
      });
      return;
    }

    if (
      url.startsWith(allowedOrigin) ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return route.continue();
    }

    return route.abort();
  });
}

export async function gotoMockApp(page: Page, path = '/') {
  await page.goto(path);
  await page.evaluate(() => {
    window.__skychatMock?.reset();
  });
}

export async function getTestState(page: Page) {
  return page.evaluate(() => {
    const state = window.__skychatTest;
    if (!state) return undefined;
    return {
      notificationPermission: state.notificationPermission,
      notifications: state.notifications,
      badgeCount: state.badgeCount,
      clipboardText: state.clipboardText,
      subscription: state.subscription,
      systemTheme: state.systemTheme,
      focusState: state.focusState,
      lastAudioPlayCount: state.lastAudioPlayCount,
    };
  });
}

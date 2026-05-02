import { beforeEach, describe, expect, it, vi } from 'vitest';

import { subscribeCurrentUserToPush } from './notificationService';

const { updateDocMock, docMock } = vi.hoisted(() => ({
  updateDocMock: vi.fn(),
  docMock: vi.fn((_db, collectionName: string, id: string) => `${collectionName}/${id}`),
}));

vi.mock('@/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  getDoc: vi.fn(),
  updateDoc: updateDocMock,
}));

function setServiceWorkerRegistration(registration: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve(registration),
    },
  });
}

describe('subscribeCurrentUserToPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        text: async () => 'AQID',
      })),
    );
  });

  it('reuses an existing subscription when it matches the active VAPID key', async () => {
    const existingSubscription = {
      endpoint: 'https://push.example.test/current',
      options: {
        applicationServerKey: new Uint8Array([1, 2, 3]).buffer,
      },
      unsubscribe: vi.fn(async () => true),
    };
    const subscribeMock = vi.fn();

    setServiceWorkerRegistration({
      pushManager: {
        getSubscription: vi.fn(async () => existingSubscription),
        subscribe: subscribeMock,
      },
    });

    const result = await subscribeCurrentUserToPush('user-1');

    expect(result).toBe(existingSubscription);
    expect(existingSubscription.unsubscribe).not.toHaveBeenCalled();
    expect(subscribeMock).not.toHaveBeenCalled();
    expect(updateDocMock).toHaveBeenCalledWith('users/user-1', {
      pushSubscription: {
        endpoint: 'https://push.example.test/current',
        options: {
          applicationServerKey: {},
        },
      },
    });
  });

  it('re-subscribes when the existing subscription was created with a different VAPID key', async () => {
    const newSubscription = {
      endpoint: 'https://push.example.test/new',
      options: {
        applicationServerKey: new Uint8Array([1, 2, 3]).buffer,
      },
      unsubscribe: vi.fn(async () => true),
    };
    const existingSubscription = {
      endpoint: 'https://push.example.test/old',
      options: {
        applicationServerKey: new Uint8Array([9, 9, 9]).buffer,
      },
      unsubscribe: vi.fn(async () => true),
    };
    const subscribeMock = vi.fn(async () => newSubscription);

    setServiceWorkerRegistration({
      pushManager: {
        getSubscription: vi.fn(async () => existingSubscription),
        subscribe: subscribeMock,
      },
    });

    const result = await subscribeCurrentUserToPush('user-2');

    expect(existingSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(result).toBe(newSubscription);
    expect(updateDocMock).toHaveBeenCalledWith('users/user-2', {
      pushSubscription: {
        endpoint: 'https://push.example.test/new',
        options: {
          applicationServerKey: {},
        },
      },
    });
  });
});

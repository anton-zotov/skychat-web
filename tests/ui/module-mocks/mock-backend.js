import {useEffect, useState} from 'react';

class MockTimestamp {
  constructor(input) {
    this.value = typeof input === 'number' ? input : new Date(input).getTime();
  }

  toDate() {
    return new Date(this.value);
  }

  toMillis() {
    return this.value;
  }
}

const BASE_NOW = Date.parse('2026-04-26T09:24:00.000Z');
const mockCurrentUserId = 'user_me';
const documents = new Map();
const uploadUrls = new Map();
const idCounters = new Map();
const authListeners = new Set();
const docListeners = new Set();
const queryListeners = new Set();
let nowCounter = 0;
let currentUser = null;

function ensureWindowApi() {
  if (typeof window === 'undefined') return;
  window.__skychatMock = {
    reset() {
      seedStore();
      notifyAll();
    },
    signOut() {
      currentUser = null;
      notifyAll();
    },
    signIn() {
      currentUser = cloneValue(mockUsers[0]);
      notifyAll();
    },
    getCurrentUser() {
      return currentUser ? cloneValue(currentUser) : null;
    },
    getDocument(path) {
      return getDocumentData(path);
    },
    getCollection(prefix) {
      return [...documents.entries()]
        .filter(([path]) => path.startsWith(prefix))
        .map(([path, value]) => ({path, data: cloneValue(value)}));
    },
    async setDocument(path, payload) {
      documents.set(path, resolveStoredValue(payload));
      notifyAll();
    },
    async updateDocument(path, payload) {
      const nextValue = getDocumentData(path) || {};
      Object.entries(payload).forEach(([key, value]) => {
        setNestedValue(nextValue, key, resolveStoredValue(value, getNestedValue(nextValue, key)));
      });
      documents.set(path, nextValue);
      notifyAll();
    },
    async deleteDocument(path) {
      documents.delete(path);
      notifyAll();
    },
    async createIncomingCall({
      id = `call_${Date.now()}`,
      chatId = 'anna-private',
      callerId = 'anna',
      receiverId = mockCurrentUserId,
      status = 'ringing',
      type = 'audio',
    } = {}) {
      const path = `calls/${id}`;
      documents.set(path, {
        id,
        chatId,
        callerId,
        receiverId,
        status,
        type,
        createdAt: nextTimestamp(),
      });
      notifyAll();
      return id;
    },
  };
}

const auth = {kind: 'playwright-mock-auth'};
const db = {kind: 'playwright-mock-db'};
const storage = {kind: 'playwright-mock-storage'};

const serverTimestampMarker = {__mockOp: 'serverTimestamp'};

const avatarDataUrl = (initials, from, to) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="36" fill="url(#g)" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `)}`;

const imageDataUrl = (label, from, to) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" rx="36" fill="url(#g)" />
      <circle cx="138" cy="128" r="56" fill="rgba(255,255,255,0.18)" />
      <circle cx="520" cy="84" r="38" fill="rgba(255,255,255,0.15)" />
      <path d="M120 320L236 198L320 270L406 188L520 320H120Z" fill="rgba(255,255,255,0.22)" />
      <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${label}</text>
    </svg>
  `)}`;

const mockGifs = [
  {
    id: 'gif-design',
    title: 'Design Sync',
    images: {
      fixed_height_small: {url: imageDataUrl('Design Sync', '#0ea5e9', '#22d3ee')},
      original: {url: imageDataUrl('Design Sync', '#0ea5e9', '#22d3ee')},
    },
  },
  {
    id: 'gif-release',
    title: 'Release',
    images: {
      fixed_height_small: {url: imageDataUrl('Release', '#f97316', '#fb7185')},
      original: {url: imageDataUrl('Release', '#f97316', '#fb7185')},
    },
  },
  {
    id: 'gif-mobile',
    title: 'Mobile QA',
    images: {
      fixed_height_small: {url: imageDataUrl('Mobile QA', '#10b981', '#14b8a6')},
      original: {url: imageDataUrl('Mobile QA', '#10b981', '#14b8a6')},
    },
  },
];

const mockUsers = [
  {
    uid: mockCurrentUserId,
    displayName: 'Anton Rivera',
    photoURL: avatarDataUrl('AR', '#0284c7', '#38bdf8'),
    email: 'anton@skychat.local',
    lastSeen: new MockTimestamp('2026-04-26T09:23:00.000Z'),
    recentGifs: mockGifs.slice(0, 2),
    privacy: {showLastSeen: true, showOnlineStatus: true},
  },
  {
    uid: 'anna',
    displayName: 'Anna Kovacs',
    photoURL: avatarDataUrl('AK', '#ec4899', '#fb7185'),
    email: 'anna@skychat.local',
    lastSeen: new MockTimestamp('2026-04-26T09:22:30.000Z'),
    privacy: {showLastSeen: true, showOnlineStatus: true},
  },
  {
    uid: 'sam',
    displayName: 'Sam Turner',
    photoURL: avatarDataUrl('ST', '#8b5cf6', '#a78bfa'),
    email: 'sam@skychat.local',
    lastSeen: new MockTimestamp('2026-04-26T09:18:00.000Z'),
    privacy: {showLastSeen: true, showOnlineStatus: true},
  },
  {
    uid: 'maya',
    displayName: 'Maya Chen',
    photoURL: avatarDataUrl('MC', '#14b8a6', '#2dd4bf'),
    email: 'maya@skychat.local',
    lastSeen: new MockTimestamp('2026-04-26T08:45:00.000Z'),
    privacy: {showLastSeen: true, showOnlineStatus: true},
  },
];

const mockChats = [
  {
    id: 'design-lab',
    name: 'Design Lab',
    type: 'group',
    participants: [mockCurrentUserId, 'anna', 'sam', 'maya'],
    lastMessage: {
      text: 'Real app snapshots now run against a fully mocked backend.',
      senderId: mockCurrentUserId,
      createdAt: new MockTimestamp('2026-04-26T09:21:00.000Z'),
    },
    unreadCount: {[mockCurrentUserId]: 0, anna: 1, sam: 0, maya: 0},
    updatedAt: new MockTimestamp('2026-04-26T09:21:00.000Z'),
    createdBy: mockCurrentUserId,
  },
  {
    id: 'saved-user-me',
    name: 'Saved Messages',
    type: 'saved',
    participants: [mockCurrentUserId],
    lastMessage: {
      text: 'Checklist: keep snapshots deterministic.',
      senderId: mockCurrentUserId,
      createdAt: new MockTimestamp('2026-04-26T08:56:00.000Z'),
    },
    unreadCount: {[mockCurrentUserId]: 0},
    updatedAt: new MockTimestamp('2026-04-26T08:56:00.000Z'),
    createdBy: mockCurrentUserId,
  },
  {
    id: 'anna-private',
    type: 'private',
    participants: [mockCurrentUserId, 'anna'],
    lastMessage: {
      text: 'Can we freeze the release branch after lunch?',
      senderId: 'anna',
      createdAt: new MockTimestamp('2026-04-26T08:31:00.000Z'),
    },
    unreadCount: {[mockCurrentUserId]: 1, anna: 0},
    updatedAt: new MockTimestamp('2026-04-26T08:31:00.000Z'),
    createdBy: 'anna',
  },
  {
    id: 'launch-ops',
    name: 'Launch Ops',
    type: 'group',
    participants: [mockCurrentUserId, 'sam', 'maya'],
    lastMessage: {
      text: 'Mobile QA pass is queued for after lunch.',
      senderId: 'sam',
      createdAt: new MockTimestamp('2026-04-26T07:42:00.000Z'),
    },
    unreadCount: {[mockCurrentUserId]: 0, sam: 0, maya: 0},
    updatedAt: new MockTimestamp('2026-04-26T07:42:00.000Z'),
    createdBy: 'sam',
  },
];

const mockMessagesByChat = {
  'design-lab': [
    {
      id: 'msg-anna-1',
      chatId: 'design-lab',
      senderId: 'anna',
      text: 'Desktop is looking sharp. Let’s make sure the **real app** can render from a mocked backend without any Firebase dependency.',
      type: 'text',
      createdAt: new MockTimestamp('2026-04-26T09:12:00.000Z'),
      readBy: {
        [mockCurrentUserId]: new MockTimestamp('2026-04-26T09:12:30.000Z'),
        sam: new MockTimestamp('2026-04-26T09:13:00.000Z'),
      },
    },
    {
      id: 'msg-me-1',
      chatId: 'design-lab',
      senderId: mockCurrentUserId,
      text: 'Agreed. I am switching the app to Playwright-side backend mocks so it can keep visiting the normal localhost app.',
      type: 'text',
      createdAt: new MockTimestamp('2026-04-26T09:15:00.000Z'),
      readBy: {
        anna: new MockTimestamp('2026-04-26T09:15:20.000Z'),
        sam: new MockTimestamp('2026-04-26T09:15:28.000Z'),
        maya: new MockTimestamp('2026-04-26T09:15:41.000Z'),
      },
      reactions: {'👍': ['anna', 'sam'], '🔥': ['maya']},
    },
    {
      id: 'msg-sam-1',
      chatId: 'design-lab',
      senderId: 'sam',
      text: 'Perfect. Zero-diff screenshots only mean something if the backend state is deterministic too.',
      type: 'text',
      createdAt: new MockTimestamp('2026-04-26T09:18:00.000Z'),
      replyTo: {
        id: 'msg-me-1',
        text: 'Agreed. I am switching the app to Playwright-side backend mocks so it can keep visiting the normal localhost app.',
        senderId: mockCurrentUserId,
        type: 'text',
      },
      readBy: {
        [mockCurrentUserId]: new MockTimestamp('2026-04-26T09:18:25.000Z'),
      },
      reactions: {'💯': [mockCurrentUserId, 'anna']},
    },
    {
      id: 'msg-me-2',
      chatId: 'design-lab',
      senderId: mockCurrentUserId,
      text: 'That is in place now. The real app still boots normally, while Playwright swaps the Firebase modules in-browser before the page executes.',
      type: 'text',
      createdAt: new MockTimestamp('2026-04-26T09:21:00.000Z'),
      readBy: {
        anna: new MockTimestamp('2026-04-26T09:21:11.000Z'),
        sam: new MockTimestamp('2026-04-26T09:21:14.000Z'),
      },
      isEdited: true,
    },
    {
      id: 'msg-anna-2',
      chatId: 'design-lab',
      senderId: 'anna',
      text: 'Specs to verify:\n- [release notes](https://example.com/release)\n- keep multiline formatting intact',
      type: 'text',
      createdAt: new MockTimestamp('2026-04-26T09:22:00.000Z'),
      readBy: {
        [mockCurrentUserId]: new MockTimestamp('2026-04-26T09:22:12.000Z'),
      },
    },
    {
      id: 'msg-maya-images',
      chatId: 'design-lab',
      senderId: 'maya',
      text: 'Visual options for the launch banner.',
      type: 'mixed',
      createdAt: new MockTimestamp('2026-04-26T09:22:20.000Z'),
      attachments: [
        {
          url: imageDataUrl('Banner A', '#6366f1', '#8b5cf6'),
          name: 'banner-a.png',
          type: 'image',
        },
        {
          url: imageDataUrl('Banner B', '#14b8a6', '#06b6d4'),
          name: 'banner-b.png',
          type: 'image',
        },
      ],
      readBy: {
        [mockCurrentUserId]: new MockTimestamp('2026-04-26T09:22:35.000Z'),
      },
    },
    {
      id: 'msg-sam-video',
      chatId: 'design-lab',
      senderId: 'sam',
      text: 'Quick motion study attached.',
      type: 'mixed',
      createdAt: new MockTimestamp('2026-04-26T09:22:40.000Z'),
      attachments: [
        {
          url: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAGbW9vdg==',
          name: 'motion-study.mp4',
          type: 'video',
        },
        {
          url: 'data:text/plain;base64,cmVsZWFzZSBjaGVja2xpc3Q=',
          name: 'release-checklist.txt',
          type: 'file',
        },
      ],
      readBy: {
        [mockCurrentUserId]: new MockTimestamp('2026-04-26T09:22:55.000Z'),
      },
    },
    {
      id: 'msg-file-search',
      chatId: 'design-lab',
      senderId: 'sam',
      text: 'File for release sign-off.',
      type: 'file',
      fileUrl: 'data:text/plain;base64,cmVsZWFzZSBjaGVja2xpc3Q=',
      fileName: 'release-checklist.txt',
      createdAt: new MockTimestamp('2026-04-26T09:23:00.000Z'),
      readBy: {
        [mockCurrentUserId]: new MockTimestamp('2026-04-26T09:23:15.000Z'),
      },
    },
  ],
  'saved-user-me': [
    {
      id: 'msg-saved-1',
      chatId: 'saved-user-me',
      senderId: mockCurrentUserId,
      text: 'Checklist: keep snapshots deterministic.',
      type: 'text',
      createdAt: new MockTimestamp('2026-04-26T08:56:00.000Z'),
    },
  ],
  'anna-private': [
    {
      id: 'msg-private-1',
      chatId: 'anna-private',
      senderId: 'anna',
      text: 'Can we freeze the release branch after lunch?',
      type: 'text',
      createdAt: new MockTimestamp('2026-04-26T08:31:00.000Z'),
      readBy: {},
    },
  ],
  'launch-ops': [
    {
      id: 'msg-launch-1',
      chatId: 'launch-ops',
      senderId: 'sam',
      text: 'Mobile QA pass is queued for after lunch.',
      type: 'text',
      createdAt: new MockTimestamp('2026-04-26T07:42:00.000Z'),
    },
  ],
};

function cloneValue(value) {
  if (value instanceof MockTimestamp) {
    return new MockTimestamp(value.toMillis());
  }
  if (Array.isArray(value)) {
    return value.map(item => cloneValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)]));
  }
  return value;
}

function normalizeValue(value) {
  if (value instanceof MockTimestamp) {
    return {__timestamp: value.toMillis()};
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalizeValue(nested)]));
  }
  return value;
}

function stableHash(value) {
  return JSON.stringify(normalizeValue(value));
}

function getNestedValue(source, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

function setNestedValue(target, path, value) {
  const keys = path.split('.');
  let cursor = target;
  keys.slice(0, -1).forEach(key => {
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
}

function compareValues(left, right) {
  return stableHash(left) === stableHash(right);
}

function nextTimestamp() {
  return new MockTimestamp(BASE_NOW + nowCounter++ * 1000);
}

function resolveStoredValue(value, currentValue) {
  if (value === serverTimestampMarker) {
    return nextTimestamp();
  }
  if (value && typeof value === 'object' && value.__mockOp === 'arrayUnion') {
    const base = Array.isArray(currentValue) ? [...currentValue] : [];
    value.values.forEach(entry => {
      if (!base.some(item => compareValues(item, entry))) {
        base.push(cloneValue(entry));
      }
    });
    return base;
  }
  if (value && typeof value === 'object' && value.__mockOp === 'arrayRemove') {
    const base = Array.isArray(currentValue) ? [...currentValue] : [];
    return base.filter(item => !value.values.some(entry => compareValues(item, entry)));
  }
  if (value && typeof value === 'object' && value.__mockOp === 'increment') {
    return (typeof currentValue === 'number' ? currentValue : 0) + value.amount;
  }
  if (Array.isArray(value)) {
    return value.map(item => resolveStoredValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, resolveStoredValue(nested)]));
  }
  return cloneValue(value);
}

function createDocRef(path) {
  return {
    kind: 'doc',
    path,
    id: path.split('/').at(-1),
  };
}

function getDocumentData(path) {
  const value = documents.get(path);
  return value ? cloneValue(value) : undefined;
}

function createDocumentSnapshot(ref, rawData) {
  const data = rawData === undefined ? getDocumentData(ref.path) : cloneValue(rawData);
  return {
    id: ref.id,
    exists: () => data !== undefined,
    data: () => (data === undefined ? undefined : cloneValue(data)),
  };
}

function directChildRows(collectionPath) {
  const prefix = `${collectionPath}/`;
  const targetDepth = collectionPath.split('/').length + 1;
  return [...documents.keys()]
    .filter(path => path.startsWith(prefix) && path.split('/').length === targetDepth)
    .map(path => ({path, id: path.split('/').at(-1), data: getDocumentData(path)}));
}

function compareOrder(left, right) {
  const leftValue = left instanceof MockTimestamp ? left.toMillis() : left;
  const rightValue = right instanceof MockTimestamp ? right.toMillis() : right;
  if (leftValue === rightValue) return 0;
  if (leftValue == null) return -1;
  if (rightValue == null) return 1;
  return leftValue > rightValue ? 1 : -1;
}

function evaluateQuery(ref) {
  let rows = directChildRows(ref.collectionPath);

  for (const constraint of ref.constraints) {
    if (constraint.kind === 'where') {
      rows = rows.filter(row => {
        const fieldValue = getNestedValue(row.data, constraint.field);
        if (constraint.op === '==') {
          return compareValues(fieldValue, constraint.value);
        }
        if (constraint.op === 'array-contains') {
          return Array.isArray(fieldValue) && fieldValue.some(entry => compareValues(entry, constraint.value));
        }
        return false;
      });
    }
  }

  const orderConstraints = ref.constraints.filter(constraint => constraint.kind === 'orderBy');
  if (orderConstraints.length > 0) {
    rows.sort((left, right) => {
      for (const constraint of orderConstraints) {
        const diff = compareOrder(getNestedValue(left.data, constraint.field), getNestedValue(right.data, constraint.field));
        if (diff !== 0) {
          return constraint.direction === 'desc' ? diff * -1 : diff;
        }
      }
      return left.id.localeCompare(right.id);
    });
  }

  const limitConstraint = ref.constraints.find(constraint => constraint.kind === 'limit');
  if (limitConstraint) {
    rows = rows.slice(0, limitConstraint.count);
  }

  return rows;
}

function buildQuerySnapshot(ref, previous) {
  const rows = evaluateQuery(ref);
  const next = new Map(rows.map(row => [row.id, stableHash(row.data)]));
  const changes = [];

  rows.forEach(row => {
    const hash = stableHash(row.data);
    const docSnapshot = createDocumentSnapshot(createDocRef(row.path), row.data);
    if (!previous.has(row.id)) {
      changes.push({type: 'added', doc: docSnapshot});
    } else if (previous.get(row.id) !== hash) {
      changes.push({type: 'modified', doc: docSnapshot});
    }
  });

  [...previous.keys()].forEach(previousId => {
    if (!next.has(previousId)) {
      changes.push({
        type: 'removed',
        doc: createDocumentSnapshot(createDocRef(`${ref.collectionPath}/${previousId}`)),
      });
    }
  });

  return {
    snapshot: {
      docs: rows.map(row => createDocumentSnapshot(createDocRef(row.path), row.data)),
      docChanges: () => changes,
    },
    next,
  };
}

function notifyAll() {
  authListeners.forEach(listener => listener(currentUser ? cloneValue(currentUser) : null));
  docListeners.forEach(listener => listener());
  queryListeners.forEach(listener => listener());
}

function seedStore() {
  documents.clear();
  uploadUrls.clear();
  idCounters.clear();
  nowCounter = 0;
  currentUser = cloneValue(mockUsers[0]);

  mockUsers.forEach(user => {
    documents.set(`users/${user.uid}`, cloneValue(user));
  });

  mockChats.forEach(chat => {
    documents.set(`chats/${chat.id}`, cloneValue(chat));
  });

  Object.entries(mockMessagesByChat).forEach(([chatId, messages]) => {
    messages.forEach(message => {
      documents.set(`chats/${chatId}/messages/${message.id}`, cloneValue(message));
    });
  });
}

seedStore();
ensureWindowApi();

function useAuthState() {
  const [user, setUser] = useState(() => (currentUser ? cloneValue(currentUser) : null));
  useEffect(() => {
    const listener = nextUser => setUser(nextUser ? cloneValue(nextUser) : null);
    authListeners.add(listener);
    return () => authListeners.delete(listener);
  }, []);
  return [user, false, undefined];
}

function useDocument(target) {
  const [snapshot, setSnapshot] = useState(() => (target ? createDocumentSnapshot(target) : undefined));
  useEffect(() => {
    if (!target) {
      setSnapshot(undefined);
      return undefined;
    }
    const emit = () => setSnapshot(createDocumentSnapshot(target));
    emit();
    docListeners.add(emit);
    return () => docListeners.delete(emit);
  }, [target && target.path]);
  return [snapshot, false, undefined];
}

function useCollection(target) {
  const [snapshot, setSnapshot] = useState(() => {
    if (!target) return undefined;
    const queryTarget = target.kind === 'query' ? target : query(target);
    return buildQuerySnapshot(queryTarget, new Map()).snapshot;
  });

  useEffect(() => {
    if (!target) {
      setSnapshot(undefined);
      return undefined;
    }
    const queryTarget = target.kind === 'query' ? target : query(target);
    let previous = new Map();
    const emit = () => {
      const result = buildQuerySnapshot(queryTarget, previous);
      previous = result.next;
      setSnapshot(result.snapshot);
    };
    emit();
    queryListeners.add(emit);
    return () => queryListeners.delete(emit);
  }, [target && (target.kind === 'query' ? stableHash(target) : target.path)]);

  return [snapshot, false, undefined];
}

function signInWithGoogle() {
  currentUser = cloneValue(mockUsers[0]);
  notifyAll();
  return Promise.resolve();
}

function logout() {
  currentUser = null;
  notifyAll();
  return Promise.resolve();
}

function collection(...args) {
  const segments = args.slice(1);
  return {
    kind: 'collection',
    path: segments.join('/'),
  };
}

function doc(...args) {
  const segments = args.slice(1);
  return createDocRef(segments.join('/'));
}

function query(collectionRef, ...constraints) {
  return {
    kind: 'query',
    collectionPath: collectionRef.path,
    constraints,
  };
}

function where(field, op, value) {
  return {kind: 'where', field, op, value};
}

function orderBy(field, direction = 'asc') {
  return {kind: 'orderBy', field, direction};
}

function limit(count) {
  return {kind: 'limit', count};
}

function serverTimestamp() {
  return serverTimestampMarker;
}

function arrayUnion(...values) {
  return {__mockOp: 'arrayUnion', values};
}

function arrayRemove(...values) {
  return {__mockOp: 'arrayRemove', values};
}

function increment(amount) {
  return {__mockOp: 'increment', amount};
}

async function addDoc(collectionRef, payload) {
  const count = (idCounters.get(collectionRef.path) || 0) + 1;
  idCounters.set(collectionRef.path, count);
  const ref = createDocRef(`${collectionRef.path}/${collectionRef.path.split('/').at(-1)}_${count}`);
  documents.set(ref.path, resolveStoredValue(payload));
  notifyAll();
  return ref;
}

async function setDoc(ref, payload, options = {}) {
  const previous = getDocumentData(ref.path) || {};
  const nextValue = options.merge ? {...previous, ...resolveStoredValue(payload)} : resolveStoredValue(payload);
  documents.set(ref.path, nextValue);
  notifyAll();
}

async function updateDoc(ref, payload) {
  const nextValue = getDocumentData(ref.path) || {};
  Object.entries(payload).forEach(([key, value]) => {
    setNestedValue(nextValue, key, resolveStoredValue(value, getNestedValue(nextValue, key)));
  });
  documents.set(ref.path, nextValue);
  notifyAll();
}

async function deleteDoc(ref) {
  documents.delete(ref.path);
  notifyAll();
}

function onSnapshot(target, callback) {
  if (target.kind === 'doc') {
    const emit = () => callback(createDocumentSnapshot(target));
    emit();
    docListeners.add(emit);
    return () => docListeners.delete(emit);
  }
  let previous = new Map();
  const emit = () => {
    const result = buildQuerySnapshot(target, previous);
    previous = result.next;
    callback(result.snapshot);
  };
  emit();
  queryListeners.add(emit);
  return () => queryListeners.delete(emit);
}

async function getDoc(ref) {
  return createDocumentSnapshot(ref);
}

async function getDocs(target) {
  const queryTarget = target.kind === 'query' ? target : query(target);
  return buildQuerySnapshot(queryTarget, new Map()).snapshot;
}

function ref(_storage, path) {
  return {path, fullPath: path};
}

function uploadBytesResumable(storageRef, file) {
  uploadUrls.set(storageRef.path, URL.createObjectURL(file));
  const snapshot = {
    ref: storageRef,
    bytesTransferred: file.size,
    totalBytes: file.size,
    state: 'success',
  };
  return {
    snapshot,
    on(_event, next, error, complete) {
      window.setTimeout(() => {
        try {
          if (typeof next === 'function') next(snapshot);
          if (typeof complete === 'function') complete();
        } catch (reason) {
          if (typeof error === 'function') error(reason);
        }
      }, 0);
    },
  };
}

async function getDownloadURL(storageRef) {
  if (uploadUrls.has(storageRef.path)) {
    return uploadUrls.get(storageRef.path);
  }
  return imageDataUrl(storageRef.path.split('/').at(-1) || 'Attachment', '#0ea5e9', '#38bdf8');
}

export {
  addDoc,
  arrayRemove,
  arrayUnion,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDownloadURL,
  increment,
  limit,
  logout,
  mockGifs,
  onSnapshot,
  orderBy,
  query,
  ref,
  serverTimestamp,
  setDoc,
  signInWithGoogle,
  storage,
  updateDoc,
  uploadBytesResumable,
  useAuthState,
  useCollection,
  useDocument,
  where,
};

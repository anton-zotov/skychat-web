import {test as base, expect} from '@playwright/test';
import {installMockApp, gotoMockApp, getTestState} from './helpers/mockApp';
import {ChatListPage} from './pages/ChatListPage';
import {ChatPage} from './pages/ChatPage';
import {DrawerPage} from './pages/DrawerPage';
import {SettingsModal} from './pages/SettingsModal';
import {NewChatModal} from './pages/NewChatModal';
import {ImageViewerPage} from './pages/ImageViewerPage';

type TestFixtures = {
  /** Auto-fixture: installs mock backend and navigates to root. */
  mockApp: void;
  chatList: ChatListPage;
  chat: ChatPage;
  drawer: DrawerPage;
  settings: SettingsModal;
  newChat: NewChatModal;
  imageViewer: ImageViewerPage;
  mobileViewport: boolean;
  desktopViewport: boolean;
};

export const test = base.extend<TestFixtures>({
  mockApp: [async ({page, baseURL}, use) => {
    await installMockApp(page, baseURL!);
    await gotoMockApp(page, '/');
    await page.addStyleTag({
      content: '* { animation: none !important; transition: none !important; caret-color: transparent !important; }',
    });
    await use();
  }, {auto: true}],

  chatList: async ({page}, use) => {
    await use(new ChatListPage(page));
  },

  chat: async ({page}, use) => {
    await use(new ChatPage(page));
  },

  drawer: async ({page}, use) => {
    await use(new DrawerPage(page));
  },

  settings: async ({page}, use) => {
    await use(new SettingsModal(page));
  },

  newChat: async ({page}, use) => {
    await use(new NewChatModal(page));
  },

  imageViewer: async ({page}, use) => {
    await use(new ImageViewerPage(page));
  },

  mobileViewport: async ({page}, use) => {
    const viewport = page.viewportSize();
    await use(viewport ? viewport.width < 768 : false);
  },

  desktopViewport: async ({page}, use) => {
    const viewport = page.viewportSize();
    await use(viewport ? viewport.width >= 768 : true);
  },
});

export {expect, getTestState};

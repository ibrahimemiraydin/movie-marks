import { browser } from 'wxt/browser';

export const selectionMenuId = 'moviemarks-search-selection';
export const selectionMenuTitle = (language: unknown) => language === 'en' ? 'Search in Moviemarks' : 'Moviemarks’ta ara';
export function selectionQuery(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
}

/** A tab-scoped popup URL passes the text without storing it in the user's archive. */
export async function openSelectionSearch(text: unknown, tab?: { id?: number; windowId?: number }) {
  const query = selectionQuery(text);
  if (!query) return;
  const popup = `/popup.html?search=${encodeURIComponent(query)}` as const;
  let configured = false;
  try {
    if (tab?.id === undefined) throw new Error('No source tab');
    await browser.action.setPopup({ tabId: tab.id, popup });
    configured = true;
    await browser.action.openPopup(tab.windowId === undefined ? undefined : { windowId: tab.windowId });
  } catch {
    // Some Chromium browsers cannot open a toolbar popup programmatically.
    await browser.windows.create({ url: browser.runtime.getURL(popup), type: 'popup', width: 500, height: 640, focused: true });
  } finally {
    if (configured) await browser.action.setPopup({ tabId: tab!.id!, popup: '/popup.html' }).catch(() => {});
  }
}

export function registerSelectionSearch() {
  async function createMenu() {
    const { language } = await browser.storage.local.get('language');
    await browser.contextMenus.removeAll();
    browser.contextMenus.create({ id: selectionMenuId, title: selectionMenuTitle(language), contexts: ['selection'] });
  }
  browser.runtime.onInstalled.addListener(() => { void createMenu().catch(console.error); });
  browser.runtime.onStartup.addListener(() => { void createMenu().catch(console.error); });
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === selectionMenuId) void openSelectionSearch(info.selectionText, tab).catch(console.error);
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.language) void browser.contextMenus.update(selectionMenuId, { title: selectionMenuTitle(changes.language.newValue) }).catch(console.error);
  });
}

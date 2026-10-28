import { afterEach, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { openSelectionSearch, registerSelectionSearch, selectionMenuId, selectionMenuTitle, selectionQuery } from './selectionSearch';
vi.mock('wxt/browser', () => ({ browser: {
  action: { setPopup: vi.fn().mockResolvedValue(undefined), openPopup: vi.fn().mockResolvedValue(undefined) },
  windows: { create: vi.fn().mockResolvedValue({}) },
  runtime: { getURL: (path: string) => `chrome-extension://demo${path}`, onInstalled: { addListener: vi.fn() }, onStartup: { addListener: vi.fn() } },
  contextMenus: { create: vi.fn(), removeAll: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined), onClicked: { addListener: vi.fn() } },
  storage: { local: { get: vi.fn().mockResolvedValue({ language: 'tr' }) }, onChanged: { addListener: vi.fn() } },
} }));
afterEach(() => { vi.clearAllMocks(); vi.mocked(browser.action.openPopup).mockResolvedValue(undefined); });
it('seçimi güvenli sorguya çevirir; boş seçimde pencere açmaz', async () => {
  expect(selectionQuery(' \n O \t ')).toBe('O');
  expect(selectionQuery('x'.repeat(300))).toHaveLength(200);
  expect(selectionQuery(null)).toBe('');
  await openSelectionSearch('  ');
  expect(browser.action.setPopup).not.toHaveBeenCalled();
  expect(browser.windows.create).not.toHaveBeenCalled();
});
it('kaynak sekmenin popupını seçimle açar ve varsayılan URLyi geri yükler', async () => {
  await openSelectionSearch('O & Dizi?', { id: 5, windowId: 9 });
  expect(browser.action.setPopup).toHaveBeenNthCalledWith(1, { tabId: 5, popup: '/popup.html?search=O%20%26%20Dizi%3F' });
  expect(browser.action.openPopup).toHaveBeenCalledWith({ windowId: 9 });
  expect(browser.action.setPopup).toHaveBeenLastCalledWith({ tabId: 5, popup: '/popup.html' });
  expect(browser.windows.create).not.toHaveBeenCalled();
});
it('popup API reddedilirse aynı aramayı küçük uzantı penceresinde açar', async () => {
  vi.mocked(browser.action.openPopup).mockRejectedValueOnce(new Error('unsupported'));
  await openSelectionSearch('It', { id: 5 });
  expect(browser.windows.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'popup', url: 'chrome-extension://demo/popup.html?search=It' }));
  expect(browser.action.setPopup).toHaveBeenLastCalledWith({ tabId: 5, popup: '/popup.html' });
});
it('menüyü sadece metin seçimi için kurar ve uygulama diline göre günceller', async () => {
  registerSelectionSearch();
  const installed = vi.mocked(browser.runtime.onInstalled.addListener).mock.calls[0]![0];
  installed({ reason: 'install' } as Parameters<typeof installed>[0]);
  await vi.waitFor(() => expect(browser.contextMenus.create).toHaveBeenCalledWith({ id: selectionMenuId, title: 'Moviemarks’ta ara', contexts: ['selection'] }));
  const changed = vi.mocked(browser.storage.onChanged.addListener).mock.calls[0]![0];
  changed({ language: { newValue: 'en' } }, 'local');
  expect(browser.contextMenus.update).toHaveBeenCalledWith(selectionMenuId, { title: 'Search in Moviemarks' });
  expect(selectionMenuTitle('tr')).toBe('Moviemarks’ta ara');
  const clicked = vi.mocked(browser.contextMenus.onClicked.addListener).mock.calls[0]![0];
  clicked({ menuItemId: 'other', selectionText: 'Ignore' } as Parameters<typeof clicked>[0]);
  expect(browser.action.openPopup).not.toHaveBeenCalled();
  clicked({ menuItemId: selectionMenuId, selectionText: 'O' } as Parameters<typeof clicked>[0], { id: 5 } as Parameters<typeof clicked>[1]);
  await vi.waitFor(() => expect(browser.action.openPopup).toHaveBeenCalled());
});

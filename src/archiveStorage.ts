import { browser } from 'wxt/browser';
import { validateArchive } from './archive';

export async function readArchive() {
  const data = await browser.storage.local.get(['library', 'collections']);
  return validateArchive({ library: data.library ?? [], collections: data.collections ?? [] });
}

import { browser } from 'wxt/browser';
import type { Media } from './tmdb';
import type { Collection } from './collections';

export async function loadCollections(): Promise<Collection[]> {
  const result = await browser.storage.local.get('collections');
  return (result.collections as Collection[] | undefined) ?? [];
}
export async function saveCollections(collections: Collection[]) {
  await browser.storage.local.set({ collections });
}
export async function saveLibraryAndCollections(library: Media[], collections: Collection[]) {
  await browser.storage.local.set({ library, collections });
}

export async function loadLibrary(): Promise<Media[]> {
  const result = await browser.storage.local.get('library');
  return (result.library as Media[] | undefined) ?? [];
}
export async function saveLibrary(library: Media[]) {
  await browser.storage.local.set({ library });
}
export async function loadToken(): Promise<string> {
  const result = await browser.storage.local.get('tmdbToken');
  return (result.tmdbToken as string | undefined) ?? '';
}
export async function saveToken(tmdbToken: string) {
  await browser.storage.local.set({ tmdbToken });
}

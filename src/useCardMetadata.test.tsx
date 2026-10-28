// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { browser } from 'wxt/browser';
import { getFilterMetadata, type Media } from './tmdb';
import useCardMetadata from './useCardMetadata';
vi.mock('wxt/browser', () => ({ browser: { storage: { local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) } } } }));
vi.mock('./tmdb', async original => ({ ...await original<typeof import('./tmdb')>(), getFilterMetadata: vi.fn() }));
const movie: Media = { id: 1, media_type: 'movie', title: 'Film', year: '', poster_path: null, overview: '', vote_average: 0 };
function View({ items = [movie] }: { items?: Media[] }) {
  const get = useCardMetadata(items, 'token');
  return <div>{items.map(item => <span key={item.id}>{JSON.stringify(get(item))}</span>)}</div>;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.mocked(browser.storage.local.get).mockImplementation(async () => ({})); });
it('eski kaydın süre bilgisini otomatik getirir, arşivi değiştirmeden önbelleğe yazar', async () => {
  vi.mocked(getFilterMetadata).mockResolvedValue({ runtime: 169, seasonCount: null, genres: [], releaseDate: '' });
  render(<View/>);
  await screen.findByText('{"runtime":169,"seasonCount":null}');
  await waitFor(() => expect(browser.storage.local.set).toHaveBeenCalledWith({ cardMetadata: { 'movie:1': expect.objectContaining({ runtime: 169 }) } }));
  expect(vi.mocked(browser.storage.local.set).mock.calls.every(([value]) => !('library' in value))).toBe(true);
});
it('taze önbelleği ve kayıttaki mevcut bilgiyi tekrar istek yapmadan gösterir', async () => {
  vi.mocked(browser.storage.local.get).mockImplementation(async () => ({ cardMetadata: { 'movie:1': { runtime: 120, seasonCount: null, fetchedAt: Date.now() } } }));
  render(<View items={[movie, { ...movie, id: 2, media_type: 'tv', seasonCount: 5 }]}/>);
  await screen.findByText('{"runtime":120,"seasonCount":null}');
  expect(screen.getByText('{"seasonCount":5}')).toBeTruthy();
  expect(getFilterMetadata).not.toHaveBeenCalled();
});
it('ekran kapatılınca isteği iptal eder ve geç gelen sonucu önbelleğe yazmaz', async () => {
  let finish!: (value: Awaited<ReturnType<typeof getFilterMetadata>>) => void;
  vi.mocked(getFilterMetadata).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<View/>);
  await waitFor(() => expect(getFilterMetadata).toHaveBeenCalledOnce());
  const signal = vi.mocked(getFilterMetadata).mock.calls[0]![2];
  view.unmount();
  expect(signal.aborted).toBe(true);
  finish({ runtime: 100, seasonCount: null, genres: [], releaseDate: '' });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(browser.storage.local.set).not.toHaveBeenCalled();
});

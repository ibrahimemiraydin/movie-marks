import { afterEach, expect, it, vi } from 'vitest';
import { loadLibrary, saveLibrary, loadCollections, saveCollections, saveLibraryAndCollections } from './storage';
import { getWatchStatus } from './watchStatus';
import type { Media } from './tmdb';
import { applyEpisodeAction, type SeriesCatalog } from './episodes';
const { data } = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('wxt/browser', () => ({ browser: { storage: { local: {
  get: async (key: string) => structuredClone({ [key]: data[key] }),
  set: async (values: Record<string, unknown>) => Object.assign(data, structuredClone(values)),
} } } }));
afterEach(() => { for (const key of Object.keys(data)) delete data[key]; });
it('ilk ve tekrar izleme turu ilerlemeleri yeniden yüklemede ayrı korunur', async () => {
  const catalog: SeriesCatalog = { id: 1, status: 'Returning Series', fetchedAt: '', seasons: [{ number: 1, name: '', expected: 1, loaded: true, episodes: [{ id: 1, season: 1, number: 1, name: '', overview: '', still: null, runtime: null, airDate: '2020-01-01' }] }] };
  let item = { id: 1, media_type: 'tv', notes: 'Not', favorite: true } as Media;
  item = applyEpisodeAction(item, catalog, { type: 'episode', key: '1:1', watched: true });
  item = applyEpisodeAction(item, catalog, { type: 'newRun' });
  await saveLibrary([item]);
  const reloaded = (await loadLibrary())[0]!;
  expect(reloaded.episodeTracking!.runs[0]!.watched).toHaveProperty('1:1');
  expect(reloaded.episodeTracking!.runs[1]!.watched).toEqual({});
  expect(reloaded.notes).toBe('Not'); expect(reloaded.favorite).toBe(true);
});
it('koleksiyonlar yeniden yüklenir ve eski profilde boş başlar', async () => {
  expect(await loadCollections()).toEqual([]);
  const groups = [{ id: 'c', name: 'Bilim Kurgu', createdAt: '2024-01-01', mediaKeys: ['movie:1'] }];
  data.tmdbToken = 'keep';
  await saveCollections(groups);
  expect(await loadCollections()).toEqual(groups);
  const item = { id: 1, media_type: 'movie', notes: 'Özel not', favorite: true } as Media;
  await saveLibraryAndCollections([item], groups);
  expect((await loadLibrary())[0]).toMatchObject({ notes: 'Özel not', favorite: true });
  expect(await loadCollections()).toEqual(groups);
  expect(data.tmdbToken).toBe('keep');
});
it('durum yeniden yüklemede korunur ve diğer kayıtlar/token değişmez', async () => {
  data.tmdbToken = 'keep-token';
  data.library = [
    { id: 1, media_type: 'movie', title: 'Eski kayıt', favorite: true, personalRating: 9, notes: 'Özel not', watchedOn: '2024-03-12', rewatches: [{ id: 'r', date: '2024-04-01' }], addedAt: '2024-01-01T10:00:00Z', genres: ['Dram'], releaseDate: '2020-01-01' },
    { id: 2, media_type: 'tv', title: 'Dizi', watchStatus: 'paused' },
  ];
  const items = await loadLibrary();
  expect(getWatchStatus(items[0]!)).toBe('planned');
  await saveLibrary(items.map(m => m.id === 1 ? { ...m, watchStatus: 'completed' } : m) as Media[]);
  const reloaded = await loadLibrary();
  expect(getWatchStatus(reloaded[0]!)).toBe('completed');
  expect(getWatchStatus(reloaded[1]!)).toBe('paused');
  expect(reloaded[0]!.title).toBe('Eski kayıt');
  expect(reloaded[0]).toMatchObject({ favorite: true, personalRating: 9, notes: 'Özel not', watchedOn: '2024-03-12' });
  expect(reloaded[0]).toMatchObject({ rewatches: [{ id: 'r', date: '2024-04-01' }], addedAt: '2024-01-01T10:00:00Z', genres: ['Dram'], releaseDate: '2020-01-01' });
  expect(data.tmdbToken).toBe('keep-token');
});

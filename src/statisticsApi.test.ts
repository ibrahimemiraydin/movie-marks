import { afterEach, expect, it, vi } from 'vitest';
import { emptyStatsMetadata, enrichStatsMetadata, needsStatsMetadata, readStatsMetadata, StatsRequestError } from './statisticsApi';
import type { Media } from './tmdb';

const { data } = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('wxt/browser', () => ({ browser: { storage: { local: {
  get: async (keys: string[]) => Object.fromEntries(keys.map(key => [key, structuredClone(data[key])])),
  set: async (values: Record<string, unknown>) => { Object.assign(data, structuredClone(values)); },
} } } }));
afterEach(() => { vi.unstubAllGlobals(); for (const key of Object.keys(data)) delete data[key]; });
const movie: Media = { id: 1, media_type: 'movie', title: 'Film', year: '', poster_path: null, overview: '', vote_average: 0 };
const respond = (value: unknown) => ({ ok: true, json: async () => value });
it('film süresi ve kimlikli kadroyu alır; anahtarı URLye veya önbelleğe koymaz', async () => {
  const mock = vi.fn().mockResolvedValue(respond({ runtime: 120, genres: [{ name: 'Dram' }], credits: { cast: [{ id: 1, name: 'Oyuncu' }], crew: [{ id: 2, name: 'Yönetmen', job: 'Director' }, { id: 3, name: 'Yazar', job: 'Writer' }] } }));
  vi.stubGlobal('fetch', mock);
  const result = await enrichStatsMetadata(movie, emptyStatsMetadata(movie), 'secret-token', new AbortController().signal);
  expect(result).toMatchObject({ runtime: 120, directors: [{ id: 2, name: 'Yönetmen', profile: null }] });
  expect(String(mock.mock.calls[0]![0])).not.toContain('secret-token');
  expect(mock.mock.calls[0]![1].headers.Authorization).toBe('Bearer secret-token');
  expect(JSON.stringify(data)).not.toContain('secret-token');
});
it('yalnızca izleme kaydı olan sezonları yükler; ortalama bölüm süresini gerçek süre yerine koymaz', async () => {
  const item = { ...movie, media_type: 'tv' as const, episodeTracking: { activeRunId: 'first', includeSpecials: false, spoilerProtection: true, runs: [{ id: 'first', name: '', startedAt: '', watched: { '1:1': '2024-01-01', '3:1': '2024-01-02' } }] } };
  const mock = vi.fn().mockImplementation(async (url: URL) => url.pathname.includes('/season/') ? respond({ episodes: [{ episode_number: 1, runtime: null, crew: [{ id: 4, name: 'Bölüm yönetmeni', job: 'Director' }, { id: 5, name: 'Yazar', job: 'Writer' }] }] }) : respond({ episode_run_time: [60], credits: { crew: [{ id: 2, name: 'Yaratıcı', job: 'Director' }] } }));
  vi.stubGlobal('fetch', mock);
  const result = await enrichStatsMetadata(item, emptyStatsMetadata(item), 'token', new AbortController().signal);
  expect(mock.mock.calls).toHaveLength(3);
  expect(mock.mock.calls.map(call => call[0].pathname)).toEqual(['/3/tv/1', '/3/tv/1/season/1', '/3/tv/1/season/3']);
  expect(result.episodeRuntimes).toEqual({ '1:1': null, '3:1': null }); expect(result.directors).toEqual([]);
  expect(result.episodeDirectors?.['1:1']).toEqual([{ id: 4, name: 'Bölüm yönetmeni', profile: null }]);
  expect(needsStatsMetadata(item, result)).toBe(false);
});
it('mevcut bölüm önbelleğinin sürelerini kullanır; film/dizi kimliklerini ayırır', async () => {
  data['tvCatalog:1'] = { seasons: [{ number: 1, loaded: true, episodes: [{ season: 1, number: 1, runtime: 45 }] }] };
  expect((await readStatsMetadata({ ...movie, media_type: 'tv' })).episodeRuntimes).toEqual({ '1:1': 45 });
  expect((await readStatsMetadata(movie)).episodeRuntimes).toEqual({});
});
it('sezon isteği hata verse de başarılı kök bilgilerini korur; yeni bölümde sadece eksik sezonu yükler', async () => {
  const item = { ...movie, media_type: 'tv' as const, episodeTracking: { activeRunId: 'first', includeSpecials: false, spoilerProtection: true, runs: [{ id: 'first', name: '', startedAt: '', watched: { '1:1': '2024-01-01' } }] } };
  const mock = vi.fn().mockResolvedValueOnce(respond({ credits: { cast: [{ id: 5, name: 'Oyuncu' }] } })).mockResolvedValueOnce({ ok: false, status: 429 });
  vi.stubGlobal('fetch', mock);
  await expect(enrichStatsMetadata(item, emptyStatsMetadata(item), 'token', new AbortController().signal)).rejects.toBeInstanceOf(StatsRequestError);
  const cached = await readStatsMetadata(item); expect(cached.cast[0]?.id).toBe(5);
  mock.mockReset().mockResolvedValue(respond({ episodes: [{ episode_number: 1, runtime: 47 }] }));
  const updated = await enrichStatsMetadata(item, cached, 'token', new AbortController().signal);
  expect(mock.mock.calls).toHaveLength(1); expect(updated.episodeRuntimes['1:1']).toBe(47);
});
it('iptal edilen istek sonucu önbelleğe yazılmaz', async () => {
  const controller = new AbortController(); controller.abort();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({ runtime: 120 })));
  await expect(enrichStatsMetadata(movie, emptyStatsMetadata(movie), 'token', controller.signal)).rejects.toThrow();
  expect(data).toEqual({});
});

import { setLanguage } from './i18n';
import { afterEach, expect, it, vi } from 'vitest';
import { fetchSeriesCatalog, loadSeriesCatalog } from './tvApi';
const { data } = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('wxt/browser', () => ({ browser: { storage: { local: {
  get: async (key: string) => ({ [key]: data[key] }),
  set: async (values: Record<string, unknown>) => { Object.assign(data, values); },
} } } }));
afterEach(() => { setLanguage('tr'); vi.unstubAllGlobals(); for (const key of Object.keys(data)) delete data[key]; });
function respond(value: unknown) { return { ok: true, json: async () => value }; }
it('TMDB dizi ve sezon uçlarından bölüm detaylarını alır; anahtarı URLye yazmaz', async () => {
  const mock = vi.fn().mockImplementation(async (url: string) => url.includes('/season/') ? respond({ episodes: [{ id: 9, episode_number: 1, name: 'Pilot', overview: 'Konu', air_date: '2020-01-01', still_path: '/a.jpg', runtime: 42 }] }) : respond({ status: 'Returning Series', seasons: [{ season_number: 1, name: 'Sezon 1', episode_count: 1 }], next_episode_to_air: { id: 10, season_number: 1, episode_number: 2, air_date: '2999-01-01' } }));
  vi.stubGlobal('fetch', mock);
  const signal = new AbortController().signal;
  const result = await fetchSeriesCatalog(1, 'secret-token', signal);
  expect(result.seasons[0]!.episodes[0]).toMatchObject({ name: 'Pilot', overview: 'Konu', still: '/a.jpg', runtime: 42, airDate: '2020-01-01' });
  expect(result.nextEpisode?.number).toBe(2);
  expect(mock.mock.calls[1]![0]).toContain('/tv/1/season/1?language=tr-TR');
  expect(mock.mock.calls[0]![0]).not.toContain('secret-token');
  expect(mock.mock.calls[0]![1]).toMatchObject({ signal, headers: { Authorization: 'Bearer secret-token' } });
});
it('sezon hatasını kısmi veri olarak işaretler, tüm dizi tamamlandı sayılmasını engeller', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => url.includes('/season/') ? { ok: false, status: 429 } : respond({ status: 'Ended', seasons: [{ season_number: 1, episode_count: 10 }] })));
  const result = await fetchSeriesCatalog(1, 'token', new AbortController().signal);
  expect(result.seasons[0]).toMatchObject({ loaded: false, expected: 10 });
});
it('önbellek kullanır; yenileme hatasında eski veriyi uyarıyla korur', async () => {
  data['tvCatalog:1'] = { id: 1, status: 'Ended', seasons: [], fetchedAt: new Date().toISOString() };
  const mock = vi.fn().mockRejectedValue(new TypeError('offline'));
  vi.stubGlobal('fetch', mock);
  expect((await loadSeriesCatalog(1, 'token', new AbortController().signal)).id).toBe(1);
  expect(mock).not.toHaveBeenCalled();
  const stale = await loadSeriesCatalog(1, 'token', new AbortController().signal, true);
  expect(stale.warning).toContain('kayıtlı');
  expect(data['tvCatalog:1']).not.toHaveProperty('warning');
});
it('iptal edilen yükleme kayda yazılmaz', async () => {
  const controller = new AbortController(); controller.abort();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted','AbortError')));
  await expect(loadSeriesCatalog(1, 'token', controller.signal, true)).rejects.toThrow();
  expect(data['tvCatalog:1']).toBeUndefined();
});

it('İngilizce bölüm verisini Türkçe önbelleğinden ayırır', async () => {
  data['tvCatalog:1'] = { id: 1, status: 'Ended', seasons: [], fetchedAt: new Date().toISOString() };
  const mock = vi.fn().mockResolvedValue(respond({ status: 'Ended', seasons: [] }));
  vi.stubGlobal('fetch', mock);
  setLanguage('en');
  await loadSeriesCatalog(1, 'token', new AbortController().signal);
  expect(mock.mock.calls[0]![0]).toContain('language=en-US');
  expect(data['tvCatalog:en:1']).toBeTruthy();
  expect(data['tvCatalog:1']).toBeTruthy();
  mock.mockClear();
  setLanguage('tr');
  await loadSeriesCatalog(1, 'token', new AbortController().signal);
  expect(mock).not.toHaveBeenCalled();
});

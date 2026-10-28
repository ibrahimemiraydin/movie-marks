import { describe, expect, it, vi, afterEach } from 'vitest';
import { mediaKey, normalizeResults, searchMedia, searchAll, personCredits, getMediaDetails } from './tmdb';

afterEach(() => vi.unstubAllGlobals());
describe('TMDB sonuçları', () => {
  it.each(['movie', 'tv'] as const)('%s detayında doğru adres ve alanları kullanır', async type => {
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1, title: 'Film', name: 'Dizi', runtime: 120, episode_run_time: [45], number_of_seasons: 3, number_of_episodes: 24, genres: [{ name: 'Dram' }], credits: { crew: [{ name: 'Yönetmen', job: 'Director' }], cast: [{ id: 5, name: 'Oyuncu' }] }, created_by: [{ name: 'Yaratıcı' }] }) });
    vi.stubGlobal('fetch', mock);
    const result = await getMediaDetails({ id: 1, media_type: type, title: 'Kayıt', year: '', poster_path: null, vote_average: 0, overview: '' }, 'token', new AbortController().signal);
    expect(mock.mock.calls[0]![0].pathname).toBe(`/3/${type}/1`);
    expect(mock.mock.calls[0]![0].searchParams.get('append_to_response')).toBe('credits');
    expect(result.runtime).toBe(type === 'movie' ? 120 : 45);
    expect(result.creators).toEqual([type === 'movie' ? 'Yönetmen' : 'Yaratıcı']);
    expect(result.genres).toEqual(['Dram']);
  });
  it('oyuncuları film ve dizilerden ayrı döndürür', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [
      { id: 31, media_type: 'person', name: 'Tom Hanks', known_for_department: 'Acting' },
      { id: 32, media_type: 'person', name: 'Director', known_for_department: 'Directing' },
      { id: 1, media_type: 'movie', title: 'Film' },
    ] }) }));
    const result = await searchAll('Tom', 'token', new AbortController().signal);
    expect(result.people).toEqual([{ id: 31, name: 'Tom Hanks', profile_path: null }]);
    expect(result.media).toHaveLength(1);
  });
  it('oyuncunun yalnızca rollerini alır, yinelenen yapımları tekilleştirir', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cast: [
      { id: 2, media_type: 'tv', name: 'Dizi', popularity: 5 },
      { id: 2, media_type: 'tv', name: 'Dizi', popularity: 5 },
      { id: 2, media_type: 'movie', title: 'Film', popularity: 10 },
      { id: 3, media_type: 'movie', title: 'Adult', adult: true },
    ], crew: [{ id: 4, media_type: 'movie', title: 'Crew only' }] }) });
    vi.stubGlobal('fetch', mock);
    const signal = new AbortController().signal;
    const result = await personCredits(31, 'token', signal);
    expect(result.map(mediaKey)).toEqual(['movie:2', 'tv:2']);
    expect(mock.mock.calls[0]![0].pathname).toBe('/3/person/31/combined_credits');
    expect(mock.mock.calls[0]![1].signal).toBe(signal);
  });
  it('kişileri dışarıda bırakır ve film/dizi alanlarını birleştirir', () => {
    const items = normalizeResults([
      { id: 1, media_type: 'person', name: 'Actor' },
      { id: 2, media_type: 'tv', name: 'Dizi', first_air_date: '2024-03-01' },
      { id: 2, media_type: 'movie', title: 'Film', release_date: '2020-01-01' },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: 'Dizi', year: '2024', poster_path: null });
    expect(mediaKey(items[0]!)).not.toBe(mediaKey(items[1]!));
  });
  it('anahtarı URL yerine yetkilendirme başlığında taşır', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    await searchMedia('Dune & films', 'private-token', signal);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url.searchParams.get('query')).toBe('Dune & films');
    expect(url.toString()).not.toContain('private-token');
    expect(options.headers.Authorization).toBe('Bearer private-token');
    expect(options.signal).toBe(signal);
  });
  it('geçersiz anahtarı anlaşılır bir hataya dönüştürür', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(searchMedia('test', 'bad', new AbortController().signal)).rejects.toThrow('geçersiz');
  });
});

import { setLanguage } from './i18n';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { mediaKey, normalizeResults, searchMedia, searchAll, personCredits, getMediaDetails, getFilterMetadata } from './tmdb';

afterEach(() => { setLanguage('tr'); vi.unstubAllGlobals(); });
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
  it('oyuncu, yönetmen ve yaratıcıları film ve dizilerden ayrı döndürür', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [
      { id: 31, media_type: 'person', name: 'Tom Hanks', known_for_department: 'Acting' },
      { id: 32, media_type: 'person', name: 'Director', known_for_department: 'Directing' },
      { id: 33, media_type: 'person', name: 'Creator', known_for_department: 'Writing' },
      { id: 34, media_type: 'person', name: 'Producer', known_for_department: 'Production' },
      { id: 35, media_type: 'person', name: 'Unknown department' },
      { id: 1, media_type: 'movie', title: 'Film' },
    ] }) }));
    const result = await searchAll('Tom', 'token', new AbortController().signal);
    expect(result.people.map(person => person.id)).toEqual([31, 32, 33, 34, 35]);
    expect(result.people[0]).toEqual({ id: 31, name: 'Tom Hanks', profile_path: null, department: 'Acting' });
    expect(result.media).toHaveLength(1);
  });
  it('oyunculuk ve ekip yapımlarını birleştirip film/dizi kimliğine göre tekilleştirir', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cast: [
      { id: 2, media_type: 'tv', name: 'Dizi', popularity: 5 },
      { id: 2, media_type: 'tv', name: 'Dizi', popularity: 5 },
      { id: 2, media_type: 'movie', title: 'Film', popularity: 10 },
      { id: 3, media_type: 'movie', title: 'Adult', adult: true },
    ], crew: [
      { id: 4, media_type: 'movie', title: 'Directed movie', job: 'Director', popularity: 20 },
      { id: 5, media_type: 'tv', name: 'Created series', job: 'Creator', popularity: 15 },
      { id: 2, media_type: 'movie', title: 'Film', job: 'Writer', popularity: 10 },
      { id: 2, media_type: 'movie', title: 'Film', job: 'Director', popularity: 10 },
      { id: 6, media_type: 'movie', title: 'Adult crew', adult: true, popularity: 100 },
    ] }) });
    vi.stubGlobal('fetch', mock);
    const signal = new AbortController().signal;
    const result = await personCredits(31, 'token', signal);
    expect(result.map(mediaKey)).toEqual(['movie:4', 'tv:5', 'movie:2', 'tv:2']);
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

it('arama ve detay isteklerini seçilen dilde gönderir', async () => {
  const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [], id: 1 }) });
  vi.stubGlobal('fetch', mock);
  setLanguage('en');
  await searchAll('Dexter', 'token', new AbortController().signal);
  await getMediaDetails({ id: 1, media_type: 'tv', title: 'Dexter', year: '', poster_path: null, vote_average: 0, overview: '' }, 'token', new AbortController().signal);
  expect(mock.mock.calls.every(call => call[0].searchParams.get('language') === 'en-US')).toBe(true);
});

it('dil değişse de kalıcı tür filtreleri için aynı isimleri kullanır', async () => {
  const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ genres: [{ name: 'Dram' }], release_date: '2024-01-01' }) });
  vi.stubGlobal('fetch', mock);
  setLanguage('en');
  const metadata = await getFilterMetadata({ id: 1, media_type: 'movie', title: 'Title', year: '', poster_path: null, vote_average: 0, overview: '' }, 'token', new AbortController().signal);
  expect(mock.mock.calls[0]![0].searchParams.get('language')).toBe('tr-TR');
  expect(metadata.genres).toEqual(['Dram']);
});

it('kart metadata alanlarında film süresini ve dizi sezon sayısını ayırır', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ runtime: 169, number_of_seasons: 4 }) }));
  const media = { id: 1, title: 'Title', year: '', poster_path: null, vote_average: 0, overview: '' };
  expect(await getFilterMetadata({ ...media, media_type: 'movie' }, 'token', new AbortController().signal)).toMatchObject({ runtime: 169, seasonCount: null });
  expect(await getFilterMetadata({ ...media, media_type: 'tv' }, 'token', new AbortController().signal)).toMatchObject({ runtime: null, seasonCount: 4 });
});

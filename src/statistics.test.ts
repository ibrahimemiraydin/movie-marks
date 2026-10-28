import { afterEach, expect, it, vi } from 'vitest';
import { buildStatistics, formatWatchTime, watchDate, watchEvents, type StatsMetadataMap } from './statistics';
import type { Media } from './tmdb';

afterEach(() => vi.useRealTimers());
const movie: Media = { id: 1, media_type: 'movie', title: 'Film', year: '', poster_path: null, overview: '', vote_average: 0, watchStatus: 'completed', watchedOn: '2024-01-01', personalRating: 9, rewatches: [{ id: 'a', date: '2024-01-03' }, { id: 'b', date: '2025-02-01' }] };
const series: Media = { ...movie, id: 3, media_type: 'tv', title: 'Dizi', watchedOn: undefined, rewatches: [], episodeTracking: { activeRunId: 'second', includeSpecials: false, spoilerProtection: true, runs: [
  { id: 'first', name: 'İlk izleme', startedAt: '', watched: { '1:1': '2024-01-01T12:00:00Z', '1:2': '2024-01-02T12:00:00Z', '0:1': '2024-01-02T12:00:00Z' } },
  { id: 'second', name: '2. izleme', startedAt: '', watched: { '1:1': '2025-03-02T12:00:00Z' } },
] } };
const library = [movie, { ...movie, id: 2, watchedOn: undefined, rewatches: [], genres: ['Bilim Kurgu'] }, series, { ...series, id: 4, watchedOn: '2024-12-01', episodeTracking: undefined, rewatches: [{ id: 'c', date: '2025-01-02' }] }, { ...movie, id: 5, watchStatus: 'planned' as const, watchedOn: undefined, rewatches: [], personalRating: 10 }];
const metadata: StatsMetadataMap = {
  'movie:1': { runtime: 120, genres: ['Bilim Kurgu'], cast: [{ id: 1, name: 'Oyuncu', profile: null }, { id: 1, name: 'Oyuncu', profile: null }], directors: [{ id: 2, name: 'Yönetmen', profile: null }], episodeRuntimes: {}, loadedSeasons: [] },
  'tv:3': { runtime: null, genres: ['Dram'], cast: [{ id: 1, name: 'Oyuncu', profile: null }], directors: [{ id: 99, name: 'Dizi yaratıcısı', profile: null }], episodeRuntimes: { '1:1': 40, '1:2': 50, '0:1': 10 }, loadedSeasons: [0, 1] },
};

it('yapım sayılarını tekilleştirir; tüm turların bölüm ve sürelerini toplar', () => {
  const stats = buildStatistics(library, metadata, 2024);
  expect(stats.overall).toMatchObject({ movies: 2, series: 2, movieWatches: 4, episodes: 4, minutes: 500, missingRuntime: 1, undated: 1 });
  expect(stats.overall.actors[0]?.count).toBe(2);
  expect(stats.overall.directors).toEqual([expect.objectContaining({ id: '2', count: 1 })]);
  expect(stats.overall.genres[0]).toMatchObject({ name: 'Bilim Kurgu', count: 2 });
});
it('yıllık/aylık sayıları gerçek izleme tarihinden ayırır; tarihsiz kayıtları atamaz', () => {
  const stats = buildStatistics(library, metadata, 2024);
  expect(stats.annual).toMatchObject({ movieWatches: 2, episodes: 3, minutes: 340, movies: 1, series: 2 });
  expect(stats.months[0]).toMatchObject({ movieWatches: 2, episodes: 3 });
  expect(stats.activeDays).toBe(4); expect(stats.longestStreak).toBe(3); expect(stats.busiestMonth?.month).toBe(1);
  expect(buildStatistics(library, metadata, 2025).annual).toMatchObject({ movieWatches: 1, episodes: 1, minutes: 160 });
});
it('elle tamamlanan diziler veya tarihli dizi tekrarları için bölüm/süre uydurmaz', () => {
  const stats = buildStatistics([library[3]!], metadata, 2024);
  expect(stats.overall).toMatchObject({ series: 1, episodes: 0, minutes: 0, missingRuntime: 0 });
  expect(stats.events).toHaveLength(2);
});
it('silinen tur artık hesaba katılmaz; özel bölüm geçmişi tercih kapansa da korunur', () => {
  const firstOnly = { ...series, episodeTracking: { ...series.episodeTracking!, runs: [series.episodeTracking!.runs[0]!] } };
  expect(buildStatistics([firstOnly], metadata, 2024).overall).toMatchObject({ episodes: 3, minutes: 100 });
});
it('kişisel puanları TMDB puanından ayırır ve aynı yapımı yinelenen kütüphane satırıyla çoğaltmaz', () => {
  expect(buildStatistics(library, metadata, 2024).highestRated[0]?.id).toBe(5);
  expect(watchEvents([movie, movie], metadata)).toHaveLength(3);
});
it('geçersiz ve gelecek tarihleri rapor yılına atamaz; süre birimlerini doğru taşır', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  expect(watchDate('2024-02-30')).toBeNull(); expect(watchDate('2999-01-01')).toBeNull(); expect(watchDate('broken')).toBeNull();
  expect(watchDate('2024-02-29')).toBe('2024-02-29');
  expect(formatWatchTime(119.9, 'en')).toBe('2 h 0 min');
});

it('dizi yönetmenlerini yalnızca izlenmiş bölümlerin kredilerinden sayar', () => {
  const data = { ...metadata, 'tv:3': { ...metadata['tv:3']!, episodeDirectors: {
    '1:1': [{ id: 10, name: 'Bölüm yönetmeni', profile: null }],
    '1:9': [{ id: 11, name: 'İzlenmeyen bölüm yönetmeni', profile: null }],
  } } };
  expect(buildStatistics([series], data, 2024).overall.directors).toEqual([expect.objectContaining({ id: '10', count: 1 })]);
});

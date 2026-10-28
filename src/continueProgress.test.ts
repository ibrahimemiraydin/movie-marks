import { expect, it } from 'vitest';
import { continueCandidates, continueProgress } from './continueProgress';
import { defaultTracking, type EpisodeTracking, type SeriesCatalog } from './episodes';
import type { Media } from './tmdb';

const item: Media = { id: 1, media_type: 'tv', title: 'Dizi', year: '', poster_path: null, vote_average: 0, overview: '' };
const tracking = (): EpisodeTracking => ({ ...defaultTracking(), runs: [{ id: 'first', name: 'İlk izleme', startedAt: '2020-01-01', watched: { '1:2': '2024-01-01' } }] });
const catalog: SeriesCatalog = { id: 1, status: 'Returning Series', fetchedAt: '', seasons: [
  { number: 1, name: 'Sezon 1', expected: 2, loaded: true, episodes: [1, 2].map(number => ({ id: number, season: 1, number, name: '', overview: '', still: null, runtime: null, airDate: '2020-01-01' })) },
  { number: 2, name: 'Sezon 2', expected: 1, loaded: true, episodes: [{ id: 3, season: 2, number: 1, name: '', overview: '', still: null, runtime: null, airDate: '2999-01-01' }] },
] };

it('izlenen bölümlü dizileri ve izleniyor filmlerini seçer, geçmiş turları karıştırmaz', () => {
  const previousRun = tracking();
  previousRun.runs.push({ id: 'second', name: '2. izleme', startedAt: '2025-01-01', watched: {} });
  previousRun.activeRunId = 'second';
  const candidates = continueCandidates([
    { ...item, id: 1, watchStatus: 'paused', episodeTracking: tracking() },
    { ...item, id: 2, media_type: 'movie', watchStatus: 'watching' },
    { ...item, id: 3, watchStatus: 'planned' },
    { ...item, id: 4, episodeTracking: previousRun },
    { ...item, id: 5, media_type: 'movie', watchStatus: 'completed' },
  ]);
  expect(candidates.map(item => item.id)).toEqual([1, 2]);
});
it('özel bölüm takibi kapalıysa yalnızca özel bölüm işaretleriyle aday oluşturmaz', () => {
  const episodeTracking = defaultTracking(); episodeTracking.runs[0]!.watched['0:1'] = '2024-01-01';
  expect(continueCandidates([{ ...item, episodeTracking }])).toEqual([]);
  episodeTracking.includeSpecials = true;
  expect(continueCandidates([{ ...item, episodeTracking }])).toHaveLength(1);
});
it('boşlukları atlamaz; sıradaki bölümün sezon ilerlemesini hesaplar', () => {
  const progress = continueProgress({ ...item, episodeTracking: tracking() }, catalog);
  expect(progress.next?.number).toBe(1);
  expect(progress.season?.number).toBe(1);
  expect(progress.seasonWatched).toBe(1);
  expect(progress.seasonTotal).toBe(2);
  expect(progress.seasonPercent).toBe(50);
  expect(progress.total).toBe(3);
});
it('sezon geçişinde yaklaşan sezonu seçer ve yayımlanmamış bölümü sıradaki saymaz', () => {
  const episodeTracking = tracking(); episodeTracking.runs[0]!.watched['1:1'] = '2024-02-01';
  const progress = continueProgress({ ...item, episodeTracking }, catalog);
  expect(progress.next).toBeUndefined();
  expect(progress.upcoming[0]?.season).toBe(2);
  expect(progress.season?.number).toBe(2);
  expect(progress.seasonPercent).toBe(0);
});

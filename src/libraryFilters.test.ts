import { expect, it } from 'vitest';
import { emptyFilters, filterAndSort } from './libraryFilters';
import type { Media } from './tmdb';
const media = (id: number, patch: Partial<Media>): Media => ({ id, media_type: 'movie', title: `Film ${id}`, year: '2020', poster_path: null, vote_average: 7, overview: '', ...patch });
const items = [
  media(1, { title: 'Zaman', genres: ['Dram'], releaseDate: '2020-01-01', addedAt: '2024-01-02', personalRating: 8, watchedOn: '2024-02-01', watchStatus: 'completed' }),
  media(2, { title: 'Aralık', genres: ['Komedi'], year: '2022', releaseDate: '2022-02-01', addedAt: '2024-01-01', personalRating: 5, watchedOn: '2024-01-01', rewatches: [{ id: 'r', date: '2024-03-01' }] }),
  media(3, { title: 'Eksik', year: '', vote_average: 0 }),
];
it('tür, yıl, puan, durum ve tarih filtreleri birlikte çalışır', () => {
  const result = filterAndSort(items, { ...emptyFilters, genre: 'Dram', yearFrom: '2019', yearTo: '2021', ratingSource: 'personal', ratingMin: '7', ratingMax: '9', releaseFrom: '2020-01-01', releaseTo: '2020-12-31' }, 'nameAsc', 'zaman', 'movie', 'completed');
  expect(result.map(m => m.id)).toEqual([1]);
  expect(filterAndSort(items, { ...emptyFilters, yearFrom: '2023', yearTo: '2020' }, 'nameAsc')).toEqual([]);
});
it('isim, eklenme, puan ve son izlenme sıralaması iki yönlü çalışır', () => {
  const ids = (sort: Parameters<typeof filterAndSort>[2]) => filterAndSort(items, { ...emptyFilters, ratingSource: 'personal' }, sort).map(m => m.id);
  expect(ids('nameAsc')).toEqual([2, 3, 1]);
  expect(ids('nameDesc')).toEqual([1, 3, 2]);
  expect(ids('addedDesc')).toEqual([1, 2, 3]);
  expect(ids('addedAsc')).toEqual([2, 1, 3]);
  expect(ids('ratingDesc')).toEqual([1, 2, 3]);
  expect(ids('ratingAsc')).toEqual([2, 1, 3]);
  expect(ids('watchedDesc')).toEqual([2, 1, 3]);
  expect(ids('watchedAsc')).toEqual([1, 2, 3]);
  expect(items.map(m => m.id)).toEqual([1, 2, 3]);
});
it('puanı ve tarihi bilinmeyen yapımlar etkin filtreye dahil edilmez', () => {
  expect(filterAndSort(items, { ...emptyFilters, ratingMin: '0' }, 'nameAsc').map(m => m.id)).not.toContain(3);
  expect(filterAndSort(items, { ...emptyFilters, releaseFrom: '1900-01-01' }, 'nameAsc').map(m => m.id)).not.toContain(3);
});

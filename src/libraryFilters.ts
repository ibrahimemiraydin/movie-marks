import { locale } from './i18n';
import type { Media } from './tmdb';
import { getWatchStatus, type WatchStatus } from './watchStatus';
import { lastWatched } from './personal';
export type LibraryFilters = {
  genre: string; yearFrom: string; yearTo: string; ratingSource: 'tmdb' | 'personal';
  ratingMin: string; ratingMax: string; releaseFrom: string; releaseTo: string;
};
export const emptyFilters: LibraryFilters = { genre: '', yearFrom: '', yearTo: '', ratingSource: 'tmdb', ratingMin: '', ratingMax: '', releaseFrom: '', releaseTo: '' };
export const sortOptions = { addedDesc: 'Eklenme · Yeni önce', addedAsc: 'Eklenme · Eski önce', nameAsc: 'İsim · A–Z', nameDesc: 'İsim · Z–A', ratingDesc: 'Puan · Yüksek önce', ratingAsc: 'Puan · Düşük önce', watchedDesc: 'İzlenme · Yeni önce', watchedAsc: 'İzlenme · Eski önce' } as const;
export type SortOrder = keyof typeof sortOptions;
export function filterAndSort(source: Media[], filters: LibraryFilters, sort: SortOrder, query = '', type = 'all', status: WatchStatus | 'all' = 'all') {
  const rating = (m: Media) => filters.ratingSource === 'personal' ? m.personalRating ?? null : m.vote_average > 0 ? m.vote_average : null;
  const items = source.filter(m => {
    if (type !== 'all' && m.media_type !== type || status !== 'all' && getWatchStatus(m) !== status) return false;
    if (!m.title.toLocaleLowerCase(locale()).includes(query.trim().toLocaleLowerCase(locale()))) return false;
    if (filters.genre && !m.genres?.includes(filters.genre)) return false;
    if ((filters.yearFrom || filters.yearTo) && (!m.year || filters.yearFrom && Number(m.year) < Number(filters.yearFrom) || filters.yearTo && Number(m.year) > Number(filters.yearTo))) return false;
    const score = rating(m);
    if ((filters.ratingMin || filters.ratingMax) && (score === null || filters.ratingMin && score < Number(filters.ratingMin) || filters.ratingMax && score > Number(filters.ratingMax))) return false;
    if ((filters.releaseFrom || filters.releaseTo) && (!m.releaseDate || filters.releaseFrom && m.releaseDate < filters.releaseFrom || filters.releaseTo && m.releaseDate > filters.releaseTo)) return false;
    return true;
  });
  const originalIndex = new Map(source.map((m, i) => [m, i]));
  return items.sort((a, b) => {
    let left: string | number | null, right: string | number | null;
    if (sort.startsWith('name')) { left = a.title; right = b.title; }
    else if (sort.startsWith('rating')) { left = rating(a); right = rating(b); }
    else if (sort.startsWith('watched')) { left = lastWatched(a) || null; right = lastWatched(b) || null; }
    else { left = a.addedAt || null; right = b.addedAt || null; }
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    if (left === null && right === null) return originalIndex.get(a)! - originalIndex.get(b)!;
    const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), locale());
    return (sort.endsWith('Desc') ? -result : result) || originalIndex.get(a)! - originalIndex.get(b)!;
  });
}

import { expect, it } from 'vitest';
import { activeRun, applyEpisodeAction, defaultTracking, episodeProgress, type Episode, type SeriesCatalog } from './episodes';
import type { Media } from './tmdb';
import { todayLocal } from './personal';
export const ep = (season: number, number: number, airDate = '2020-01-01'): Episode => ({ id: season * 100 + number, season, number, name: `Bölüm ${number}`, overview: 'Spoiler metni', still: '/still.jpg', runtime: 45, airDate });
export const catalog: SeriesCatalog = { id: 1, status: 'Ended', fetchedAt: '2024-01-01', seasons: [
  { number: 0, name: 'Özel', loaded: true, expected: 1, episodes: [ep(0,1)] },
  { number: 1, name: 'Sezon 1', loaded: true, expected: 2, episodes: [ep(1,1), ep(1,2)] },
  { number: 2, name: 'Sezon 2', loaded: true, expected: 1, episodes: [ep(2,1)] },
] };
const item: Media = { id: 1, media_type: 'tv', title: 'Dizi', year: '', poster_path: null, vote_average: 0, overview: '', notes: 'Korunacak', favorite: true };
it('yanlışlıkla eklenen tur silinince önceki turun ilerlemesi ve tamamlanması geri gelir', () => {
  let next = applyEpisodeAction(item, catalog, { type: 'season', season: 1, watched: true });
  next = applyEpisodeAction(next, catalog, { type: 'season', season: 2, watched: true });
  const original = structuredClone(next.episodeTracking!.runs[0]!);
  next = applyEpisodeAction(next, catalog, { type: 'newRun' });
  const id = next.episodeTracking!.activeRunId;
  next = applyEpisodeAction(next, catalog, { type: 'deleteRun', id });
  expect(next.episodeTracking!.activeRunId).toBe('first');
  expect(next.episodeTracking!.runs).toEqual([original]);
  expect(next.watchStatus).toBe('completed');
  expect(next.notes).toBe('Korunacak'); expect(next.favorite).toBe(true);
  expect(() => applyEpisodeAction(next, catalog, { type: 'deleteRun', id: 'first' })).toThrow('İlk izleme');
  expect(() => applyEpisodeAction(next, catalog, { type: 'deleteRun', id: 'missing' })).toThrow('bulunamadı');
});
it('aktif olmayan tur silme diğer turları değiştirmez ve sonraki tur adı çakışmaz', () => {
  let next = applyEpisodeAction(item, catalog, { type: 'newRun' });
  const second = next.episodeTracking!.activeRunId;
  next = applyEpisodeAction(next, catalog, { type: 'newRun' });
  const third = next.episodeTracking!.activeRunId;
  next = applyEpisodeAction(next, catalog, { type: 'episode', key: '1:1', watched: true });
  next = applyEpisodeAction(next, catalog, { type: 'deleteRun', id: second });
  expect(next.episodeTracking!.activeRunId).toBe(third);
  expect(activeRun(next.episodeTracking!).watched).toHaveProperty('1:1');
  next = applyEpisodeAction(next, catalog, { type: 'newRun' });
  expect(activeRun(next.episodeTracking!).name).toBe('4. izleme');
});
it('varsayılan olarak özel bölümleri dışlar; boşlukları sıradaki bölüm seçer', () => {
  let next = applyEpisodeAction(item, catalog, { type: 'episode', key: '1:2', watched: true });
  let progress = episodeProgress(catalog, next.episodeTracking!);
  expect(progress.total).toBe(3); expect(progress.count).toBe(1); expect(progress.next?.number).toBe(1);
  expect(progress.last?.number).toBe(2);
  next = applyEpisodeAction(next, catalog, { type: 'episode', key: '1:1', watched: true });
  expect(episodeProgress(catalog, next.episodeTracking!).next?.season).toBe(2);
  next = applyEpisodeAction(next, catalog, { type: 'specials', value: true });
  expect(episodeProgress(catalog, next.episodeTracking!).total).toBe(4);
  expect(episodeProgress(catalog, next.episodeTracking!).next?.season).toBe(0);
});
it('bitmiş diziyi tamamlar; işaret kaldırınca geri açar ve kişisel alanları korur', () => {
  let next = applyEpisodeAction(item, catalog, { type: 'season', season: 1, watched: true });
  next = applyEpisodeAction(next, catalog, { type: 'season', season: 2, watched: true });
  expect(next.watchStatus).toBe('completed'); expect(next.watchedOn).toBe(todayLocal());
  expect(episodeProgress(catalog, next.episodeTracking!).percent).toBe(100);
  expect(next.notes).toBe('Korunacak'); expect(next.favorite).toBe(true);
  next = applyEpisodeAction(next, catalog, { type: 'episode', key: '1:2', watched: false });
  expect(next.watchStatus).toBe('watching');
  expect(activeRun(next.episodeTracking!).completedAt).toBeUndefined();
});
it('devam eden diziyi tüm bölümleri izlense de yayın tamamlandı saymaz', () => {
  const ongoing = { ...catalog, status: 'Returning Series' };
  let next = applyEpisodeAction(item, ongoing, { type: 'season', season: 1, watched: true });
  next = applyEpisodeAction(next, ongoing, { type: 'season', season: 2, watched: true });
  expect(next.watchStatus).toBe('watching'); expect(episodeProgress(ongoing, next.episodeTracking!).complete).toBe(true);
});
it('yeni izleme turu önceki ilerlemeyi silmez, tur seçimi önceki kaydı geri getirir', () => {
  let next = applyEpisodeAction(item, catalog, { type: 'episode', key: '1:1', watched: true });
  next = applyEpisodeAction(next, catalog, { type: 'newRun' });
  expect(next.episodeTracking!.runs).toHaveLength(2); expect(activeRun(next.episodeTracking!).watched).toEqual({});
  next = applyEpisodeAction(next, catalog, { type: 'episode', key: '1:2', watched: true });
  next = applyEpisodeAction(next, catalog, { type: 'selectRun', id: 'first' });
  expect(activeRun(next.episodeTracking!).watched).toHaveProperty('1:1');
  expect(activeRun(next.episodeTracking!).watched).not.toHaveProperty('1:2');
});
it('gelecek bölümleri engeller; toplu işaretleme sadece yayımlananları seçer', () => {
  const future: SeriesCatalog = { ...catalog, seasons: [{ number: 1, name: '', loaded: true, expected: 3, episodes: [ep(1,1), ep(1,2,'2999-01-01'), ep(1,3,'')] }] };
  expect(() => applyEpisodeAction(item, future, { type: 'episode', key: '1:2', watched: true })).toThrow('yayımlanmamış');
  const next = applyEpisodeAction(item, future, { type: 'season', season: 1, watched: true });
  expect(Object.keys(activeRun(next.episodeTracking!).watched)).toEqual(['1:1']);
  expect(episodeProgress(future, next.episodeTracking!).upcoming[0]?.number).toBe(2);
});
it('eksik sezon tamamlanmayı engeller; eski Tamamlandı kaydı bölüm işaretlerine dönüşmez', () => {
  const partial = { ...catalog, seasons: [...catalog.seasons, { number: 3, name: '', expected: 10, episodes: [], loaded: false }] };
  const progress = episodeProgress(partial, defaultTracking());
  expect(progress.incomplete).toBe(true); expect(progress.total).toBe(13); expect(progress.complete).toBe(false);
  const old = applyEpisodeAction({ ...item, watchStatus: 'completed' }, catalog, { type: 'spoilers', value: false });
  expect(activeRun(old.episodeTracking!).watched).toEqual({}); expect(old.watchStatus).toBe('completed');
});
it('yeni bölüm eklenince yüzde ve sıradaki bölüm güncellenir; ilk tur verisi değişmez', () => {
  let item: Media = { id: 1, media_type: 'tv' } as Media;
  item = applyEpisodeAction(item, catalog, { type: 'season', season: 1, watched: true });
  item = applyEpisodeAction(item, catalog, { type: 'season', season: 2, watched: true });
  const expanded: SeriesCatalog = { ...catalog, seasons: [...catalog.seasons, { number: 3, name: 'Yeni sezon', expected: 1, loaded: true, episodes: [ep(3,1)] }] };
  const progress = episodeProgress(expanded, item.episodeTracking!);
  expect(progress.percent).toBe(75); expect(progress.next?.season).toBe(3);
  expect(Object.keys(activeRun(item.episodeTracking!).watched)).toHaveLength(3);
});

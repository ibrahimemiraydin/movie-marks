import { expect, it } from 'vitest';
import { completedUpdate, validatePersonal, todayLocal, lastWatched } from './personal';
import type { Media } from './tmdb';
it('Tamamlandı geçişinde bugünü kaydeder, diğer geçişlerde tarihi ve geçmişi korur', () => {
  const old = { watchStatus: 'watching', watchedOn: '2020-01-01', notes: 'Not', rewatches: [{ id: 'r', date: '2023-01-01' }] } as Media;
  const completed = completedUpdate(old, 'completed');
  expect(completed.watchedOn).toBe(todayLocal());
  expect(completed.rewatches).toEqual(old.rewatches);
  expect(completed.notes).toBe('Not');
  expect(completedUpdate(old, 'paused').watchedOn).toBe('2020-01-01');
  expect(completedUpdate({ ...old, watchStatus: 'completed' }, 'completed').watchedOn).toBe('2020-01-01');
  expect(lastWatched(old)).toBe('2023-01-01');
  expect(validatePersonal({ rewatches: [{ id: 'r', date: '2999-01-01' }] })).not.toBeNull();
});
it('puan aralığını ve gerçek izleme tarihini doğrular', () => {
  for (const rating of [0, 11, 5.5, NaN]) expect(validatePersonal({ personalRating: rating })).not.toBeNull();
  expect(validatePersonal({ personalRating: 10, watchedOn: todayLocal() })).toBeNull();
  expect(validatePersonal({ watchedOn: '2024-02-30' })).not.toBeNull();
  expect(validatePersonal({ watchedOn: '2999-01-01' })).not.toBeNull();
  expect(validatePersonal({ notes: 'a'.repeat(5001) })).not.toBeNull();
  expect(validatePersonal({ personalRating: null, notes: '', watchedOn: '' })).toBeNull();
});

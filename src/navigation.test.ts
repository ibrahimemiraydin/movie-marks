import { expect, it } from 'vitest';
import { sectionFromHash } from './navigation';

it.each([
  ['#library', 'library'], ['#favorites', 'favorites'], ['#collections', 'collections'],
  ['#calendar', 'calendar'], ['#statistics', 'statistics'], ['', 'library'],
  ['#__proto__', 'library'], ['#unknown', 'library'],
])('bölüm bağlantısını güvenli çözer: %s', (hash, expected) => {
  expect(sectionFromHash(hash)).toBe(expected);
});

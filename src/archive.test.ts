import { expect, it, vi } from 'vitest';
import { archiveCsv, makeBackup, parseBackup, validateArchive, MAX_BACKUP_BYTES } from './archive';
import { readBackupFile } from './archiveFiles';
import type { Media } from './tmdb';

const movie: Media = { id: 5, media_type: 'movie', title: 'Türkçe film', year: '2024', poster_path: '/a.jpg', overview: 'Konu', vote_average: 8.1, favorite: true, notes: 'Virgül, "tırnak"\nİkinci satır', personalRating: 9, watchStatus: 'completed', addedAt: '2024-01-01T10:00:00.000Z', watchedOn: '2024-01-02', genres: ['Dram'], releaseDate: '2024-01-01', rewatches: [{ id: 'rewatch', date: '2024-02-01' }] };
const series: Media = { ...movie, media_type: 'tv', episodeTracking: { activeRunId: 'second', includeSpecials: true, spoilerProtection: false, runs: [
  { id: 'first', name: 'İlk izleme', startedAt: '2024-01-01T10:00:00Z', watched: { '0:1': '2024-01-02T10:00:00Z', '1:1': '2024-01-02T11:00:00Z' }, completedAt: '2024-01-02T11:00:00Z' },
  { id: 'second', name: '2. izleme', startedAt: '2024-02-01T10:00:00Z', watched: { '1:1': '2024-02-01T10:00:00Z' } },
] } };
const archive = { library: [movie, series], collections: [{ id: 'c', name: 'Sevdiklerim', createdAt: '2024-01-01T10:00:00Z', mediaKeys: ['movie:5', 'tv:5'] }] };

it('JSON tüm kişisel alanları, turları ve koleksiyonları kayıpsız geri yükler; gizli ayarları dışarıda bırakır', () => {
  const backup = makeBackup({ ...archive, tmdbToken: 'secret-token', theme: 'dark' } as typeof archive);
  const restored = parseBackup(JSON.stringify({ ...backup, tmdbToken: 'ignored', malicious: { library: [] } }));
  expect(restored.library).toEqual(archive.library); expect(restored.collections).toEqual(archive.collections);
  expect(JSON.stringify(backup)).not.toContain('secret-token'); expect(restored).not.toHaveProperty('tmdbToken');
});
it('boş arşivi ve eski kayıtlardaki eksik TMDB alanlarını destekler', () => {
  expect(parseBackup(JSON.stringify(makeBackup({ library: [], collections: [] }))).library).toEqual([]);
  expect(validateArchive({ library: [{ id: 1, title: 'Eski kayıt', media_type: 'movie' }], collections: [] }).library[0]).toMatchObject({ year: '', poster_path: null, overview: '', vote_average: 0 });
});
it.each([
  (data: ReturnType<typeof makeBackup>) => { data.library.push(data.library[0]!); },
  (data: ReturnType<typeof makeBackup>) => { data.collections[0]!.mediaKeys.push('movie:999'); },
  (data: ReturnType<typeof makeBackup>) => { data.library[1]!.episodeTracking!.activeRunId = 'missing'; },
  (data: ReturnType<typeof makeBackup>) => { data.library[0]!.personalRating = 11; },
  (data: ReturnType<typeof makeBackup>) => { data.library[0]!.watchedOn = '2024-02-30'; },
  (data: ReturnType<typeof makeBackup>) => { data.library[1]!.episodeTracking!.runs[0]!.watched['constructor'] = '2024-01-01T10:00:00Z'; },
])('bozuk veya çelişkili yedeğin tamamını reddeder', change => {
  const data = makeBackup(structuredClone(archive)); change(data);
  expect(() => parseBackup(JSON.stringify(data))).toThrow('geçersiz');
});
it('yanlış JSON ve desteklenmeyen sürümü reddeder', () => {
  expect(() => parseBackup('{broken')).toThrow('JSON');
  expect(() => parseBackup(JSON.stringify({ ...makeBackup(archive), version: 2 }))).toThrow('sürümü');
});
it('büyük dosyayı okumadan reddeder', async () => {
  const text = vi.fn();
  await expect(readBackupFile({ size: MAX_BACKUP_BYTES + 1, text } as unknown as File)).rejects.toThrow('20 MB');
  expect(text).not.toHaveBeenCalled();
});
it('CSV Türkçe, tırnak, satır sonu ve tablo formüllerini güvenli biçimde aktarır', () => {
  const csv = archiveCsv({ ...archive, library: [{ ...movie, title: '=HYPERLINK("bad")' }, series] });
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  expect(csv).toContain('"Virgül, ""tırnak""\nİkinci satır"');
  expect(csv).toContain('"Sevdiklerim"'); expect(csv).toContain('"Türkçe film"');
  expect(csv).toContain('"3","1","2. izleme"');
});

it('kart süre/sezon bilgilerini yedekte korur, geçersiz sezon sayısını reddeder', () => {
  const restored = parseBackup(JSON.stringify(makeBackup({ library: [{ ...movie, runtime: 169, seasonCount: null }, { ...series, runtime: null, seasonCount: 3 }], collections: [] })));
  expect(restored.library[0]).toMatchObject({ runtime: 169, seasonCount: null });
  expect(restored.library[1]).toMatchObject({ runtime: null, seasonCount: 3 });
  expect(() => validateArchive({ library: [{ ...movie, seasonCount: 1.5 }], collections: [] })).toThrow();
});

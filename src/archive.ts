import { mediaKey, type Media } from './tmdb';
import type { Collection } from './collections';
import type { EpisodeTracking } from './episodes';
import { watchStatuses } from './watchStatus';
import { runName, t } from './i18n';

export type Archive = { library: Media[]; collections: Collection[] };
export type Backup = Archive & { format: 'moviemarks'; version: 1; exportedAt: string };
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const invalid = () => { throw new Error('Yedek dosyasının içeriği geçersiz. Arşivin değiştirilmedi.'); };
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
const list = (value: unknown, max = 10000): unknown[] => Array.isArray(value) && value.length <= max ? value : invalid();
const text = (value: unknown, max: number, nonempty = false): string => typeof value === 'string' && value.length <= max && (!nonempty || !!value.trim()) ? value : invalid();
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
function day(value: unknown, empty = true): string {
  const date = text(value, 10);
  if (empty && date === '') return date;
  const parsed = new Date(`${date}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.getFullYear() === Number(date.slice(0, 4)) && parsed.getMonth() + 1 === Number(date.slice(5, 7)) && parsed.getDate() === Number(date.slice(8, 10)) ? date : invalid();
}
function timestamp(value: unknown, empty = false): string {
  const date = text(value, 40);
  if (empty && !date) return date;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(date) || !Number.isFinite(Date.parse(date))) return invalid();
  day(date.slice(0, 10), false); return date;
}
function unique<T>(items: T[], key: (item: T) => string): T[] {
  const keys = items.map(key);
  return new Set(keys).size === keys.length ? items : invalid();
}
function tracking(value: unknown): EpisodeTracking {
  const data = record(value);
  const runs = unique(list(data.runs, 1000).map(value => {
    const run = record(value), watched = record(run.watched);
    const entries = Object.entries(watched);
    if (entries.length > 100000) return invalid();
    const cleaned = Object.fromEntries(entries.map(([key, date]) => {
      if (!/^\d{1,4}:[1-9]\d{0,5}$/.test(key)) return invalid();
      return [key, timestamp(date)];
    }));
    return { id: text(run.id, 128, true), name: text(run.name, 80, true), startedAt: timestamp(run.startedAt), watched: cleaned, ...(run.completedAt !== undefined ? { completedAt: timestamp(run.completedAt) } : {}) };
  }), run => run.id);
  const activeRunId = text(data.activeRunId, 128, true);
  if (!runs.length || !runs.some(run => run.id === activeRunId)) return invalid();
  return { activeRunId, includeSpecials: bool(data.includeSpecials), spoilerProtection: bool(data.spoilerProtection), runs };
}
function media(value: unknown): Media {
  const data = record(value);
  if (!Number.isSafeInteger(data.id) || Number(data.id) <= 0 || !['movie', 'tv'].includes(String(data.media_type))) return invalid();
  const year = text(data.year ?? '', 4);
  if (year && !/^\d{4}$/.test(year)) return invalid();
  const poster = data.poster_path == null ? null : text(data.poster_path, 2048);
  if (poster && !poster.startsWith('/')) return invalid();
  const vote = data.vote_average ?? 0;
  if (typeof vote !== 'number' || !Number.isFinite(vote) || vote < 0 || vote > 10) return invalid();
  const result: Media = { id: data.id as number, media_type: data.media_type as Media['media_type'], title: text(data.title, 1000, true), year, poster_path: poster, vote_average: vote, overview: text(data.overview ?? '', 100000) };
  if (data.watchStatus !== undefined) { if (typeof data.watchStatus !== 'string' || !Object.hasOwn(watchStatuses, data.watchStatus)) return invalid(); result.watchStatus = data.watchStatus as Media['watchStatus']; }
  if (data.favorite !== undefined) result.favorite = bool(data.favorite);
  if (data.personalRating !== undefined) {
    if (data.personalRating !== null && (!Number.isInteger(data.personalRating) || Number(data.personalRating) < 1 || Number(data.personalRating) > 10)) return invalid();
    result.personalRating = data.personalRating as number | null;
  }
  if (data.notes !== undefined) result.notes = text(data.notes, 5000);
  if (data.addedAt !== undefined) result.addedAt = timestamp(data.addedAt, true);
  if (data.watchedOn !== undefined) result.watchedOn = day(data.watchedOn);
  for (const key of ['runtime', 'seasonCount'] as const) {
    if (data[key] !== undefined) {
      const value = data[key];
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || key === 'seasonCount' && !Number.isInteger(value))) return invalid();
      result[key] = value as number | null;
    }
  }
  if (data.releaseDate !== undefined) result.releaseDate = day(data.releaseDate);
  if (data.genres !== undefined) result.genres = list(data.genres, 100).map(genre => text(genre, 100, true));
  if (data.rewatches !== undefined) result.rewatches = unique(list(data.rewatches).map(value => { const entry = record(value); return { id: text(entry.id, 128, true), date: day(entry.date, false) }; }), entry => entry.id);
  if (data.episodeTracking !== undefined) { if (result.media_type !== 'tv') return invalid(); result.episodeTracking = tracking(data.episodeTracking); }
  return result;
}
/** Construct new whitelisted objects; imported settings, tokens and unknown keys are never stored. */
export function validateArchive(value: unknown): Archive {
  const data = record(value);
  const library = unique(list(data.library).map(media), mediaKey);
  const keys = new Set(library.map(mediaKey));
  const collections = unique(list(data.collections).map(value => {
    const entry = record(value);
    const mediaKeys = unique(list(entry.mediaKeys).map(value => text(value, 40, true)), key => key);
    if (mediaKeys.some(key => !keys.has(key))) return invalid();
    return { id: text(entry.id, 128, true), name: text(entry.name, 80, true), createdAt: timestamp(entry.createdAt ?? '', true), mediaKeys };
  }), entry => entry.id);
  unique(collections, entry => entry.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR'));
  return { library, collections };
}
export function makeBackup(archive: Archive): Backup {
  return { format: 'moviemarks', version: 1, exportedAt: new Date().toISOString(), ...validateArchive(archive) };
}
export function parseBackup(source: string): Backup {
  if (new TextEncoder().encode(source).byteLength > MAX_BACKUP_BYTES) throw new Error('Yedek dosyası en fazla 20 MB olabilir.');
  let value: unknown;
  try { value = JSON.parse(source.replace(/^\uFEFF/, '')); } catch { throw new Error('JSON dosyası okunamadı. Geçerli bir Moviemarks yedeği seç.'); }
  const data = record(value);
  if (data.format !== 'moviemarks') return invalid();
  if (data.version !== 1) throw new Error('Bu yedek sürümü desteklenmiyor. Uzantıyı güncelleyerek tekrar dene.');
  return { format: 'moviemarks', version: 1, exportedAt: timestamp(data.exportedAt), ...validateArchive(data) };
}
const csvCell = (value: string | number) => {
  const text = String(value);
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};
export function archiveCsv(archive: Archive): string {
  const headers = ['TMDB ID', 'İçerik tipi', 'Ad', 'Yıl', 'TMDB puanı', 'İzleme durumu', 'Favori', 'Kişisel puanım', 'Notlarım', 'İzleme tarihi', 'Eklenme tarihi', 'Yeniden izleme sayısı', 'Yeniden izleme tarihleri', 'İzlenen bölüm', 'Aktif turdaki izlenen bölüm', 'İzleme turu', 'Koleksiyonlar'];
  const rows: (string | number)[][] = [headers.map(header => t(header))];
  for (const item of archive.library) {
    const runs = item.episodeTracking?.runs ?? [], active = runs.find(run => run.id === item.episodeTracking?.activeRunId) ?? runs[0];
    rows.push([item.id, t(item.media_type === 'movie' ? 'Film' : 'Dizi'), item.title, item.year, item.vote_average, t(watchStatuses[item.watchStatus ?? 'planned']), t(item.favorite ? 'Evet' : 'Hayır'), item.personalRating ?? '', item.notes ?? '', item.watchedOn ?? '', item.addedAt ?? '', item.rewatches?.length ?? 0, (item.rewatches ?? []).map(entry => entry.date).join('; '), runs.reduce((sum, run) => sum + Object.values(run.watched).filter(Boolean).length, 0), active ? Object.values(active.watched).filter(Boolean).length : 0, active ? runName(active.name) : '', archive.collections.filter(group => group.mediaKeys.includes(mediaKey(item))).map(group => group.name).join('; ')]);
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

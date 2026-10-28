import type { Media } from './tmdb';
export type PersonalData = Pick<Media, 'favorite' | 'personalRating' | 'notes' | 'watchedOn' | 'rewatches'>;
export function todayLocal(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validatePersonal(data: PersonalData): string | null {
  if (data.rewatches?.some(r => !r.id || !r.date || validatePersonal({ watchedOn: r.date }))) return 'Yeniden izleme için geçerli bir tarih seç.';
  if (data.personalRating != null && (!Number.isInteger(data.personalRating) || data.personalRating < 1 || data.personalRating > 10)) return 'Puan 1 ile 10 arasında olmalı.';
  if ((data.notes?.length ?? 0) > 5000) return 'Not en fazla 5000 karakter olabilir.';
  if (data.watchedOn) {
    const date = new Date(`${data.watchedOn}T12:00:00`);
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(data.watchedOn) && !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === data.watchedOn;
    if (!valid || data.watchedOn > todayLocal()) return 'Geçerli, bugün veya daha önceki bir tarih seç.';
  }
  return null;
}

export function completedUpdate(item: Media, watchStatus: Media['watchStatus']): Media {
  return { ...item, watchStatus, ...(watchStatus === 'completed' && item.watchStatus !== 'completed' ? { watchedOn: todayLocal() } : {}) };
}
export function lastWatched(item: Media) {
  return [item.watchedOn ?? '', ...(item.rewatches ?? []).map(r => r.date), ...(item.episodeTracking?.runs ?? []).flatMap(r => Object.values(r.watched).map(timestamp => todayLocal(new Date(timestamp))))].sort().at(-1) ?? '';
}

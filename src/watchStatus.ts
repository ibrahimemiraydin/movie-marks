import type { Media } from './tmdb';

export const watchStatuses = {
  planned: 'İzlenecek',
  watching: 'İzleniyor',
  completed: 'Tamamlandı',
  paused: 'Ara verildi',
  dropped: 'Bırakıldı',
} as const;
export type WatchStatus = keyof typeof watchStatuses;
export function getWatchStatus(item: Pick<Media, 'watchStatus'>): WatchStatus {
  return item.watchStatus && Object.hasOwn(watchStatuses, item.watchStatus) ? item.watchStatus : 'planned';
}

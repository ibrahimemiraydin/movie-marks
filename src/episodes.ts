import type { Media } from './tmdb';
import { todayLocal } from './personal';
export type Episode = { id: number; season: number; number: number; name: string; overview: string; still: string | null; runtime: number | null; airDate: string };
export type Season = { number: number; name: string; expected: number; episodes: Episode[]; loaded: boolean };
export type SeriesCatalog = { id: number; status: string; seasons: Season[]; fetchedAt: string; warning?: string; nextEpisode?: Episode };
export type WatchRun = { id: string; name: string; startedAt: string; watched: Record<string, string>; completedAt?: string };
export type EpisodeTracking = { activeRunId: string; includeSpecials: boolean; spoilerProtection: boolean; runs: WatchRun[] };
export type EpisodeAction =
  | { type: 'episode'; key: string; watched: boolean }
  | { type: 'season'; season: number; watched: boolean }
  | { type: 'specials'; value: boolean } | { type: 'spoilers'; value: boolean }
  | { type: 'newRun' } | { type: 'selectRun'; id: string } | { type: 'deleteRun'; id: string };
export const episodeKey = (e: Episode) => `${e.season}:${e.number}`;
export const episodeLabel = (e: Episode) => `S${String(e.season).padStart(2, '0')} B${String(e.number).padStart(2, '0')}`;
export const defaultTracking = (): EpisodeTracking => ({ activeRunId: 'first', includeSpecials: false, spoilerProtection: true, runs: [{ id: 'first', name: 'İlk izleme', startedAt: new Date().toISOString(), watched: {} }] });
export const activeRun = (tracking: EpisodeTracking) => tracking.runs.find(r => r.id === tracking.activeRunId) ?? tracking.runs[0]!;
export const isAired = (e: Episode, today = todayLocal()) => !!e.airDate && e.airDate <= today;
export function episodeProgress(catalog: SeriesCatalog, tracking: EpisodeTracking) {
  const seasons = catalog.seasons.filter(s => tracking.includeSpecials || s.number !== 0);
  const episodes = seasons.flatMap(s => s.episodes).sort((a,b) => a.season - b.season || a.number - b.number);
  const watched = activeRun(tracking).watched;
  const total = seasons.reduce((sum, s) => sum + Math.max(s.expected, s.episodes.length), 0);
  const count = episodes.filter(e => !!watched[episodeKey(e)]).length;
  const incomplete = seasons.some(s => !s.loaded || s.expected > s.episodes.length);
  const last = episodes.filter(e => watched[episodeKey(e)]).sort((a,b) => watched[episodeKey(b)]!.localeCompare(watched[episodeKey(a)]!) || b.season - a.season || b.number - a.number)[0];
  const next = episodes.find(e => !watched[episodeKey(e)] && isAired(e));
  const upcoming = episodes.filter(e => e.airDate > todayLocal() && !watched[episodeKey(e)]).sort((a,b) => a.airDate.localeCompare(b.airDate) || a.season - b.season || a.number - b.number);
  const ended = ['Ended', 'Canceled'].includes(catalog.status);
  return { episodes, total, count, percent: total ? Math.round(count / total * 100) : 0, incomplete, last, next, upcoming, ended, complete: !incomplete && total > 0 && count === total };
}
export function applyEpisodeAction(item: Media, catalog: SeriesCatalog, action: EpisodeAction): Media {
  if (item.media_type !== 'tv' || catalog.id !== item.id) throw new Error('Dizi bilgileri eşleşmiyor.');
  const tracking: EpisodeTracking = structuredClone(item.episodeTracking ?? defaultTracking());
  if (action.type === 'specials') tracking.includeSpecials = action.value;
  else if (action.type === 'spoilers') tracking.spoilerProtection = action.value;
  else if (action.type === 'selectRun') {
    if (!tracking.runs.some(r => r.id === action.id)) throw new Error('İzleme turu bulunamadı.');
    tracking.activeRunId = action.id;
  } else if (action.type === 'deleteRun') {
    const index = tracking.runs.findIndex(r => r.id === action.id);
    if (index < 0) throw new Error('İzleme turu bulunamadı.');
    if (index === 0) throw new Error('İlk izleme turu silinemez.');
    tracking.runs.splice(index, 1);
    if (tracking.activeRunId === action.id) {
      const fallback = tracking.runs[index - 1] ?? tracking.runs[0]!;
      tracking.activeRunId = fallback.id;
      const progress = episodeProgress(catalog, tracking);
      return { ...item, episodeTracking: tracking, watchStatus: progress.complete && progress.ended ? 'completed' : progress.count ? 'watching' : 'planned', ...(progress.complete && progress.ended && fallback.completedAt ? { watchedOn: todayLocal(new Date(fallback.completedAt)) } : {}) };
    }
  } else if (action.type === 'newRun') {
    const number = Math.max(1, ...tracking.runs.map(r => Number.parseInt(r.name, 10) || 1)) + 1;
    const run = { id: crypto.randomUUID(), name: `${number}. izleme`, startedAt: new Date().toISOString(), watched: {} };
    tracking.runs.push(run); tracking.activeRunId = run.id;
  } else {
    const run = activeRun(tracking);
    let episodes: Episode[];
    if (action.type === 'episode') {
      const episode = catalog.seasons.flatMap(s => s.episodes).find(e => episodeKey(e) === action.key);
      if (!episode || episode.season === 0 && !tracking.includeSpecials) throw new Error('Bölüm bulunamadı veya özel bölüm takibi kapalı.');
      if (action.watched && episode.airDate > todayLocal()) throw new Error('Henüz yayımlanmamış bölüm işaretlenemez.');
      episodes = [episode];
    } else {
      const season = catalog.seasons.find(s => s.number === action.season);
      if (!season?.loaded || season.number === 0 && !tracking.includeSpecials) throw new Error('Önce sezon bilgilerini yükle.');
      episodes = season.episodes.filter(e => !action.watched || isAired(e));
    }
    for (const episode of episodes) {
      const key = episodeKey(episode);
      if (action.watched) run.watched[key] ??= new Date().toISOString();
      else delete run.watched[key];
    }
    const progress = episodeProgress(catalog, tracking);
    if (progress.complete && progress.ended) {
      const newlyCompleted = !run.completedAt;
      run.completedAt ??= new Date().toISOString();
      return { ...item, episodeTracking: tracking, watchStatus: 'completed', ...(newlyCompleted ? { watchedOn: todayLocal() } : {}) };
    }
    delete run.completedAt;
    return { ...item, episodeTracking: tracking, watchStatus: progress.count ? 'watching' : 'planned' };
  }
  return { ...item, episodeTracking: tracking, ...(action.type === 'newRun' ? { watchStatus: 'watching' as const } : {}) };
}

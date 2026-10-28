import type { Media } from './tmdb';
import { activeRun, defaultTracking, episodeKey, episodeProgress, type SeriesCatalog } from './episodes';

export function continueCandidates(library: Media[]): Media[] {
  const activity = (item: Media) => {
    const tracking = item.episodeTracking;
    const run = tracking && activeRun(tracking);
    return [item.addedAt ?? '', ...(run ? [run.startedAt, ...Object.values(run.watched)] : [])].sort().at(-1) ?? '';
  };
  return library.filter(item => {
    if (item.watchStatus === 'watching') return true;
    if (item.media_type !== 'tv' || !item.episodeTracking) return false;
    const tracking = item.episodeTracking;
    return Object.entries(activeRun(tracking).watched).some(([key, date]) => date && (tracking.includeSpecials || !key.startsWith('0:')));
  }).sort((a, b) => activity(b).localeCompare(activity(a)));
}

export function continueProgress(item: Media, catalog: SeriesCatalog) {
  const tracking = item.episodeTracking ?? defaultTracking();
  const progress = episodeProgress(catalog, tracking);
  const seasons = catalog.seasons.filter(season => tracking.includeSpecials || season.number !== 0);
  // Use the first unwatched aired episode, including gaps, just like the detail tracker.
  const target = progress.next ?? progress.upcoming[0] ?? progress.last;
  const season = seasons.find(season => season.number === target?.season) ?? seasons[0];
  const watched = activeRun(tracking).watched;
  const count = season?.episodes.filter(episode => watched[episodeKey(episode)]).length ?? 0;
  const total = season ? Math.max(season.expected, season.episodes.length) : 0;
  return { ...progress, season, seasonCount: seasons.length, seasonWatched: count, seasonTotal: total, seasonPercent: total ? Math.round(count / total * 100) : 0 };
}

import { mediaKey, type Media } from './tmdb';
import { todayLocal } from './personal';

export type StatsPerson = { id: number; name: string; profile: string | null };
export type StatsMetadata = {
  fetchedAt?: string; runtime: number | null; genres: string[]; cast: StatsPerson[]; directors: StatsPerson[];
  episodeRuntimes: Record<string, number | null>; loadedSeasons: number[]; episodeDirectors?: Record<string, StatsPerson[]>; creditSeasons?: number[];
};
export type StatsMetadataMap = Record<string, StatsMetadata>;
export type WatchEvent = {
  id: string; item: Media; kind: 'movie' | 'episode' | 'series'; date: string | null;
  episodeKey?: string; runName?: string; rewatch: boolean; minutes: number | null;
};
export type Ranked = { id: string; name: string; count: number; profile?: string | null };

export function watchDate(value?: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) return null;
  const day = value.slice(0, 10);
  const parsed = new Date(`${day}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || todayLocal(parsed) !== day) return null;
  const date = value.length === 10 ? day : Number.isNaN(Date.parse(value)) ? null : todayLocal(new Date(value));
  return date && date <= todayLocal() ? date : null;
}
export const validMinutes = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

export function watchEvents(library: Media[], metadata: StatsMetadataMap = {}): WatchEvent[] {
  const events: WatchEvent[] = [];
  const seen = new Set<string>();
  for (const item of library) {
    const key = mediaKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    const base = { item, rewatch: false, minutes: null };
    if (item.media_type === 'movie') {
      if (item.watchStatus === 'completed' || item.watchedOn || item.rewatches?.length) {
        events.push({ ...base, id: `${key}:first`, kind: 'movie', date: watchDate(item.watchedOn), minutes: validMinutes(metadata[key]?.runtime) });
      }
    } else {
      let episodeCount = 0;
      for (const [runIndex, run] of (item.episodeTracking?.runs ?? []).entries()) {
        for (const [episodeKey, timestamp] of Object.entries(run.watched)) {
          if (!/^\d+:\d+$/.test(episodeKey) || !timestamp) continue;
          episodeCount++;
          events.push({ ...base, id: `${key}:${run.id}:${episodeKey}`, kind: 'episode', date: watchDate(timestamp), episodeKey, runName: run.name, rewatch: runIndex > 0, minutes: validMinutes(metadata[key]?.episodeRuntimes[episodeKey]) });
        }
      }
      // A manual series completion is not evidence that individual episodes were watched.
      if (!episodeCount && (item.watchStatus === 'completed' || item.watchedOn || item.rewatches?.length)) {
        events.push({ ...base, id: `${key}:first`, kind: 'series', date: watchDate(item.watchedOn) });
      }
    }
    const rewatches = new Set<string>();
    for (const entry of item.rewatches ?? []) {
      if (rewatches.has(entry.id)) continue;
      rewatches.add(entry.id);
      events.push({ ...base, id: `${key}:rewatch:${entry.id}`, kind: item.media_type === 'movie' ? 'movie' : 'series', date: watchDate(entry.date), rewatch: true, minutes: item.media_type === 'movie' ? validMinutes(metadata[key]?.runtime) : null });
    }
  }
  return events.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.id.localeCompare(b.id));
}

export function watchedEpisodeKeys(item: Media): string[] {
  return [...new Set((item.episodeTracking?.runs ?? []).flatMap(run => Object.entries(run.watched).filter(([key, value]) => /^\d+:\d+$/.test(key) && value).map(([key]) => key)))].sort();
}
export function watchedSeasons(item: Media): number[] {
  return [...new Set(watchedEpisodeKeys(item).map(key => Number(key.split(':')[0])))].sort((a, b) => a - b);
}
const watchedItems = (events: WatchEvent[]) => [...new Map(events.map(event => [mediaKey(event.item), event.item])).values()];
function rank(entries: { id: string; name: string; profile?: string | null }[][]): Ranked[] {
  const rows = new Map<string, Ranked>();
  for (const group of entries) for (const entry of new Map(group.map(entry => [entry.id, entry])).values()) {
    const old = rows.get(entry.id);
    rows.set(entry.id, { ...entry, count: (old?.count ?? 0) + 1 });
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
export function summarizeEvents(events: WatchEvent[], metadata: StatsMetadataMap) {
  const titles = watchedItems(events);
  const timed = events.filter(event => event.kind !== 'series');
  return {
    movies: titles.filter(item => item.media_type === 'movie').length,
    series: titles.filter(item => item.media_type === 'tv').length,
    movieWatches: events.filter(event => event.kind === 'movie').length,
    episodes: events.filter(event => event.kind === 'episode').length,
    minutes: timed.reduce((sum, event) => sum + (event.minutes ?? 0), 0),
    missingRuntime: timed.filter(event => event.minutes === null).length,
    undated: events.filter(event => !event.date).length,
    genres: rank(titles.map(item => (metadata[mediaKey(item)]?.genres.length ? metadata[mediaKey(item)]!.genres : item.genres ?? []).map(name => ({ id: name, name })))),
    actors: rank(titles.map(item => (metadata[mediaKey(item)]?.cast ?? []).map(person => ({ ...person, id: String(person.id) })))),
    directors: rank(titles.map(item => {
      const data = metadata[mediaKey(item)];
      const credits = item.media_type === 'movie' ? data?.directors ?? [] : events.filter(event => mediaKey(event.item) === mediaKey(item) && event.kind === 'episode').flatMap(event => data?.episodeDirectors?.[event.episodeKey!] ?? []);
      return credits.map(person => ({ ...person, id: String(person.id) }));
    })),
  };
}
export function buildStatistics(library: Media[], metadata: StatsMetadataMap, year: number) {
  const events = watchEvents(library, metadata);
  const yearlyEvents = events.filter(event => event.date?.startsWith(`${year}-`));
  const years = [...new Set([year, Number(todayLocal().slice(0, 4)), ...events.flatMap(event => event.date ? [Number(event.date.slice(0, 4))] : [])])].sort((a, b) => b - a);
  const months = Array.from({ length: 12 }, (_, month) => {
    const entries = yearlyEvents.filter(event => Number(event.date!.slice(5, 7)) === month + 1);
    return { month: month + 1, ...summarizeEvents(entries, metadata) };
  });
  const highestRated = library.filter(item => Number.isInteger(item.personalRating) && item.personalRating! >= 1 && item.personalRating! <= 10).sort((a, b) => b.personalRating! - a.personalRating! || a.title.localeCompare(b.title));
  const yearKeys = new Set(yearlyEvents.map(event => mediaKey(event.item)));
  const days = [...new Set(yearlyEvents.flatMap(event => event.date ? [event.date] : []))].sort();
  let streak = 0, longestStreak = 0, last = 0;
  for (const day of days) {
    const time = Date.parse(`${day}T00:00:00Z`);
    streak = time - last === 86400000 ? streak + 1 : 1; last = time; longestStreak = Math.max(longestStreak, streak);
  }
  const busiestMonth = months.filter(month => month.movieWatches + month.episodes > 0).sort((a, b) => b.movieWatches + b.episodes - a.movieWatches - a.episodes || a.month - b.month)[0];
  return { events, overall: summarizeEvents(events, metadata), annual: summarizeEvents(yearlyEvents, metadata), yearlyEvents, years, months, highestRated, yearHighestRated: highestRated.filter(item => yearKeys.has(mediaKey(item))), activeDays: days.length, longestStreak, busiestMonth };
}

export function formatWatchTime(minutes: number, language: string) {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60), rest = total % 60;
  return language === 'en' ? `${hours.toLocaleString('en-US')} h ${rest} min` : `${hours.toLocaleString('tr-TR')} sa ${rest} dk`;
}

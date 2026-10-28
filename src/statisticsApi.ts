import { browser } from 'wxt/browser';
import { mediaKey, type Media } from './tmdb';
import { validMinutes, watchedEpisodeKeys, watchedSeasons, type StatsMetadata, type StatsPerson } from './statistics';
import type { SeriesCatalog } from './episodes';

export const statsMetadataKey = (item: Media) => `statsMetadata:${mediaKey(item)}`;
export function emptyStatsMetadata(item: Media): StatsMetadata {
  return { runtime: null, genres: item.genres ?? [], cast: [], directors: [], episodeRuntimes: {}, loadedSeasons: [], episodeDirectors: {}, creditSeasons: [] };
}
export function mergeCatalogRuntime(metadata: StatsMetadata, catalog?: SeriesCatalog): StatsMetadata {
  const next = { ...metadata, episodeRuntimes: { ...metadata.episodeRuntimes }, loadedSeasons: [...metadata.loadedSeasons] };
  for (const season of catalog?.seasons ?? []) {
    for (const episode of season.episodes) {
      const key = `${episode.season}:${episode.number}`;
      next.episodeRuntimes[key] = validMinutes(episode.runtime) ?? next.episodeRuntimes[key] ?? null;
    }
    if (season.loaded && !next.loadedSeasons.includes(season.number)) next.loadedSeasons.push(season.number);
  }
  return next;
}
export async function readStatsMetadata(item: Media): Promise<StatsMetadata> {
  const key = statsMetadataKey(item);
  const values = await browser.storage.local.get([key, `tvCatalog:${item.id}`, `tvCatalog:en:${item.id}`]);
  let metadata = (values[key] as StatsMetadata | undefined) ?? emptyStatsMetadata(item);
  if (item.media_type === 'tv') {
    metadata = mergeCatalogRuntime(metadata, values[`tvCatalog:${item.id}`] as SeriesCatalog | undefined);
    metadata = mergeCatalogRuntime(metadata, values[`tvCatalog:en:${item.id}`] as SeriesCatalog | undefined);
  }
  return metadata;
}
export function needsStatsMetadata(item: Media, data: StatsMetadata) {
  return !data.fetchedAt || Date.now() - Date.parse(data.fetchedAt) > 7 * 86400000 || Number.isNaN(Date.parse(data.fetchedAt)) || watchedSeasons(item).some(season => !data.loadedSeasons.includes(season) || !data.creditSeasons?.includes(season)) || watchedEpisodeKeys(item).some(key => !Object.hasOwn(data.episodeRuntimes, key));
}
export class StatsRequestError extends Error {
  constructor(public status: number) { super('İstatistik bilgileri güncellenemedi. Kayıtlı bilgiler korunuyor.'); }
}
async function request(path: string, token: string, signal: AbortSignal) {
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  // Genre names remain compatible with the existing Turkish keys; the UI translates labels.
  url.searchParams.set('language', 'tr-TR');
  url.searchParams.set('append_to_response', 'credits');
  const response = await fetch(url, { signal, headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new StatsRequestError(response.status);
  return response.json();
}
const people = (values: { id?: unknown; name?: unknown; profile_path?: unknown }[]): StatsPerson[] => values.filter(person => typeof person.id === 'number' && typeof person.name === 'string').map(person => ({ id: person.id as number, name: person.name as string, profile: typeof person.profile_path === 'string' ? person.profile_path : null }));

export async function enrichStatsMetadata(item: Media, previous: StatsMetadata, token: string, signal: AbortSignal, force = false): Promise<StatsMetadata> {
  let metadata: StatsMetadata = { ...previous, episodeRuntimes: { ...previous.episodeRuntimes }, episodeDirectors: { ...previous.episodeDirectors }, creditSeasons: [...(previous.creditSeasons ?? [])], loadedSeasons: [...previous.loadedSeasons] };
  const persist = async () => {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await browser.storage.local.set({ [statsMetadataKey(item)]: metadata });
  };
  if (force || !metadata.fetchedAt || needsStatsMetadata({ ...item, episodeTracking: undefined }, metadata)) {
    const data = await request(`${item.media_type}/${item.id}`, token, signal);
    metadata = { ...metadata, fetchedAt: new Date().toISOString(), runtime: item.media_type === 'movie' ? validMinutes(data.runtime) : null,
      genres: (data.genres ?? []).flatMap((genre: { name?: unknown }) => typeof genre.name === 'string' ? [genre.name] : []),
      cast: people((data.credits?.cast ?? []).slice(0, 20)),
      directors: item.media_type === 'movie' ? people((data.credits?.crew ?? []).filter((person: { job?: string }) => person.job === 'Director')) : [],
    };
    await persist();
  }
  for (const season of watchedSeasons(item)) {
    if (!force && metadata.loadedSeasons.includes(season) && metadata.creditSeasons?.includes(season) && watchedEpisodeKeys(item).filter(key => Number(key.split(':')[0]) === season).every(key => Object.hasOwn(metadata.episodeRuntimes, key))) continue;
    const data = await request(`tv/${item.id}/season/${season}`, token, signal);
    const runtimes = { ...metadata.episodeRuntimes };
    const episodeDirectors = { ...metadata.episodeDirectors };
    for (const episode of data.episodes ?? []) {
      if (Number.isInteger(episode.episode_number) && episode.episode_number > 0) {
        const key = `${season}:${episode.episode_number}`;
        runtimes[key] = validMinutes(episode.runtime);
        episodeDirectors[key] = people((episode.crew ?? []).filter((person: { job?: string }) => person.job === 'Director'));
      }
    }
    metadata = { ...metadata, episodeRuntimes: runtimes, episodeDirectors, creditSeasons: [...new Set([...(metadata.creditSeasons ?? []), season])], loadedSeasons: [...new Set([...metadata.loadedSeasons, season])] };
    await persist();
  }
  return metadata;
}

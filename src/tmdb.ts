import { locale, t } from './i18n';
import type { WatchStatus } from './watchStatus';
import type { EpisodeTracking } from './episodes';

export type Media = {
  runtime?: number | null;
  seasonCount?: number | null;
  episodeTracking?: EpisodeTracking;
  addedAt?: string;
  releaseDate?: string;
  genres?: string[];
  rewatches?: { id: string; date: string }[];
  favorite?: boolean;
  personalRating?: number | null;
  notes?: string;
  watchedOn?: string;
  watchStatus?: WatchStatus;
  id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  year: string;
  vote_average: number;
  overview: string;
};

export function normalizeResults(results: Record<string, unknown>[]): Media[] {
  return results.filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && typeof r.id === 'number').map(r => ({
    id: r.id as number,
    media_type: r.media_type as Media['media_type'],
    title: String(r.title || r.name || t('İsimsiz')),
    poster_path: typeof r.poster_path === 'string' ? r.poster_path : null,
    year: String(r.release_date || r.first_air_date || '').slice(0, 4),
    vote_average: typeof r.vote_average === 'number' ? r.vote_average : 0,
    overview: typeof r.overview === 'string' ? r.overview : '',
  }));
}

export const mediaKey = (media: Media) => `${media.media_type}:${media.id}`;

export async function getFilterMetadata(media: Media, token: string, signal: AbortSignal) {
  const url = new URL(`https://api.themoviedb.org/3/${media.media_type}/${media.id}`);
  // Keep persisted genre names consistent across interface languages.
  url.searchParams.set('language', 'tr-TR');
  const data = await request(url, token, signal);
  return { runtime: media.media_type === 'movie' && Number.isFinite(data.runtime) && data.runtime > 0 ? data.runtime as number : null, seasonCount: media.media_type === 'tv' && Number.isInteger(data.number_of_seasons) && data.number_of_seasons >= 0 ? data.number_of_seasons as number : null, genres: (data.genres ?? []).map((g: { name: string }) => g.name) as string[], releaseDate: String(data.release_date || data.first_air_date || '') };
}

export type MediaDetails = Media & {
  originalTitle: string; backdrop: string | null; genres: string[];
  date: string; runtime: number | null; status: string;
  seasons: number | null; episodes: number | null;
  creators: string[];
  cast: { id: number; name: string; character: string; profile: string | null }[];
};

export async function getMediaDetails(media: Media, token: string, signal: AbortSignal): Promise<MediaDetails> {
  const url = new URL(`https://api.themoviedb.org/3/${media.media_type}/${media.id}`);
  url.searchParams.set('language', locale());
  url.searchParams.set('append_to_response', 'credits');
  const data = await request(url, token, signal);
  const normalized = normalizeResults([{ ...data, media_type: media.media_type }])[0];
  const crew = (data.credits?.crew ?? []) as { name: string; job: string }[];
  return {
    ...media, ...normalized,
    originalTitle: data.original_title || data.original_name || '',
    backdrop: data.backdrop_path || null,
    genres: (data.genres ?? []).map((g: { name: string }) => g.name),
    date: data.release_date || data.first_air_date || '',
    runtime: media.media_type === 'movie' ? data.runtime || null : data.episode_run_time?.[0] || null,
    status: data.status || '',
    seasons: data.number_of_seasons ?? null, episodes: data.number_of_episodes ?? null,
    creators: media.media_type === 'movie' ? [...new Set(crew.filter(p => p.job === 'Director').map(p => p.name))] : (data.created_by ?? []).map((p: { name: string }) => p.name),
    cast: (data.credits?.cast ?? []).slice(0, 12).map((p: { id: number; name: string; character: string; profile_path: string | null }) => ({ id: p.id, name: p.name, character: p.character || '', profile: p.profile_path || null })),
  };
}

export type Person = { id: number; name: string; profile_path: string | null; department?: string };
export type SearchResults = { media: Media[]; people: Person[] };

async function request(url: URL, token: string, signal: AbortSignal) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('TMDB erişim anahtarı geçersiz. Ayarlardan kontrol et.');
    if (response.status === 429) throw new Error('Çok fazla arama yapıldı. Biraz bekleyip tekrar dene.');
    throw new Error('TMDB şu anda yanıt veremiyor. Tekrar dene.');
  }
  return response.json();
}

export async function searchAll(query: string, token: string, signal: AbortSignal): Promise<SearchResults> {
  const url = new URL('https://api.themoviedb.org/3/search/multi');
  url.searchParams.set('query', query);
  url.searchParams.set('language', locale());
  url.searchParams.set('include_adult', 'false');
  const data = await request(url, token, signal);
  const results: Record<string, unknown>[] = data.results ?? [];
  return {
    media: normalizeResults(results),
    people: results.filter(r => r.media_type === 'person' && typeof r.id === 'number' && r.adult !== true).map(r => ({
      ...(typeof r.known_for_department === 'string' ? { department: r.known_for_department } : {}),
      id: r.id as number, name: String(r.name || t('İsimsiz')), profile_path: typeof r.profile_path === 'string' ? r.profile_path : null,
    })),
  };
}

export async function searchMedia(query: string, token: string, signal: AbortSignal): Promise<Media[]> {
  return (await searchAll(query, token, signal)).media;
}

export async function personCredits(id: number, token: string, signal: AbortSignal): Promise<Media[]> {
  const url = new URL(`https://api.themoviedb.org/3/person/${id}/combined_credits`);
  url.searchParams.set('language', locale());
  const data = await request(url, token, signal);
  const credits = [...(data.cast ?? []), ...(data.crew ?? [])] as Record<string, unknown>[];
  const sorted = credits.filter(r => r.adult !== true).sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));
  return [...new Map(normalizeResults(sorted).map(m => [mediaKey(m), m])).values()];
}

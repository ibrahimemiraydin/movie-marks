import { browser } from 'wxt/browser';
import type { Episode, SeriesCatalog } from './episodes';

async function request(path: string, token: string, signal: AbortSignal) {
  const response = await fetch(`https://api.themoviedb.org/3/${path}?language=tr-TR`, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) throw new Error(response.status === 401 ? 'TMDB anahtarını ayarlardan kontrol et.' : response.status === 429 ? 'TMDB istek sınırına ulaşıldı. Biraz sonra tekrar dene.' : 'Bölüm bilgileri alınamadı. Tekrar dene.');
  return response.json();
}
export async function fetchSeriesCatalog(id: number, token: string, signal: AbortSignal): Promise<SeriesCatalog> {
  const data = await request(`tv/${id}`, token, signal);
  const summaries = (data.seasons ?? []) as { season_number: number; name: string; episode_count: number }[];
  const seasons: SeriesCatalog['seasons'] = summaries.map(s => ({ number: s.season_number, name: s.name || (s.season_number ? `${s.season_number}. sezon` : 'Özel bölümler'), expected: s.episode_count ?? 0, episodes: [], loaded: false }));
  let cursor = 0;
  let stopped = false;
  await Promise.all(Array.from({ length: Math.min(3, seasons.length) }, async () => {
    while (cursor < seasons.length && !signal.aborted && !stopped) {
      const season = seasons[cursor++]!;
      try {
        const detail = await request(`tv/${id}/season/${season.number}`, token, signal);
        season.episodes = (detail.episodes ?? []).map((e: Record<string, unknown>): Episode => ({
          id: Number(e.id), season: season.number, number: Number(e.episode_number), name: String(e.name || `${e.episode_number}. bölüm`),
          overview: typeof e.overview === 'string' ? e.overview : '', still: typeof e.still_path === 'string' ? e.still_path : null,
          runtime: typeof e.runtime === 'number' && e.runtime > 0 ? e.runtime : null, airDate: typeof e.air_date === 'string' ? e.air_date : '',
        }));
        season.loaded = true;
      } catch { if (signal.aborted) throw new DOMException('Aborted', 'AbortError'); stopped = true; }
    }
  }));
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const next = data.next_episode_to_air;
  const nextEpisode: Episode | undefined = next ? { id: next.id, season: next.season_number, number: next.episode_number, name: next.name || '', overview: next.overview || '', still: next.still_path || null, runtime: next.runtime || null, airDate: next.air_date || '' } : undefined;
  return { id, status: String(data.status || ''), seasons, fetchedAt: new Date().toISOString(), nextEpisode };
}
export async function readSeriesCatalog(id: number): Promise<SeriesCatalog | null> {
  const key = `tvCatalog:${id}`;
  const result = await browser.storage.local.get(key);
  return (result[key] as SeriesCatalog | undefined) ?? null;
}
export async function loadSeriesCatalog(id: number, token: string, signal: AbortSignal, force = false): Promise<SeriesCatalog> {
  const cached = await readSeriesCatalog(id);
  const fresh = cached && Date.now() - Date.parse(cached.fetchedAt) < 6 * 60 * 60 * 1000 && cached.seasons.every(s => s.loaded);
  if (!force && fresh) return cached;
  if (!token) { if (cached) return { ...cached, warning: 'TMDB anahtarı yok; kayıtlı bölüm bilgileri gösteriliyor.' }; throw new Error('Bölümleri yüklemek için TMDB anahtarını ekle.'); }
  try {
    const catalog = await fetchSeriesCatalog(id, token, signal);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    // Başarılı sezonları koru; kısmi ağ hatası önceki sezon bilgisini silmesin.
    for (const season of catalog.seasons) {
      const previous = cached?.seasons.find(s => s.number === season.number);
      if (!season.loaded && previous?.loaded) season.episodes = previous.episodes;
    }
    await browser.storage.local.set({ [`tvCatalog:${id}`]: catalog });
    return catalog;
  } catch (error) {
    if (!signal.aborted && cached) return { ...cached, warning: 'Güncelleme yapılamadı; kayıtlı bölüm bilgileri gösteriliyor. Yenileyerek tekrar deneyebilirsin.' };
    throw error;
  }
}

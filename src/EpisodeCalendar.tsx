import { useEffect, useState } from 'react';
import type { Media } from './tmdb';
import { activeRun, defaultTracking, episodeKey, episodeLabel, episodeProgress, type SeriesCatalog } from './episodes';
import { todayLocal } from './personal';
import { loadSeriesCatalog } from './tvApi';

export default function EpisodeCalendar({ library, token, open }: { library: Media[]; token: string; open: (item: Media) => void }) {
  const [catalogs, setCatalogs] = useState<Record<number, SeriesCatalog>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const series = library.filter(m => m.media_type === 'tv');
  const ids = series.map(m => m.id).sort((a,b) => a-b).join(',');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    async function load() {
      let failed = false;
      for (const id of ids.split(',').filter(Boolean).map(Number)) {
        if (controller.signal.aborted) return;
        try {
          const catalog = await loadSeriesCatalog(id, token, controller.signal, attempt > 0);
          if (!controller.signal.aborted) setCatalogs(current => ({ ...current, [id]: catalog }));
          if (catalog.warning || catalog.seasons.some(s => !s.loaded)) failed = true;
        } catch { if (!controller.signal.aborted) failed = true; }
      }
      if (!controller.signal.aborted) { setLoading(false); if (failed) setError('Bazı diziler güncellenemedi. Takvim eksik veya kayıtlı bilgiye dayanıyor olabilir; yenileyerek tekrar dene.'); }
    }
    void load();
    return () => controller.abort();
  }, [ids, token, attempt]);
  const entries = series.flatMap(item => {
    const catalog = catalogs[item.id];
    if (!catalog) return [];
    const tracking = item.episodeTracking ?? defaultTracking();
    const episodes = episodeProgress(catalog, tracking).episodes;
    if (catalog.nextEpisode && (tracking.includeSpecials || catalog.nextEpisode.season !== 0) && !episodes.some(e => episodeKey(e) === episodeKey(catalog.nextEpisode!))) episodes.push(catalog.nextEpisode);
    return episodes.filter(e => e.airDate >= todayLocal() && !activeRun(tracking).watched[episodeKey(e)]).map(episode => ({ item, episode }));
  }).sort((a,b) => a.episode.airDate.localeCompare(b.episode.airDate) || a.item.title.localeCompare(b.item.title, 'tr') || a.episode.number - b.episode.number);
  return <section className="episode-calendar"><div className="tracker-heading"><h2>Yeni bölüm takvimi</h2><button disabled={loading} onClick={() => setAttempt(a => a + 1)}>Yenile</button></div><p className="filter-note">Listendeki tüm dizilerin TMDB’de tarih verilmiş yaklaşan bölümleri. Özel bölümler dizi ayarına göre dahil edilir; açıklamalar gösterilmez.</p>{loading && <p role="status">Diziler güncelleniyor…</p>}{error && <p role="alert" className="error">{error}</p>}{!loading && !entries.length && <p className="search-message">{series.length ? 'TMDB’de tarih verilmiş yaklaşan bölüm bulunamadı.' : 'Takvim için listene bir dizi ekle.'}</p>}{entries.map(({ item, episode }) => <button className="calendar-entry" aria-label={`${item.title} ${episodeLabel(episode)} ${episode.airDate}`} key={`${item.id}:${episode.season}:${episode.number}`} onClick={() => open(item)}><time>{new Date(`${episode.airDate}T12:00:00`).toLocaleDateString('tr-TR')}</time><strong>{item.title}</strong><span>{episodeLabel(episode)}</span></button>)}</section>;
}

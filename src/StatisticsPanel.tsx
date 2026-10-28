import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Clapperboard, Film, LoaderCircle, RefreshCw, Sparkles, Star, Tv, UserRound } from 'lucide-react';
import { browser } from 'wxt/browser';
import { mediaKey, type Media } from './tmdb';
import { buildStatistics, formatWatchTime, watchEvents, watchedEpisodeKeys, type Ranked, type StatsMetadataMap, type WatchEvent } from './statistics';
import { emptyStatsMetadata, enrichStatsMetadata, mergeCatalogRuntime, needsStatsMetadata, readStatsMetadata, statsMetadataKey, StatsRequestError } from './statisticsApi';
import type { SeriesCatalog } from './episodes';
import { locale, runName, t, useLanguage } from './i18n';
import Select from './Select';
import YearReview from './YearReview';

export default function StatisticsPanel({ library, token, open, hideTitle = false }: { hideTitle?: boolean; library: Media[]; token: string; open: (item: Media) => void }) {
  const language = useLanguage();
  const [metadata, setMetadata] = useState<StatsMetadataMap>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refreshed = useRef(0);
  const [year, setYear] = useState(() => Number(new Date().getFullYear()));
  const [month, setMonth] = useState<number | null>(null);
  const [undated, setUndated] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(30);
  const [review, setReview] = useState(false);
  const watched = useMemo(() => [...new Map(watchEvents(library).map(event => [mediaKey(event.item), event.item])).values()], [library]);
  const signature = watched.map(item => `${mediaKey(item)}:${watchedEpisodeKeys(item).join(',')}`).sort().join('|');

  useEffect(() => {
    const controller = new AbortController(); let cursor = 0, stopped = false;
    const force = attempt > refreshed.current; refreshed.current = attempt;
    setLoading(watched.length > 0); setLoaded(0); setError(false);
    void Promise.all(Array.from({ length: Math.min(2, watched.length) }, async () => {
      while (cursor < watched.length && !controller.signal.aborted) {
        const item = watched[cursor++]!; const key = mediaKey(item);
        try {
          let data = await readStatsMetadata(item);
          if (controller.signal.aborted) return;
          setMetadata(current => ({ ...current, [key]: data }));
          if (token && !stopped && (force || needsStatsMetadata(item, data))) {
            try { data = await enrichStatsMetadata(item, data, token, controller.signal, force); }
            catch (cause) {
              if (controller.signal.aborted) return;
              if (cause instanceof StatsRequestError && [401, 403, 429].includes(cause.status)) stopped = true;
              setError(true); data = await readStatsMetadata(item);
            }
            if (!controller.signal.aborted) setMetadata(current => ({ ...current, [key]: data }));
          }
        } catch { if (!controller.signal.aborted) setError(true); }
        finally { if (!controller.signal.aborted) setLoaded(value => value + 1); }
      }
    })).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local') return;
      for (const item of watched) {
        const key = mediaKey(item), change = changes[statsMetadataKey(item)];
        if (change) setMetadata(current => { const next = { ...current }; if (change.newValue) next[key] = change.newValue as StatsMetadataMap[string]; else delete next[key]; return next; });
        if (item.media_type === 'tv') for (const catalogKey of [`tvCatalog:${item.id}`, `tvCatalog:en:${item.id}`]) {
          if (changes[catalogKey]?.newValue) setMetadata(current => ({ ...current, [key]: mergeCatalogRuntime(current[key] ?? emptyStatsMetadata(item), changes[catalogKey]!.newValue as SeriesCatalog) }));
        }
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => { controller.abort(); browser.storage.onChanged.removeListener(listener); };
    // The signature changes only when watched titles or episode keys require new metadata.
  }, [signature, token, attempt]);

  const stats = useMemo(() => buildStatistics(library, metadata, year), [library, metadata, year]);
  const missingMetadata = watched.filter(item => { const data = metadata[mediaKey(item)]; return !data?.fetchedAt || watchedEpisodeKeys(item).some(key => !Object.hasOwn(data.episodeDirectors ?? {}, key)); }).length;
  useEffect(() => { setMonth(null); setUndated(false); setHistoryLimit(30); }, [year]);
  const history = undated ? stats.events.filter(event => !event.date) : stats.yearlyEvents.filter(event => !month || Number(event.date!.slice(5, 7)) === month);
  const maxMonth = Math.max(1, ...stats.months.map(month => month.movieWatches + month.episodes));
  const monthName = (value: number, short = false) => new Date(2024, value - 1, 15).toLocaleDateString(locale(), { month: short ? 'short' : 'long' });
  const countLabel = (value: number) => value.toLocaleString(locale());
  return <section className="statistics" aria-labelledby="statistics-title">
    <div className="statistics-heading"><div><h2 id="statistics-title" hidden={hideTitle}>{t('İstatistikler')}</h2><p>{t('Tüm zamanlar · Kütüphanendeki izleme kayıtları')}</p></div><button className="secondary-button" disabled={loading || !token || !watched.length} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>{t('Yenile')}</button></div>
    <div className="statistics-totals">
      {[{ label: 'İzlenen film', value: countLabel(stats.overall.movies), icon: Film }, { label: 'İzlenen dizi', value: countLabel(stats.overall.series), icon: Tv }, { label: 'İzlenen bölüm', value: countLabel(stats.overall.episodes), icon: Clapperboard }, { label: 'İzleme süresi', value: formatWatchTime(stats.overall.minutes, language), icon: Clock3 }].map(({ label, value, icon: Icon }) => <div className="stat-tile" key={label}><Icon size={17}/><strong>{value}</strong><span>{t(label)}</span></div>)}
    </div>
    <p className="statistics-note">{t('Film ve dizi sayıları farklı yapımları, bölüm ve süre toplamları tüm izleme turlarını kapsar. En az bir bölümü izlenen diziler de sayılır.')}</p>
    {loading && <p className="statistics-loading" role="status"><LoaderCircle size={14} className="animate-spin"/>{t('Süre ve kadro bilgileri tamamlanıyor… {0}/{1}', loaded, watched.length)}</p>}
    {error && <p className="error" role="alert">{t('İstatistik bilgileri güncellenemedi. Kayıtlı bilgiler korunuyor.')}</p>}
    {!token && missingMetadata > 0 && <p className="statistics-note">{t('Süre ve kadro bilgilerini tamamlamak için ayarlardan TMDB anahtarını ekle.')}</p>}
    {(stats.overall.missingRuntime > 0 || stats.overall.undated > 0 || missingMetadata > 0) && <div className="statistics-coverage">
      {stats.overall.missingRuntime > 0 && <span>{t('{0} izlemenin süresi bilinmiyor; süre toplamına eklenmedi.', stats.overall.missingRuntime)}</span>}
      {stats.overall.undated > 0 && <span>{t('{0} kayıt tarihsiz; yıllık ve aylık raporlara eklenmedi.', stats.overall.undated)}</span>}
      {missingMetadata > 0 && <span>{t('{0} yapımın kadro bilgileri eksik.', missingMetadata)}</span>}
    </div>}

    <section className="statistics-section"><div className="statistics-section-heading"><h3>{t('Yıllık izleme raporu')}</h3><Select label={t('Rapor yılı')} value={String(year)} onChange={value => setYear(Number(value))} options={stats.years.map(year => ({ value: String(year), label: String(year) }))}/></div>
      <div className="annual-totals"><span><strong>{stats.annual.movieWatches}</strong>{t('Film izleme')}</span><span><strong>{stats.annual.episodes}</strong>{t('Bölüm izleme')}</span><span><strong>{formatWatchTime(stats.annual.minutes, language)}</strong>{t('Bilinen süre')}</span></div>
      <p className="statistics-note">{t('Yıllık film ve bölüm sayıları tekrar izlemeleri içerir. Süre yalnızca süresi bilinen izlemelerden hesaplanır.')}</p>
      <div className="monthly-heading"><h4>{t('Aylık izleme grafiği')}</h4><div><span className="chart-legend-movie">{t('Film')}</span><span className="chart-legend-episode">{t('Bölüm')}</span></div></div>
      <div className="monthly-chart" role="group" aria-label={t('Aylık izleme grafiği')}>{stats.months.map(entry => <button key={entry.month} aria-pressed={!undated && month === entry.month} aria-label={t('{0}: {1} film, {2} bölüm. Geçmişi filtrele.', monthName(entry.month), entry.movieWatches, entry.episodes)} aria-describedby={`month-tip-${entry.month}`} onClick={() => { setMonth(month === entry.month ? null : entry.month); setUndated(false); setHistoryLimit(30); }}>
        <span role="tooltip" id={`month-tip-${entry.month}`} className="chart-tooltip"><strong>{monthName(entry.month)}</strong><span>{t('{0}: {1} film, {2} bölüm', year, entry.movieWatches, entry.episodes)}</span><span>{formatWatchTime(entry.minutes, language)}</span></span><span className="monthly-count">{entry.movieWatches + entry.episodes || '–'}</span><span className="monthly-bar"><span className="monthly-bar-episode" style={{ height: `${entry.episodes / maxMonth * 100}%` }}/><span className="monthly-bar-movie" style={{ height: `${entry.movieWatches / maxMonth * 100}%` }}/></span><span>{monthName(entry.month, true)}</span>
      </button>)}</div>
      <p className="statistics-note">{t('Bir aya basarak aşağıdaki izleme geçmişini filtreleyebilirsin.')}</p>
      <div className="year-review-teaser"><Sparkles size={23}/><div><strong>{t('{0} · Senin sinema yılın', year)}</strong><p>{stats.yearlyEvents.length ? t('{0} aktif gün, {1} günlük en uzun seri.', stats.activeDays, stats.longestStreak) : t('Bu yıl için tarihli izleme kaydı yok.')}</p></div><button className="primary-button" disabled={!stats.yearlyEvents.length} onClick={() => setReview(true)}>{t('Yıl özetini aç')}</button></div>
    </section>

    <div className="statistics-rankings"><Ranking title={t('En çok izlenen türler')} entries={stats.overall.genres} genres/>
      <Ranking title={t('En çok izlenen oyuncular')} entries={stats.overall.actors}/>
      <Ranking title={t('En çok izlenen yönetmenler')} entries={stats.overall.directors}/>
      <section className="statistics-section"><h3>{t('En yüksek puan verdiğin yapımlar')}</h3>{stats.highestRated.length ? <ol className="rated-titles">{stats.highestRated.slice(0, 5).map(item => <li key={mediaKey(item)}><button data-open-details onClick={() => open(item)}>{item.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" loading="lazy"/> : <Film size={21}/>}<span><strong>{item.title}</strong><small>{t(item.media_type === 'movie' ? 'Film' : 'Dizi')}{item.year ? ` · ${item.year}` : ''}</small></span><b><Star size={12} fill="currentColor"/>{item.personalRating}/10</b></button></li>)}</ol> : <p className="statistics-note">{t('Henüz kişisel puan vermedin.')}</p>}</section>
    </div>
    <p className="statistics-note">{t('Tür ve kişi sıralamaları tüm zamanlarda izlenen farklı yapım sayısına göredir. Oyuncularda ana kadro, yönetmenlerde film ve izlenen bölüm kredileri kullanılır; dizi yaratıcıları yönetmen sayılmaz.')}</p>

    <section className="statistics-section"><div className="statistics-section-heading"><h3>{t('İzleme geçmişi')}</h3><div className="history-filters">{month && !undated && <button className="secondary-button" onClick={() => setMonth(null)}>{monthName(month)} ×</button>}{stats.overall.undated > 0 && <button className="secondary-button" aria-pressed={undated} onClick={() => { setUndated(!undated); setHistoryLimit(30); }}>{t('Tarihi bilinmeyen')} · {stats.overall.undated}</button>}</div></div>
      {!history.length && <p className="statistics-note">{t('Bu aralıkta izleme kaydı yok.')}</p>}
      <ol className="watch-timeline">{history.slice(0, historyLimit).map((event, index) => <li key={event.id}>{(index === 0 || event.date !== history[index - 1]?.date) && <time>{event.date ? new Date(`${event.date}T12:00:00`).toLocaleDateString(locale(), { year: 'numeric', month: 'long', day: 'numeric' }) : t('Tarihi bilinmeyen')}</time>}<button data-open-details onClick={() => open(event.item)}><span className="timeline-dot"/><span><strong>{event.item.title}</strong><small>{eventLabel(event)}{event.rewatch ? ` · ${t('Yeniden izleme')}` : ''}{event.minutes !== null ? ` · ${event.minutes} ${t('dk')}` : ''}</small></span></button></li>)}</ol>
      {history.length > historyLimit && <button className="secondary-button" onClick={() => setHistoryLimit(value => value + 30)}>{t('Daha fazla göster')}</button>}
    </section>
    <p className="statistics-note">{t('Rapor kütüphanede kalan kayıtlara dayanır. Silinen içerikler ve izleme turları hesaba katılmaz. Tarihle kaydedilmiş dizi tekrarları için bölüm veya süre tahmini yapılmaz.')}</p>
    {review && <YearReview stats={stats} year={year} close={() => setReview(false)}/>}
  </section>;
}

function eventLabel(event: WatchEvent) {
  if (event.kind !== 'episode') return t(event.kind === 'movie' ? 'Film' : 'Dizi');
  const [season, episode] = event.episodeKey!.split(':');
  return `S${season!.padStart(2, '0')} ${locale() === 'en-US' ? 'E' : 'B'}${episode!.padStart(2, '0')}${event.runName ? ` · ${runName(event.runName)}` : ''}`;
}
function Ranking({ title, entries, genres = false }: { title: string; entries: Ranked[]; genres?: boolean }) {
  return <section className="statistics-section"><h3>{title}</h3>{!entries.length ? <p className="statistics-note">{t('Henüz yeterli bilgi yok.')}</p> : <ol className="statistics-ranking">{entries.slice(0, 5).map((entry, index) => <li key={entry.id}><span className="rank-number">{index + 1}</span>{!genres && <span className="rank-person">{entry.profile ? <img src={`https://image.tmdb.org/t/p/w92${entry.profile}`} alt="" loading="lazy"/> : <UserRound size={14}/>}</span>}<span className="rank-name">{genres ? t(entry.name) : entry.name}<span className="rank-meter" style={{ width: `${entry.count / entries[0]!.count * 100}%` }}/></span><strong>{t('{0} yapım', entry.count)}</strong></li>)}</ol>}</section>;
}

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleCheck, Film, LoaderCircle, Play, RefreshCw } from 'lucide-react';
import { browser } from 'wxt/browser';
import { continueCandidates, continueProgress } from './continueProgress';
import { episodeKey, episodeLabel, type SeriesCatalog } from './episodes';
import { loadSeriesCatalog, seriesCatalogKey } from './tvApi';
import { locale, runName, t, useLanguage } from './i18n';
import { mediaKey, type Media } from './tmdb';
import type { SaveEpisode } from './SeriesTracker';

export default function ContinueWatching({ library, token, busy, open, saveEpisode, completeMovie }: {
  library: Media[]; token: string; busy: boolean; open: (item: Media) => void;
  saveEpisode: (item: Media, ...args: Parameters<SaveEpisode>) => ReturnType<SaveEpisode>;
  completeMovie: (item: Media) => void;
}) {
  const language = useLanguage();
  const candidates = continueCandidates(library);
  const ids = candidates.filter(item => item.media_type === 'tv').map(item => item.id).sort((a, b) => a - b).join(',');
  const [catalogs, setCatalogs] = useState<Record<number, SeriesCatalog>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [savingError, setSavingError] = useState('');
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const controller = new AbortController();
    const series = ids.split(',').filter(Boolean).map(Number);
    setCatalogs({}); setErrors({}); setLoading(series.length > 0);
    let cursor = 0;
    // Two shows at a time; each uses the existing bounded season loader and cache.
    void Promise.all(Array.from({ length: Math.min(2, series.length) }, async () => {
      while (cursor < series.length && !controller.signal.aborted) {
        const id = series[cursor++]!;
        try {
          const catalog = await loadSeriesCatalog(id, token, controller.signal, attempt > 0);
          if (!controller.signal.aborted) setCatalogs(current => ({ ...current, [id]: catalog }));
        } catch {
          if (!controller.signal.aborted) setErrors(current => ({ ...current, [id]: 'Bölümler yüklenemedi.' }));
        }
      }
    })).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local') return;
      for (const id of series) {
        const change = changes[seriesCatalogKey(id)];
        if (change) {
          setCatalogs(current => { const next = { ...current }; if (change.newValue) next[id] = change.newValue as SeriesCatalog; else delete next[id]; return next; });
        }
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => { controller.abort(); browser.storage.onChanged.removeListener(listener); };
  }, [ids, token, language, attempt]);

  const items = candidates.filter(item => {
    const catalog = catalogs[item.id];
    if (item.media_type !== 'tv' || !catalog) return true;
    const progress = continueProgress(item, catalog);
    return !(progress.complete && progress.ended);
  });
  const itemKeys = items.map(mediaKey).join(',');
  function scrollCards(direction: number) {
    const el = rail.current;
    const card = el?.querySelector<HTMLElement>('.continue-card');
    if (el && card) el.scrollBy({ left: direction * (card.getBoundingClientRect().width + (Number.parseFloat(getComputedStyle(el).columnGap) || 0)) });
  }
  function updateEdges() {
    const el = rail.current;
    if (el) setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }
  useEffect(() => {
    updateEdges();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdges) : null;
    if (rail.current) observer?.observe(rail.current);
    window.addEventListener('resize', updateEdges);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateEdges); };
  }, [itemKeys]);

  if (!items.length) return null;
  return <section className="continue-section" aria-labelledby="continue-title">
    <div className="continue-heading"><h2 id="continue-title"><Play size={16} fill="currentColor"/>{t('Devam Et')}<span>{items.length}</span></h2><div>
      {ids && <button className="icon-button" aria-label={t('Devam Et bilgilerini yenile')} title={t('Yenile')} disabled={loading || busy} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/></button>}
      <button className="icon-button" aria-label={t('Önceki içerikler')} disabled={edges.start} onClick={() => scrollCards(-1)}><ChevronLeft size={17}/></button>
      <button className="icon-button" aria-label={t('Sonraki içerikler')} disabled={edges.end} onClick={() => scrollCards(1)}><ChevronRight size={17}/></button>
    </div></div>
    {savingError && <p className="error" role="alert">{t(savingError)}</p>}
    <div ref={rail} className="continue-rail" role="list" aria-label={t('Devam Et')} onScroll={updateEdges}>
      {items.map(item => {
        const catalog = item.media_type === 'tv' ? catalogs[item.id] : undefined;
        const progress = catalog ? continueProgress(item, catalog) : undefined;
        const tracking = item.episodeTracking;
        const run = tracking?.runs.find(run => run.id === tracking.activeRunId) ?? tracking?.runs[0];
        const unavailable = !catalog || !!catalog.warning || !!progress?.incomplete;
        return <article className="continue-card" role="listitem" key={mediaKey(item)}>
          <div className="continue-summary"><button data-open-details className="continue-poster" aria-label={t('{0} Devam Et afişinden detayları aç', item.title)} onClick={() => open(item)}>
            {item.poster_path && <img src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }}/>}<Film size={24}/>
          </button><div><h3><button data-open-details className="title-button" aria-label={t('{0} detaylarını aç', item.title)} onClick={() => open(item)}>{item.title}</button></h3>
            {item.media_type === 'movie' ? <p>{t('Film')}{item.year ? ` · ${item.year}` : ''}</p> : <>
              <p>{progress ? t('{0} sezon · {1} bölüm', progress.seasonCount, progress.total) : t('Dizi')}</p>
              {run && tracking && tracking.activeRunId !== tracking.runs[0]?.id && <small className="continue-run">{runName(run.name)}</small>}
              <strong className="continue-next">{unavailable ? errors[item.id] ? t('Bölümler yüklenemedi.') : loading ? <><LoaderCircle size={12} className="animate-spin"/>{t('Yükleniyor…')}</> : t('Bölüm bilgilerini yenile') : progress?.next ? `${t('Sıradaki:')} ${episodeLabel(progress.next)}` : progress?.upcoming[0] ? `${episodeLabel(progress.upcoming[0])} · ${t('Yakında')}` : progress?.complete ? t('Yayımlanan bölümlere yetiştin') : progress?.total ? t('Yayın tarihi bilinmeyen bölümler var') : t('TMDB’de sezon bilgisi bulunmuyor.')}</strong>
            </>}
          </div></div>
          <div className="continue-progress">
            {item.media_type === 'movie' ? <p>{t('İzleniyor')}</p> : progress?.season ? <>
              <div><span>{progress.season.name}</span><span>{progress.seasonWatched}/{progress.seasonTotal}</span></div>
              <progress aria-label={t('{0} sezon ilerlemesi', item.title)} value={progress.seasonWatched} max={progress.seasonTotal || 1}/>
              <small>{t('Sezon ilerlemesi · %{0}', progress.seasonPercent)}</small>
            </> : <p>{t(errors[item.id] || 'Bölüm bilgileri bekleniyor.')}</p>}
            {catalog?.warning && <small className="continue-warning">{t('Kayıtlı bilgiler gösteriliyor. İlerlemeden önce yenile.')}</small>}
            {progress?.incomplete && <small className="continue-warning">{t('Bazı sezon bilgileri eksik.')}</small>}
            {!unavailable && !progress?.next && progress?.upcoming[0] && <small>{t('Yeni bölüm: {0}', new Date(`${progress.upcoming[0].airDate}T12:00:00`).toLocaleDateString(locale()))}</small>}
          </div>
          <button className="primary-button continue-mark" disabled={busy || item.media_type === 'tv' && (unavailable || !progress?.next)} onClick={async () => {
            setSavingError('');
            if (item.media_type === 'movie') completeMovie(item);
            else if (catalog && progress?.next) { const result = await saveEpisode(item, { type: 'episode', key: episodeKey(progress.next), watched: true }, catalog); if (result) setSavingError(result); }
          }}><CircleCheck size={15}/>{t(item.media_type === 'movie' ? 'Filmi izledim' : 'Bölümü İzledim')}</button>
        </article>;
      })}
    </div>
  </section>;
}

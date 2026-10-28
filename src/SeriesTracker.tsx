import { t, useLanguage, locale, runName } from './i18n';
import Select from './Select';
import { useEffect, useState } from 'react';
import { Check, LoaderCircle, Trash2 } from 'lucide-react';
import { activeRun, defaultTracking, episodeKey, episodeLabel, episodeProgress, isAired, type Episode, type EpisodeAction, type EpisodeTracking, type SeriesCatalog } from './episodes';
import { loadSeriesCatalog } from './tvApi';
import { todayLocal } from './personal';
import type { Media } from './tmdb';

export type SaveEpisode = (action: EpisodeAction, catalog: SeriesCatalog, initialTracking?: EpisodeTracking) => Promise<string | null>;
function EpisodeDetails({ episode, protected: hide }: { episode: Episode; protected: boolean }) {
  useLanguage();
  const [revealed, setRevealed] = useState(false);
  return <details className="episode-details"><summary>{t("Bölüm detayları")}</summary>{hide && !revealed ? <button type="button" className="spoiler-button" onClick={() => setRevealed(true)}>{t("Spoiler gizli · Açıklamayı ve görseli göster")}</button> : <>{episode.still && <img src={`https://image.tmdb.org/t/p/w500${episode.still}`} alt={t("Bölüm görseli")} loading="lazy"/>}<p>{episode.overview || t("Bu bölüm için Türkçe açıklama bulunmuyor.")}</p></>}</details>;
}
export default function SeriesTracker({ item, token, busy, save, inLibrary = true }: { inLibrary?: boolean; item: Media; token: string; busy?: boolean; save: SaveEpisode }) {
  const language = useLanguage();
  const [catalog, setCatalog] = useState<SeriesCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);
  const [previewTracking, setPreviewTracking] = useState(defaultTracking);
  useEffect(() => {
    const controller = new AbortController(); setCatalog(null); setLoading(true); setError('');
    loadSeriesCatalog(item.id, token, controller.signal, attempt > 0).then(data => { if (!controller.signal.aborted) setCatalog(data); }).catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : t("Bölümler yüklenemedi.")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [item.id, token, attempt, language]);
  const tracking = item.episodeTracking ?? (inLibrary ? defaultTracking() : previewTracking);
  const run = activeRun(tracking);
  const progress = catalog ? episodeProgress(catalog, tracking) : null;
  const seasons = catalog?.seasons.filter(s => tracking.includeSpecials || s.number !== 0) ?? [];
  const season = seasons.find(s => s.number === seasonNumber) ?? seasons[0];
  const seasonCount = season?.episodes.filter(e => run.watched[episodeKey(e)]).length ?? 0;
  const seasonTotal = season ? Math.max(season.expected, season.episodes.length) : 0;
  async function commit(action: EpisodeAction) {
    if (!catalog) return false;
    if (!inLibrary && (action.type === 'specials' || action.type === 'spoilers')) {
      setPreviewTracking(current => ({ ...current, [action.type === 'specials' ? 'includeSpecials' : 'spoilerProtection']: action.value })); return true;
    }
    setError(''); const result = inLibrary ? await save(action, catalog) : await save(action, catalog, tracking); if (result) setError(result);
    return !result;
  }
  return <section className="series-tracker"><div className="tracker-heading"><h3>{t("Sezon ve bölüm takibi")}</h3><button disabled={loading} onClick={() => setAttempt(a => a + 1)}>{t("Yenile")}</button></div>
    {!inLibrary && <p className="filter-note">{t('İlk bölüm işaretlendiğinde bu dizi kütüphanene eklenir.')}</p>}
    {loading && <p className="tracker-loading" role="status"><LoaderCircle size={15} className="animate-spin"/> {t("Sezonlar yükleniyor…")}</p>}
    {error && <p className="error" role="alert">{t(error)}</p>}
    {catalog?.warning && <p className="filter-note">{t(catalog.warning)}</p>}
    {catalog && progress && <>
      <p className="series-air-status">{progress.ended ? catalog.status === 'Canceled' ? t("İptal edilmiş dizi") : t("Yayını bitmiş dizi") : catalog.status === 'Returning Series' ? t("Devam eden dizi") : t("Yayın durumu: {0}", catalog.status || t("Bilinmiyor"))}</p>
      {inLibrary && <div className="tracker-controls"><label>{t("İzleme turu")}<Select label={t("İzleme turu")} value={run.id} disabled={busy} onChange={id => { setDeleteRunId(null); void commit({ type: 'selectRun', id }); }} options={tracking.runs.map(r => ({ value: r.id, label: runName(r.name) }))}/></label><button className="primary-button" disabled={busy || loading} onClick={() => { setDeleteRunId(null); void commit({ type: 'newRun' }); }}>{t("Yeni izleme turu")}</button></div>}
      {inLibrary && run.id !== tracking.runs[0]?.id && <div className="tracker-run-actions"><button className="danger-button" type="button" disabled={busy || loading} onClick={() => setDeleteRunId(run.id)}><Trash2 size={14}/>{t("İzleme turunu sil")}</button></div>}
      {deleteRunId === run.id && <div className="run-delete-confirm" role="group" aria-label={t("İzleme turunu silme onayı")}><p><strong>{runName(run.name)}</strong> {t("silinsin mi?")} {Object.keys(run.watched).length ? t("Bu turdaki {0} bölüm işareti kaldırılacak.", Object.keys(run.watched).length) : t("Bu turda işaretlenmiş bölüm yok.")} {t("Diğer izleme turların korunur.")}</p><div><button className="danger-button" type="button" disabled={busy} onClick={async () => { if (await commit({ type: 'deleteRun', id: run.id })) setDeleteRunId(null); }}><Trash2 size={14}/>{t("Turu sil")}</button><button className="secondary-button" type="button" disabled={busy} onClick={() => setDeleteRunId(null)}>{t("Vazgeç")}</button></div></div>}
      <div className="tracker-options"><label><input type="checkbox" checked={tracking.includeSpecials} disabled={busy} onChange={e => void commit({ type: 'specials', value: e.target.checked })}/> {t("Özel bölümleri takip et")}</label><label><input type="checkbox" checked={tracking.spoilerProtection} disabled={busy} onChange={e => void commit({ type: 'spoilers', value: e.target.checked })}/> {t("Spoiler koruması")}</label></div>
      <div className="tracker-progress"><span>{t("Dizi ilerlemesi · {0}/{1} · %{2}", progress.count, progress.total, progress.percent)}</span><progress aria-label={t("Dizi tamamlanma yüzdesi")} value={progress.count} max={progress.total || 1}/></div>
      {progress.incomplete && <p className="error">{t("Bazı sezon bilgileri eksik. Otomatik sıra ve tamamlanma için Yenile düğmesiyle tekrar dene.")}</p>}
      <div className="tracker-next"><p>{t("Son izlenen:")} <strong>{progress.last ? episodeLabel(progress.last) : t("Henüz yok")}</strong></p><p>{t("Sıradaki:")} <strong>{progress.incomplete ? t("Eksik bilgiler bekleniyor") : progress.next ? `${episodeLabel(progress.next)} · ${progress.next.name}` : progress.upcoming[0] ? t("{0} · Yayını bekleniyor", episodeLabel(progress.upcoming[0])) : progress.complete ? progress.ended ? t("Dizi tamamlandı") : t("Yayımlanan bölümlere yetiştin") : t("Yayın tarihi bilinmeyen bölümler var")}</strong></p><button className="primary-button" disabled={busy || loading || progress.incomplete || !progress.next} onClick={() => progress.next && void commit({ type: 'episode', key: episodeKey(progress.next), watched: true })}>{t("Bölümü İzledim")}</button></div>
      {seasons.length === 0 ? <p className="filter-note">{t("TMDB’de sezon bilgisi bulunmuyor.")}</p> : <><label className="tracker-season-label">{t("Sezon")}<Select label={t("Sezon seç")} value={String(season?.number ?? '')} onChange={value => setSeasonNumber(Number(value))} options={seasons.map(s => ({ value: String(s.number), label: `${s.name} · ${s.episodes.filter(e => run.watched[episodeKey(e)]).length}/${Math.max(s.expected, s.episodes.length)}` }))}/></label>
        <div className="tracker-progress"><span>{t("Sezon ilerlemesi · %{0}", seasonTotal ? Math.round(seasonCount / seasonTotal * 100) : 0)}</span><progress aria-label={t("Sezon tamamlanma yüzdesi")} value={seasonCount} max={seasonTotal || 1}/></div>
        <div className="season-bulk"><button disabled={busy || loading || !season?.loaded} onClick={() => season && void commit({ type: 'season', season: season.number, watched: true })}>{t("Sezonun yayımlanan bölümlerini izledim")}</button><button disabled={busy || loading || !season?.loaded || !seasonCount} onClick={() => season && void commit({ type: 'season', season: season.number, watched: false })}>{t("Sezon işaretlerini kaldır")}</button></div>
        <div className="episode-list">{season?.episodes.map(e => {
          const watched = !!run.watched[episodeKey(e)]; const future = !!e.airDate && e.airDate > todayLocal();
          return <article key={episodeKey(e)} className={`episode-row ${watched ? 'watched' : ''}`}>
            <div className="episode-heading"><span className="episode-number" aria-hidden="true">{String(e.number).padStart(2, '0')}</span><div className="episode-info"><strong>{e.name}</strong><small>{e.airDate ? new Date(`${e.airDate}T12:00:00`).toLocaleDateString(locale()) : t("Yayın tarihi bilinmiyor")}{e.runtime ? ` · ${e.runtime} ${t("dk")}` : ''}{future ? t(" · Yakında") : !isAired(e) && !e.airDate ? t(" · Elle işaretlenebilir") : ''}</small></div></div><EpisodeDetails key={`${run.id}:${episodeKey(e)}:${tracking.spoilerProtection}`} episode={e} protected={!watched && tracking.spoilerProtection}/><label className={`episode-check ${watched ? 'is-watched' : ''}`} title={t(watched ? 'İzlenmedi olarak işaretle' : 'İzlendi olarak işaretle')}><input type="checkbox" checked={watched} disabled={busy || loading || future} aria-label={t("{0} izlendi", episodeLabel(e))} onChange={event => void commit({ type: 'episode', key: episodeKey(e), watched: event.target.checked })}/><span className="episode-check-icon" aria-hidden="true"><Check size={18} strokeWidth={2.5}/></span></label></article>;
        })}</div></>}
      <p className="filter-note">{t("İlerleme, seçili turdaki tüm bilinen bölümleri kapsar. Yeni sezonlar geldikçe oran değişebilir. Yayınlanmamış bölümler otomatik işaretlenmez.")}</p>
    </>}
  </section>;
}

import Select from './Select';
import { useEffect, useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { activeRun, defaultTracking, episodeKey, episodeLabel, episodeProgress, isAired, type Episode, type EpisodeAction, type SeriesCatalog } from './episodes';
import { loadSeriesCatalog } from './tvApi';
import { todayLocal } from './personal';
import type { Media } from './tmdb';

export type SaveEpisode = (action: EpisodeAction, catalog: SeriesCatalog) => Promise<string | null>;
function EpisodeDetails({ episode, protected: hide }: { episode: Episode; protected: boolean }) {
  const [revealed, setRevealed] = useState(false);
  return <details className="episode-details"><summary>Bölüm detayları</summary>{hide && !revealed ? <button type="button" className="spoiler-button" onClick={() => setRevealed(true)}>Spoiler gizli · Açıklamayı ve görseli göster</button> : <>{episode.still && <img src={`https://image.tmdb.org/t/p/w500${episode.still}`} alt="Bölüm görseli" loading="lazy"/>}<p>{episode.overview || 'Bu bölüm için Türkçe açıklama bulunmuyor.'}</p></>}</details>;
}
export default function SeriesTracker({ item, token, busy, save }: { item: Media; token: string; busy?: boolean; save: SaveEpisode }) {
  const [catalog, setCatalog] = useState<SeriesCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    loadSeriesCatalog(item.id, token, controller.signal, attempt > 0).then(data => { if (!controller.signal.aborted) setCatalog(data); }).catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Bölümler yüklenemedi.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [item.id, token, attempt]);
  const tracking = item.episodeTracking ?? defaultTracking();
  const run = activeRun(tracking);
  const progress = catalog ? episodeProgress(catalog, tracking) : null;
  const seasons = catalog?.seasons.filter(s => tracking.includeSpecials || s.number !== 0) ?? [];
  const season = seasons.find(s => s.number === seasonNumber) ?? seasons[0];
  const seasonCount = season?.episodes.filter(e => run.watched[episodeKey(e)]).length ?? 0;
  const seasonTotal = season ? Math.max(season.expected, season.episodes.length) : 0;
  async function commit(action: EpisodeAction) {
    if (!catalog) return false;
    setError(''); const result = await save(action, catalog); if (result) setError(result);
    return !result;
  }
  return <section className="series-tracker"><div className="tracker-heading"><h3>Sezon ve bölüm takibi</h3><button disabled={loading} onClick={() => setAttempt(a => a + 1)}>Yenile</button></div>
    {loading && <p className="tracker-loading" role="status"><LoaderCircle size={15} className="animate-spin"/> Sezonlar yükleniyor…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {catalog?.warning && <p className="filter-note">{catalog.warning}</p>}
    {catalog && progress && <>
      <p className="series-air-status">{progress.ended ? catalog.status === 'Canceled' ? 'İptal edilmiş dizi' : 'Yayını bitmiş dizi' : catalog.status === 'Returning Series' ? 'Devam eden dizi' : `Yayın durumu: ${catalog.status || 'Bilinmiyor'}`}</p>
      <div className="tracker-controls"><label>İzleme turu<Select label="İzleme turu" value={run.id} disabled={busy} onChange={id => { setDeleteRunId(null); void commit({ type: 'selectRun', id }); }} options={tracking.runs.map(r => ({ value: r.id, label: r.name }))}/></label><button className="primary-button" disabled={busy || loading} onClick={() => { setDeleteRunId(null); void commit({ type: 'newRun' }); }}>Yeni izleme turu</button></div>
      {run.id !== tracking.runs[0]?.id && <div className="tracker-run-actions"><button className="danger-button" type="button" disabled={busy || loading} onClick={() => setDeleteRunId(run.id)}><Trash2 size={14}/>İzleme turunu sil</button></div>}
      {deleteRunId === run.id && <div className="run-delete-confirm" role="group" aria-label="İzleme turunu silme onayı"><p><strong>{run.name}</strong> silinsin mi? {Object.keys(run.watched).length ? `Bu turdaki ${Object.keys(run.watched).length} bölüm işareti kaldırılacak.` : 'Bu turda işaretlenmiş bölüm yok.'} Diğer izleme turların korunur.</p><div><button className="danger-button" type="button" disabled={busy} onClick={async () => { if (await commit({ type: 'deleteRun', id: run.id })) setDeleteRunId(null); }}><Trash2 size={14}/>Turu sil</button><button className="secondary-button" type="button" disabled={busy} onClick={() => setDeleteRunId(null)}>Vazgeç</button></div></div>}
      <div className="tracker-options"><label><input type="checkbox" checked={tracking.includeSpecials} disabled={busy} onChange={e => void commit({ type: 'specials', value: e.target.checked })}/> Özel bölümleri takip et</label><label><input type="checkbox" checked={tracking.spoilerProtection} disabled={busy} onChange={e => void commit({ type: 'spoilers', value: e.target.checked })}/> Spoiler koruması</label></div>
      <div className="tracker-progress"><span>Dizi ilerlemesi · {progress.count}/{progress.total} · %{progress.percent}</span><progress aria-label="Dizi tamamlanma yüzdesi" value={progress.count} max={progress.total || 1}/></div>
      {progress.incomplete && <p className="error">Bazı sezon bilgileri eksik. Otomatik sıra ve tamamlanma için Yenile düğmesiyle tekrar dene.</p>}
      <div className="tracker-next"><p>Son izlenen: <strong>{progress.last ? episodeLabel(progress.last) : 'Henüz yok'}</strong></p><p>Sıradaki: <strong>{progress.incomplete ? 'Eksik bilgiler bekleniyor' : progress.next ? `${episodeLabel(progress.next)} · ${progress.next.name}` : progress.upcoming[0] ? `${episodeLabel(progress.upcoming[0])} · Yayını bekleniyor` : progress.complete ? progress.ended ? 'Dizi tamamlandı' : 'Yayımlanan bölümlere yetiştin' : 'Yayın tarihi bilinmeyen bölümler var'}</strong></p><button className="primary-button" disabled={busy || loading || progress.incomplete || !progress.next} onClick={() => progress.next && void commit({ type: 'episode', key: episodeKey(progress.next), watched: true })}>Bölümü İzledim</button></div>
      {seasons.length === 0 ? <p className="filter-note">TMDB’de sezon bilgisi bulunmuyor.</p> : <><label className="tracker-season-label">Sezon<Select label="Sezon seç" value={String(season?.number ?? '')} onChange={value => setSeasonNumber(Number(value))} options={seasons.map(s => ({ value: String(s.number), label: `${s.name} · ${s.episodes.filter(e => run.watched[episodeKey(e)]).length}/${Math.max(s.expected, s.episodes.length)}` }))}/></label>
        <div className="tracker-progress"><span>Sezon ilerlemesi · %{seasonTotal ? Math.round(seasonCount / seasonTotal * 100) : 0}</span><progress aria-label="Sezon tamamlanma yüzdesi" value={seasonCount} max={seasonTotal || 1}/></div>
        <div className="season-bulk"><button disabled={busy || loading || !season?.loaded} onClick={() => season && void commit({ type: 'season', season: season.number, watched: true })}>Sezonun yayımlanan bölümlerini izledim</button><button disabled={busy || loading || !season?.loaded || !seasonCount} onClick={() => season && void commit({ type: 'season', season: season.number, watched: false })}>Sezon işaretlerini kaldır</button></div>
        <div className="episode-list">{season?.episodes.map(e => {
          const watched = !!run.watched[episodeKey(e)]; const future = !!e.airDate && e.airDate > todayLocal();
          return <article key={episodeKey(e)} className={`episode-row ${watched ? 'watched' : ''}`}><label><input type="checkbox" checked={watched} disabled={busy || loading || future} aria-label={`${episodeLabel(e)} izlendi`} onChange={event => void commit({ type: 'episode', key: episodeKey(e), watched: event.target.checked })}/><span><strong>{episodeLabel(e)} · {e.name}</strong><small>{e.airDate ? new Date(`${e.airDate}T12:00:00`).toLocaleDateString('tr-TR') : 'Yayın tarihi bilinmiyor'}{e.runtime ? ` · ${e.runtime} dk` : ''}{future ? ' · Yakında' : !isAired(e) && !e.airDate ? ' · Elle işaretlenebilir' : ''}</small></span></label><EpisodeDetails key={`${run.id}:${episodeKey(e)}:${tracking.spoilerProtection}`} episode={e} protected={!watched && tracking.spoilerProtection}/></article>;
        })}</div></>}
      <p className="filter-note">İlerleme, seçili turdaki tüm bilinen bölümleri kapsar. Yeni sezonlar geldikçe oran değişebilir. Yayınlanmamış bölümler otomatik işaretlenmez.</p>
    </>}
  </section>;
}

import { t, useLanguage, locale } from './i18n';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, ExternalLink, FolderPlus, Heart, Film, LoaderCircle, UserRound, X } from 'lucide-react';
import { getMediaDetails, mediaKey, type Media, type MediaDetails } from './tmdb';
import PersonalEditor from './PersonalEditor';
import SeriesTracker, { type SaveEpisode } from './SeriesTracker';
import CollectionsPanel from './CollectionsPanel';
import type { Collection, CommitCollection } from './collections';
import type { PersonalData } from './personal';
import WatchStatusSelect from './WatchStatusSelect';
import type { WatchStatus } from './watchStatus';
import { useModal, isBackdropClick } from './useModal';

const statuses: Record<string, string> = { Released: 'Yayımlandı', 'Post Production': 'Yapım sonrası', 'In Production': 'Yapım aşamasında', Planned: 'Planlandı', Rumored: 'Duyurulmadı', Canceled: 'İptal edildi', 'Returning Series': 'Devam ediyor', Ended: 'Sona erdi', Pilot: 'Pilot' };
export default function DetailPanel({ presentation = 'modal', item, token, close, watchStatus = 'planned', busy, onStatusChange, statusError, personalItem = item, onPersonalSave, collections = [], onCollectionChange, onEpisodeSave, inLibrary = true, onAdd, onFavorite }: { presentation?: 'modal' | 'sheet'; inLibrary?: boolean; onAdd?: () => void; onFavorite?: () => Promise<boolean>; item: Media; token: string; close: () => void; onEpisodeSave?: SaveEpisode; collections?: Collection[]; onCollectionChange?: CommitCollection; personalItem?: Media; onPersonalSave?: (patch: PersonalData) => Promise<boolean>; watchStatus?: WatchStatus; busy?: boolean; statusError?: string; onStatusChange?: (status: WatchStatus) => void }) {
  const language = useLanguage();
  const [wide, setWide] = useState(() => window.matchMedia?.('(min-width: 900px)').matches ?? false);
  useEffect(() => { const media = window.matchMedia?.('(min-width: 900px)'); if (!media) return; const update = () => setWide(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const modal = presentation !== 'sheet' || !wide;
  const dialog = useModal({ modal });
  useEffect(() => {
    if (modal) return;
    const hasModal = () => !!document.querySelector('dialog[open][aria-modal="true"]');
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !hasModal()) { event.preventDefault(); close(); } };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('keydown', escape); };
  }, [modal, close, dialog]);
  const scroll = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState('overview');
  const [visited, setVisited] = useState<string[]>(['overview']);
  const [showCollections, setShowCollections] = useState(false);
  const [loadedDetails, setDetails] = useState<MediaDetails | null>(null);
  const details = loadedDetails && mediaKey(loadedDetails) === mediaKey(item) ? loadedDetails : null;
  useLayoutEffect(() => {
    setTab('overview'); setVisited(['overview']); setShowCollections(false); setPersonalError('');
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [item.id, item.media_type]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [personalError, setPersonalError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setDetails(null); setError(''); setLoading(true);
    if (!token) { setError("Güncel detaylar için ayarlardan TMDB erişim anahtarını ekle."); setLoading(false); return () => controller.abort(); }
    getMediaDetails(item, token, controller.signal).then(data => {
      if (!controller.signal.aborted) setDetails(data);
    }).catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof TypeError ? t("Detaylar yüklenemedi. İnternet bağlantını kontrol et.") : e instanceof Error ? e.message : t("Detaylar yüklenemedi."));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [item, token, attempt, language]);
  const media = details ?? item;
  const tabs = [{ id: 'overview', label: t("Genel Bakış") }, ...(item.media_type === 'tv' && onEpisodeSave ? [{ id: 'episodes', label: t("Bölümler") }] : []), ...(inLibrary && onPersonalSave ? [{ id: 'personal', label: t("Kişisel Alanım") }] : [])];
  function activate(id: string) { setTab(id); setVisited(current => current.includes(id) ? current : [...current, id]); if (scroll.current) scroll.current.scrollTop = 0; }
  return <><dialog ref={dialog} className={`detail-dialog ${!modal ? 'detail-sheet' : ''}`} aria-labelledby="detail-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (isBackdropClick(e)) close(); }}>
    <div className="detail-topbar"><span>{item.media_type === 'movie' ? t("Film detayları") : t("Dizi detayları")}</span><button autoFocus={modal} className="icon-button" aria-label={t("Detayları kapat")} onClick={close}><X size={20}/></button></div>
    <div key={mediaKey(item)} ref={scroll} className={`detail-scroll detail-tab-${tab}`}>
      {tab === 'overview' && details?.backdrop && <img className="detail-backdrop" src={`https://image.tmdb.org/t/p/w780${details.backdrop}`} alt=""/>}
      <div className="detail-body"><div className="detail-summary"><div className="detail-poster">{media.poster_path ? <img src={`https://image.tmdb.org/t/p/w342${media.poster_path}`} alt={t("{0} afişi", media.title)}/> : <Film size={30}/>}</div><div className="detail-heading"><h2 id="detail-title">{media.title}</h2>{details?.originalTitle && details.originalTitle !== media.title && <p className="detail-original">{details.originalTitle}</p>}<div className="detail-meta"><span>{media.year || t("Tarih bilinmiyor")}</span>{details?.runtime && <span>{details.runtime} {t("dk")}{item.media_type === 'tv' ? t(" / bölüm") : ''}</span>}{media.vote_average > 0 && <span className="detail-rating">★ {media.vote_average.toFixed(1)} <small>/ 10 · TMDB</small></span>}</div>{details && <div className="detail-genres">{details.genres.map(g => <span key={g}>{g}</span>)}</div>}</div></div>
        <div className="detail-quick-actions">
        {!inLibrary && onAdd && <button className="primary-button" disabled={busy} onClick={onAdd}><Plus size={17}/>{t("Kütüphaneye ekle")}</button>}
        {(onFavorite || onPersonalSave) && <button className={`detail-favorite favorite-button ${personalItem.favorite ? 'is-favorite' : ''}`} aria-pressed={!!personalItem.favorite} disabled={busy} onClick={async () => { setPersonalError(''); if (!await (onFavorite ? onFavorite() : onPersonalSave!({ favorite: !personalItem.favorite }))) setPersonalError("Favori değişikliği kaydedilemedi. Tekrar dene."); }}><Heart size={17} fill={personalItem.favorite ? 'currentColor' : 'none'}/>{personalItem.favorite ? t("Favorilerimde") : t("Favorilere ekle")}</button>}
        {personalError && <p className="error" role="alert">{t(personalError)}</p>}
        {onCollectionChange && <button className="detail-favorite favorite-button" disabled={busy} onClick={() => setShowCollections(true)}><FolderPlus size={17}/>{t("Koleksiyonlar")} <span>{collections.filter(c => c.mediaKeys.includes(`${item.media_type}:${item.id}`)).length}</span></button>}
        {inLibrary && onStatusChange && <div className="detail-watch-status"><span>{t("İzleme durumun")}</span><WatchStatusSelect title={item.title} value={watchStatus} disabled={busy} onChange={onStatusChange}/></div>}
        </div>
        {statusError && <div className="error" role="alert">{t(statusError)}</div>}
        <div role="tablist" aria-label={t("İçerik bölümleri")} className="detail-tabs">{tabs.map(t => <button type="button" key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} onClick={() => activate(t.id)} onKeyDown={e => { const index = tabs.findIndex(t => t.id === tab); const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1; if (next >= 0) { e.preventDefault(); activate(tabs[next]!.id); document.getElementById(`tab-${tabs[next]!.id}`)?.focus(); } }}>{t.label}</button>)}</div>
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" hidden={tab !== 'overview'}>
        {loading && <div className="search-message" role="status"><LoaderCircle className="animate-spin" size={22}/>{t("Detaylar yükleniyor…")}</div>}
        {error && <div className="error" role="alert"><p>{t(error)}</p>{token && <button className="primary-button" onClick={() => setAttempt(a => a + 1)}>{t("Tekrar dene")}</button>}</div>}
        <section className="detail-section"><h3>{t("Konu")}</h3><p>{media.overview || (loading ? t("Yükleniyor…") : t("Bu yapım için Türkçe açıklama bulunmuyor."))}</p></section>
        {details && <><dl className="detail-facts">{details.date && <div><dt>{item.media_type === 'movie' ? t("Vizyon tarihi") : t("İlk yayın")}</dt><dd>{new Date(`${details.date}T12:00:00`).toLocaleDateString(locale())}</dd></div>}{details.status && <div><dt>{t("Yayın durumu")}</dt><dd>{t(statuses[details.status] || details.status)}</dd></div>}{details.creators.length > 0 && <div><dt>{item.media_type === 'movie' ? t("Yönetmen") : t("Yaratıcı")}</dt><dd>{details.creators.join(', ')}</dd></div>}{item.media_type === 'tv' && <><div><dt>{t("Sezon")}</dt><dd>{details.seasons ?? '—'}</dd></div><div><dt>{t("Bölüm")}</dt><dd>{details.episodes ?? '—'}</dd></div></>}</dl>
          {details.cast.length > 0 && <section className="detail-section"><h3>{t("Oyuncular")}</h3><div className="detail-cast">{details.cast.map((p, index) => <div key={`${p.id}:${index}`} className="cast-card"><div className="cast-image">{p.profile ? <img src={`https://image.tmdb.org/t/p/w185${p.profile}`} alt="" loading="lazy"/> : <UserRound size={25}/>}</div><strong>{p.name}</strong><span>{p.character}</span></div>)}</div></section>}</>}
        <a className="detail-tmdb" href={`https://www.themoviedb.org/${item.media_type}/${item.id}`} target="_blank" rel="noreferrer">{t("TMDB’de aç")} <ExternalLink size={13}/></a>
        </div>
        {item.media_type === 'tv' && onEpisodeSave && <div role="tabpanel" id="panel-episodes" aria-labelledby="tab-episodes" hidden={tab !== 'episodes'}>{visited.includes('episodes') && <SeriesTracker inLibrary={inLibrary} item={personalItem} token={token} busy={busy} save={onEpisodeSave}/>}</div>}
        {inLibrary && onPersonalSave && <div role="tabpanel" id="panel-personal" aria-labelledby="tab-personal" hidden={tab !== 'personal'}>{visited.includes('personal') && <PersonalEditor item={personalItem} busy={busy} save={onPersonalSave}/>}</div>}
      </div>
    </div>
  </dialog>{showCollections && onCollectionChange && <CollectionsPanel item={personalItem} collections={collections} busy={busy} commit={onCollectionChange} close={() => setShowCollections(false)}/>}</>;
}
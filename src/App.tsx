import { t, useLanguage, setLanguage, type Language } from './i18n';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Clock3, BookMarked, ExternalLink, Heart, Film, LoaderCircle, Settings, Star, StickyNote, Sun, Moon, Tv } from 'lucide-react';
import { browser } from 'wxt/browser';
import { getFilterMetadata, mediaKey, type Media } from './tmdb';
import SearchPanel from './SearchPanel';
import useCardMetadata from './useCardMetadata';
import Toast, { type Notice } from './Toast';
import Select from './Select';
import PopupHome from './PopupHome';
import WorkspaceSidebar from './WorkspaceSidebar';
import { sectionFromHash, sectionLabels, type AppSection } from './navigation';
import { useTheme } from './useTheme';
import EpisodeCalendar from './EpisodeCalendar';
import StatisticsPanel from './StatisticsPanel';
import ContinueWatching from './ContinueWatching';
import { applyEpisodeAction, defaultTracking, episodeProgress, type EpisodeAction, type EpisodeTracking, type SeriesCatalog } from './episodes';
import CollectionsPanel from './CollectionsPanel';
import { applyCollectionAction, removeFromCollections, type Collection, type CollectionAction } from './collections';
import AdvancedFilters from './AdvancedFilters';
import { emptyFilters, filterAndSort, sortOptions, type SortOrder } from './libraryFilters';
import DetailPanel from './DetailPanel';
import CardActions from './CardActions';
import LibraryToolbar, { type FilterChip } from './LibraryToolbar';
import SettingsPanel from './SettingsPanel';
import { validateArchive, type Archive } from './archive';
import WatchStatusSelect from './WatchStatusSelect';
import { getWatchStatus, watchStatuses, type WatchStatus } from './watchStatus';
import { loadLibrary, loadToken, saveLibrary, loadCollections, saveCollections, saveLibraryAndCollections } from './storage';
import { completedUpdate, validatePersonal, type PersonalData } from './personal';

export default function App({ surface = 'page' }: { surface?: 'popup' | 'page' }) {
  const language = useLanguage();
  const isPopup = surface === 'popup';
  const [initialQuery] = useState(() => isPopup ? (new URLSearchParams(window.location.search).get('search') ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) : '');
  const { theme, changeTheme, themeError } = useTheme();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [library, setLibrary] = useState<Media[]>([]);
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeId = useRef(0);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const [languageError, setLanguageError] = useState('');
  function notify(message: string, kind: Notice['kind'] = 'updated', values?: (string | number)[]) { setNotice({ id: ++noticeId.current, message, kind, values }); }
  async function changeLanguage(value: Language) {
    setLanguageError('');
    try { await browser.storage.local.set({ language: value }); setLanguage(value); }
    catch { setLanguageError('Dil tercihi kaydedilemedi. Tekrar dene.'); }
  }
  const [watchError, setWatchError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [selected, updateSelected] = useState<Media | null>(null);
  const selectionAnchor = useRef<{ key: string; top: number } | null>(null);
  const setSelected = useCallback((item: Media | null) => {
    const key = item ? mediaKey(item) : null;
    const card = key ? document.querySelector<HTMLElement>(`[data-media-key="${key}"]`) : null;
    selectionAnchor.current = card ? { key: key!, top: card.getBoundingClientRect().top } : null;
    updateSelected(item);
  }, []);
  useLayoutEffect(() => {
    if (isPopup || !selected || !window.matchMedia?.('(min-width: 900px)').matches) return;
    const anchor = selectionAnchor.current;
    if (!anchor) return;
    const card = document.querySelector<HTMLElement>(`[data-media-key="${anchor.key}"]`);
    if (card) window.scrollBy(0, card.getBoundingClientRect().top - anchor.top);
    selectionAnchor.current = null;
  }, [selected, isPopup]);
  const [statusFilter, setStatusFilter] = useState<WatchStatus | 'all'>('all');
  const [section, setSection] = useState<AppSection>(() => sectionFromHash(window.location.hash));
  function changeSection(value: AppSection) {
    setSection(value);
    if (!isPopup && window.location.hash !== `#${value}`) window.history.pushState(null, '', `#${value}`);
  }
  async function openWorkspace(value: AppSection = 'library') {
    try { await browser.tabs.create({ url: `${browser.runtime.getURL('/dashboard.html')}#${value}` }); }
    catch { setError('Sayfa açılamadı. Tekrar dene.'); }
  }
  useEffect(() => {
    document.documentElement.dataset.surface = surface;
    if (isPopup) return;
    const navigate = () => setSection(sectionFromHash(window.location.hash));
    window.addEventListener('hashchange', navigate); window.addEventListener('popstate', navigate);
    return () => { window.removeEventListener('hashchange', navigate); window.removeEventListener('popstate', navigate); };
  }, [surface, isPopup]);
  useEffect(() => { document.title = isPopup ? 'Moviemarks' : `${t(sectionLabels[section])} · Moviemarks`; }, [section, language, isPopup]);
  const [advanced, setAdvanced] = useState({ ...emptyFilters });
  const [sort, setSort] = useState<SortOrder>('addedDesc');
  const [syncing, setSyncing] = useState(false);
  const metadataController = useRef<AbortController | null>(null);
  useEffect(() => () => metadataController.current?.abort(), []);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState('');
  const [collectionPanel, setCollectionPanel] = useState<Media | 'manage' | null>(null);
  const mutationLock = useRef(false);

  useEffect(() => {
    Promise.all([loadLibrary(), loadToken(), loadCollections(), browser.storage.local.get(['libraryView', 'language'])]).then(([items, key, groups, preferences]) => {
      setLibrary(items); setToken(key); setCollections(groups); setView(preferences.libraryView === 'list' ? 'list' : 'grid'); setLanguage(preferences.language);
    }).catch(() => setError("Kayıtlar okunamadı. Uzantıyı yeniden açmayı dene.")).finally(() => setReady(true));
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local') return;
      if (changes.language) setLanguage(changes.language.newValue);
      if (changes.libraryView) setView(changes.libraryView.newValue === 'list' ? 'list' : 'grid');
      if (changes.collections) setCollections((changes.collections.newValue as Collection[]) ?? []);
      if (changes.library) setLibrary((changes.library.newValue as Media[]) ?? []);
      if (changes.tmdbToken) { setToken((changes.tmdbToken.newValue as string) ?? ''); }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  async function toggle(item: Media, addOnly = false) {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true);
    try {
      const current = await loadLibrary();
      const exists = current.some(m => mediaKey(m) === mediaKey(item));
      if (exists && addOnly) return;
      let metadata = {};
      if (!exists && token) { try { metadata = await getFilterMetadata(item, token, new AbortController().signal); } catch { /* Liste ekleme, geçici metadata hatasında da çalışır. */ } }
      const next = exists ? current.filter(m => mediaKey(m) !== mediaKey(item)) : [{ ...item, ...metadata, addedAt: new Date().toISOString(), watchStatus: 'planned' as const }, ...current];
      if (exists) {
        const groups = removeFromCollections(await loadCollections(), mediaKey(item));
        await saveLibraryAndCollections(next, groups); setCollections(groups);
      } else await saveLibrary(next);
      setLibrary(next);
      notify(exists ? '{0} listeden kaldırıldı.' : '{0} listene eklendi.', exists ? 'removed' : 'success', [item.title]);
    } catch { setError("Liste kaydedilemedi. Tekrar dene."); }
    finally { mutationLock.current = false; setBusy(false); }
  }

  async function changeStatus(item: Media, watchStatus: WatchStatus) {
    if (mutationLock.current) return;
    setWatchError(''); setError('');
    mutationLock.current = true; setBusy(true);
    try {
      const current = await loadLibrary();
      const next = current.map(m => mediaKey(m) === mediaKey(item) ? completedUpdate(m, watchStatus) : m);
      await saveLibrary(next); setLibrary(next);
      notify('{0}: {1}', 'updated', [item.title, watchStatuses[watchStatus]]);
    } catch { setError("İzleme durumu kaydedilemedi. Tekrar dene."); setWatchError("İzleme durumu kaydedilemedi. Tekrar dene."); }
    finally { mutationLock.current = false; setBusy(false); }
  }

  async function savePersonal(item: Media, patch: PersonalData): Promise<boolean> {
    if (mutationLock.current) return false;
    const invalid = validatePersonal(patch);
    if (invalid) { setError(invalid); return false; }
    mutationLock.current = true; setBusy(true); setError('');
    try {
      const current = await loadLibrary();
      if (!current.some(m => mediaKey(m) === mediaKey(item))) current.unshift({ ...item, addedAt: new Date().toISOString(), watchStatus: 'planned' });
      const next = current.map(m => mediaKey(m) === mediaKey(item) ? { ...m, ...patch } : m);
      await saveLibrary(next); setLibrary(next);
      const removedRewatch = patch.rewatches && patch.rewatches.length < (current.find(m => mediaKey(m) === mediaKey(item))?.rewatches?.length ?? 0);
      notify(patch.favorite !== undefined ? patch.favorite ? 'Favorilere eklendi.' : 'Favorilerden kaldırıldı.' : 'Kişisel bilgiler güncellendi.', patch.favorite === false || removedRewatch ? 'removed' : patch.favorite === true ? 'success' : 'updated');
      return true;
    } catch { setError("Kişisel bilgiler kaydedilemedi. Tekrar dene."); return false; }
    finally { mutationLock.current = false; setBusy(false); }
  }

  async function saveEpisode(item: Media, action: EpisodeAction, catalog: SeriesCatalog, initialTracking?: EpisodeTracking): Promise<string | null> {
    if (mutationLock.current) return t("Bir kayıt işlemi sürüyor. Tekrar dene.");
    mutationLock.current = true; setBusy(true);
    try {
      const current = await loadLibrary();
      const existing = current.find(m => mediaKey(m) === mediaKey(item));
      if (!existing && !((action.type === 'episode' || action.type === 'season') && action.watched)) return t('Önce izlediğin bir bölümü işaretle.');
      const tracking = { ...defaultTracking(), includeSpecials: initialTracking?.includeSpecials ?? false, spoilerProtection: initialTracking?.spoilerProtection ?? true };
      const base: Media = existing ?? { ...item, addedAt: new Date().toISOString(), watchStatus: 'planned', episodeTracking: tracking };
      const updated = applyEpisodeAction(base, catalog, action);
      if (!existing && !episodeProgress(catalog, updated.episodeTracking!).count) return t('İşaretlenebilecek yayımlanmış bölüm yok.');
      const next = existing ? current.map(m => mediaKey(m) === mediaKey(item) ? updated : m) : [updated, ...current];
      await saveLibrary(next); setLibrary(next); notify(existing ? 'Bölüm ilerlemesi güncellendi.' : '{0} listene eklendi.', existing ? 'updated' : 'success', existing ? undefined : [item.title]); return null;
    } catch { return t("Bölüm ilerlemesi kaydedilemedi. Önceki kayıt korundu; tekrar dene."); }
    finally { mutationLock.current = false; setBusy(false); }
  }

  async function replaceArchive(archive: Archive, reset: boolean): Promise<boolean> {
    if (mutationLock.current) return false;
    mutationLock.current = true; setBusy(true);
    try {
      const next = validateArchive(archive);
      await saveLibraryAndCollections(next.library, next.collections);
      setLibrary(next.library); setCollections(next.collections); setSelected(null); setCollectionPanel(null); setCollectionId('');
      setLibraryQuery(''); setAdvanced({ ...emptyFilters }); setStatusFilter('all'); setFilter('all'); setWatchError(''); setError('');
      notify(reset ? 'Arşiv temizlendi.' : 'Yedek geri yüklendi.', reset ? 'removed' : 'success');
      return true;
    } catch { return false; }
    finally { mutationLock.current = false; setBusy(false); }
  }

  async function refreshMetadata() {
    if (mutationLock.current) return;
    if (!token) { setError("Tür ve yayın bilgileri için TMDB anahtarını ayarlardan ekle."); return; }
    const controller = new AbortController(); metadataController.current = controller;
    mutationLock.current = true; setBusy(true); setSyncing(true); setError('');
    try {
      const current = await loadLibrary();
      const pending = current.filter(m => !m.genres || m.releaseDate === undefined);
      const updates = new Map<string, { genres: string[]; releaseDate: string }>();
      let failed = false;
      for (let i = 0; i < pending.length && !controller.signal.aborted; i += 3) {
        const chunk = pending.slice(i, i + 3);
        const results = await Promise.allSettled(chunk.map(m => getFilterMetadata(m, token, controller.signal)));
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') updates.set(mediaKey(chunk[index]!), result.value);
          else failed = true;
        });
        if (failed) break;
      }
      if (controller.signal.aborted) return;
      const latest = await loadLibrary();
      const next = latest.map(m => ({ ...m, ...updates.get(mediaKey(m)) }));
      if (updates.size) { await saveLibrary(next); setLibrary(next); }
      if (failed) setError("Bazı tür/yayın bilgileri alınamadı. Filtre bölümünden tekrar deneyebilirsin.");
    } catch { if (!controller.signal.aborted) setError("Filtre bilgileri kaydedilemedi. Tekrar dene."); }
    finally { mutationLock.current = false; setBusy(false); setSyncing(false); }
  }

  async function commitCollection(action: CollectionAction, candidate?: Media): Promise<string | null> {
    if (mutationLock.current) return t("Bir kayıt işlemi sürüyor. Biraz sonra tekrar dene.");
    mutationLock.current = true; setBusy(true);
    try {
      const groups = applyCollectionAction(await loadCollections(), action);
      if ((action.type === 'create' && action.mediaKey) || action.type === 'membership') {
        const current = await loadLibrary();
        if (!current.some(m => mediaKey(m) === action.mediaKey)) {
          if (!candidate || mediaKey(candidate) !== action.mediaKey || (action.type === 'membership' && !action.included)) return t("Bu yapım artık kişisel listende değil.");
          const next: Media[] = [{ ...candidate, addedAt: new Date().toISOString(), watchStatus: 'planned' }, ...current];
          await saveLibraryAndCollections(next, groups); setLibrary(next); setCollections(groups); notify('Koleksiyonlar güncellendi.'); return null;
        }
      }
      await saveCollections(groups); setCollections(groups);
      notify('Koleksiyonlar güncellendi.', action.type === 'delete' || action.type === 'membership' && !action.included ? 'removed' : 'updated');
      return null;
    } catch (e) {
      return e instanceof Error && ['Koleksiyon adı 1–80 karakter olmalı.', 'Bu adda bir koleksiyon zaten var.', 'Koleksiyon bulunamadı.'].includes(e.message) ? e.message : t("Koleksiyon kaydedilemedi. Tekrar dene.");
    } finally { mutationLock.current = false; setBusy(false); }
  }

  const selectedSaved = selected ? library.find(m => mediaKey(m) === mediaKey(selected)) : undefined;
  const favorites = library.filter(m => m.favorite);
  const activeCollection = collections.find(c => c.id === collectionId);
  const source = section === 'collections' ? library.filter(m => activeCollection?.mediaKeys.includes(mediaKey(m))) : section === 'favorites' ? favorites : library;
  const items = filterAndSort(source, advanced, sort, libraryQuery, filter, statusFilter);
  const cardMetadata = useCardMetadata(items, isPopup || section === 'statistics' || section === 'calendar' ? '' : token);
  const genreOptions = [...new Set(library.flatMap(m => m.genres ?? []))].sort((a, b) => a.localeCompare(b, 'tr'));
  const filterLabels = { genre: 'Tür', yearFrom: 'Yıl başlangıcı', yearTo: 'Yıl bitişi', ratingSource: 'Puan kaynağı', ratingMin: 'En düşük puan', ratingMax: 'En yüksek puan', releaseFrom: 'Yayın tarihi başlangıcı', releaseTo: 'Yayın tarihi bitişi' };
  const chips: FilterChip[] = (Object.keys(advanced) as (keyof typeof advanced)[]).filter(key => advanced[key] !== emptyFilters[key]).map(key => ({ id: key, label: `${t(filterLabels[key])}: ${key === 'ratingSource' ? t(advanced[key] === 'personal' ? 'Kişisel puanım' : 'TMDB puanı') : t(advanced[key])}`, remove: () => setAdvanced(current => ({ ...current, [key]: emptyFilters[key] })) }));
  if (statusFilter !== 'all') chips.push({ id: 'status', label: t(watchStatuses[statusFilter]), remove: () => setStatusFilter('all') });
  if (filter !== 'all') chips.push({ id: 'type', label: t(filter === 'movie' ? 'Film' : 'Dizi'), remove: () => setFilter('all') });
  if (sort !== 'addedDesc') chips.push({ id: 'sort', label: t(sortOptions[sort]), remove: () => setSort('addedDesc') });
  function resetFilters() { setAdvanced({ ...emptyFilters }); setStatusFilter('all'); setSort('addedDesc'); setFilter('all'); }
  const missingMetadata = library.filter(m => !m.genres || m.releaseDate === undefined).length;
  return <div className={`app-shell ${isPopup ? 'popup-shell' : `workspace-shell ${selected ? 'has-detail-sheet' : ''}`}`}>
    {!isPopup && <WorkspaceSidebar section={section} change={changeSection} libraryCount={library.length} favoriteCount={favorites.length} collections={collections} openCollection={id => { setCollectionId(id); changeSection('collections'); }}/> }
    <div className={isPopup ? 'popup-content' : 'workspace-main'}>
    <div className="surface-topbar">
    {notice && <Toast key={notice.id} notice={notice} dismiss={dismissNotice}/>}
    <header className="app-header">
      <div className={isPopup ? "flex items-center gap-3" : "workspace-heading"}>{isPopup ? <><img className="brand-icon" src="/icons/icon-128.png" width="42" height="42" alt=""/><div><h1>movie<span>marks</span></h1></div></> : <><h1>{t(sectionLabels[section])}</h1><p>{t('{0} yapım · {1} favori', library.length, favorites.length)}</p></>}</div>
      <div className="header-actions flex gap-1"><button className="icon-button" aria-label={theme === 'dark' ? t("Aydınlık temaya geç") : t("Karanlık temaya geç")} title={theme === 'dark' ? t("Aydınlık tema") : t("Karanlık tema")} onClick={() => void changeTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>{isPopup && <button className="icon-button" title={t("Geniş ekranda aç")} aria-label={t("Geniş ekranda aç")} onClick={() => void openWorkspace()}><ExternalLink size={17}/></button>}<button className={`icon-button ${settings ? 'active' : ''}`} title={t("Ayarlar")} aria-label={t("Ayarlar")} onClick={() => setSettings(!settings)}><Settings size={19}/></button></div>
    </header>

    <SearchPanel initialQuery={initialQuery} token={token} library={library} busy={busy} add={item => void toggle(item, true)} openSettings={() => setSettings(true)} openDetails={item => { setWatchError(''); setSelected(item); }} />
    </div>
    {isPopup ? <>{error && <p className="error" role="alert">{t(error)}</p>}<PopupHome library={library} token={token} ready={ready} busy={busy} open={item => { setWatchError(''); setSelected(item); }} openPage={value => void openWorkspace(value)} saveEpisode={saveEpisode} changeStatus={(item, status) => void changeStatus(item, status)}/></> : <>
    {section === 'statistics' ? <StatisticsPanel hideTitle library={library} token={token} open={setSelected}/> : section === 'calendar' ? <EpisodeCalendar library={library} token={token} open={setSelected}/> : <>
    {section === 'library' && ready && <ContinueWatching library={library} token={token} busy={busy} open={item => { setWatchError(''); setSelected(item); }} saveEpisode={saveEpisode} completeMovie={item => void changeStatus(item, 'completed')}/>}
    {section === 'collections' && <div className="collection-navigation"><label className="sr-only" htmlFor="collection-picker">{t("Koleksiyon seç")}</label><Select id="collection-picker" label={t("Koleksiyon seç")} value={activeCollection?.id ?? ''} onChange={setCollectionId} options={[{ value: '', label: t("Koleksiyon seç…") }, ...collections.map(c => ({ value: c.id, label: `${c.name} (${library.filter(m => c.mediaKeys.includes(mediaKey(m))).length})` }))]}/><button className="primary-button" onClick={() => setCollectionPanel('manage')}>{t("Koleksiyonları yönet")}</button></div>}
    <LibraryToolbar query={libraryQuery} setQuery={setLibraryQuery} type={filter} setType={setFilter} view={view} setView={async mode => { try { await browser.storage.local.set({ libraryView: mode }); setView(mode); } catch { setError("Görünüm tercihi kaydedilemedi."); } }} count={items.length} total={source.length} chips={chips} reset={resetFilters} openFilters={() => setFiltersOpen(true)}/>
    {error && <div className="error" role="alert">{t(error)}</div>}
    {!ready ? <div className="empty"><LoaderCircle className="animate-spin"/><p>{t("Listen yükleniyor…")}</p></div> : items.length === 0 ? <div className="empty"><BookMarked size={28}/><h3>{section === 'collections' && !activeCollection ? collections.length ? t("Bir koleksiyon seç") : t("Henüz koleksiyon yok") : section === 'collections' && !source.length ? t("Bu koleksiyon henüz boş") : libraryQuery.trim() ? t("Listende eşleşen yapım yok") : section === 'favorites' && !favorites.length ? t("Henüz favori yok") : library.length ? t("Bu filtrelerde kayıt yok") : t("Kütüphanen henüz boş")}</h3><p>{section === 'collections' && (!activeCollection || !source.length) ? t("Koleksiyon oluşturabilir, kartların işlem menüsünden yapım ekleyebilirsin.") : libraryQuery.trim() ? t("Başka bir ad dene veya liste aramasını temizle.") : section === 'favorites' && !favorites.length ? t("Kalp simgesine basarak favorilerine ekleyebilirsin.") : library.length ? t("Arama veya filtreleri değiştirebilirsin.") : t("Aramadan film veya dizi ekleyebilirsin.")}</p></div> : <main className={`media-grid ${view === 'list' ? 'media-list' : ''}`}>{items.map(item => {
      const info = cardMetadata(item);
      return <article key={mediaKey(item)} data-media-key={mediaKey(item)} className="media-card">
        <div className="media-artwork"><button data-open-details className="poster poster-button" aria-label={t("{0} afişinden detayları aç", item.title)} onClick={() => { setWatchError(''); setSelected(item); }}>
          {item.poster_path && <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt={t("{0} afişi", item.title)} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }}/>}<Film className="poster-placeholder" size={32}/>
          <span className="type-badge">{item.media_type === 'movie' ? <Film size={11}/> : <Tv size={11}/>} {item.media_type === 'movie' ? t("Film") : t("Dizi")}</span>{item.vote_average > 0 && <span className="rating" title={t("TMDB puanı")}><Star size={11} fill="currentColor"/> {item.vote_average.toFixed(1)}</span>}
        </button><div className="card-quick-actions">
          <button className={`favorite-button ${item.favorite ? 'is-favorite' : ''}`} title={item.favorite ? t("Favorilerden çıkar") : t("Favorilere ekle")} aria-label={`${item.title} ${item.favorite ? t("favorilerden çıkar") : t("favorilere ekle")}`} aria-pressed={!!item.favorite} disabled={busy} onClick={() => void savePersonal(item, { favorite: !item.favorite })}><Heart size={16} fill={item.favorite ? 'currentColor' : 'none'}/></button>
          <CardActions title={item.title} disabled={busy} details={() => { setWatchError(''); setSelected(item); }} collections={() => setCollectionPanel(item)} remove={() => void toggle(item)}/>
        </div></div>
        <div className="card-content"><h3 title={item.title}><button data-open-details className="title-button" onClick={() => { setWatchError(''); setSelected(item); }}>{item.title}</button></h3><div className="card-metadata"><span>{item.year || t("Tarih bilinmiyor")}</span>{item.personalRating != null && <span className="personal-score" title={t("Kişisel puanın")}><Star size={11}/> {item.personalRating}/10</span>}{item.notes && <StickyNote size={12} aria-label={t("Kişisel notun var")}/>}</div>
          <div className="card-runtime">{item.media_type === 'movie' ? info.runtime ? <><Clock3 size={12}/>{info.runtime} {t('dk')}</> : null : info.seasonCount != null ? <><Tv size={12}/>{t('{0} sezon', info.seasonCount)}</> : null}</div>
          <div className="card-bottom"><WatchStatusSelect compact title={item.title} value={getWatchStatus(item)} disabled={busy} onChange={status => void changeStatus(item, status)} /></div>
        </div>
      </article>;
    })}</main>}
    </>}
    </>}
    {filtersOpen && <AdvancedFilters reset={resetFilters} close={() => setFiltersOpen(false)} status={statusFilter} setStatus={setStatusFilter} value={advanced} change={setAdvanced} sort={sort} setSort={setSort} genres={genreOptions} missing={missingMetadata} syncing={syncing} refresh={() => void refreshMetadata()}/>}
    {themeError && <p className="error" role="alert">{t(themeError)}</p>}
    {selected && <DetailPanel presentation={isPopup ? 'modal' : 'sheet'} item={selected} token={token} inLibrary={!!selectedSaved} onAdd={() => void toggle(selected, true)} onFavorite={() => savePersonal(selected, { favorite: !selectedSaved?.favorite })} watchStatus={getWatchStatus(library.find(m => mediaKey(m) === mediaKey(selected)) ?? selected)} busy={busy} onStatusChange={status => void changeStatus(selected, status)} onEpisodeSave={(action, catalog, initialTracking) => saveEpisode(selected, action, catalog, initialTracking)} statusError={watchError} collections={collections} onCollectionChange={action => commitCollection(action, selected)} personalItem={library.find(m => mediaKey(m) === mediaKey(selected)) ?? selected} onPersonalSave={patch => savePersonal(selected, patch)} close={() => setSelected(null)} />}
    {collectionPanel && <CollectionsPanel collections={collections} busy={busy} commit={commitCollection} item={collectionPanel === 'manage' ? undefined : library.find(m => mediaKey(m) === mediaKey(collectionPanel)) ?? collectionPanel} close={() => setCollectionPanel(null)}/>}
    {settings && <SettingsPanel archiveBusy={busy} onArchiveReplace={replaceArchive} languageError={languageError} onLanguageChange={value => void changeLanguage(value)} token={token} theme={theme} themeError={themeError} onThemeChange={value => void changeTheme(value)} close={() => setSettings(false)} saved={key => { setToken(key); notify('Ayarlar kaydedildi.', 'success'); }} />}
    {!isPopup && <><footer><span>MOVIEMARKS</span><a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">{t("Veriler: TMDB ↗")}</a></footer><p className="attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></>}
    </div>
  </div>;
}

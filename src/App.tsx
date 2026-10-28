import { useEffect, useRef, useState } from 'react';
import { BookMarked, CalendarDays, ExternalLink, Heart, Layers, FolderPlus, Film, LoaderCircle, Search, Settings, Star, StickyNote, SlidersHorizontal, Sun, Moon, Trash2, Tv, X } from 'lucide-react';
import { browser } from 'wxt/browser';
import { getFilterMetadata, mediaKey, type Media } from './tmdb';
import SearchPanel from './SearchPanel';
import Select from './Select';
import { useTheme } from './useTheme';
import EpisodeCalendar from './EpisodeCalendar';
import { applyEpisodeAction, type EpisodeAction, type SeriesCatalog } from './episodes';
import CollectionsPanel from './CollectionsPanel';
import { applyCollectionAction, removeFromCollections, type Collection, type CollectionAction } from './collections';
import AdvancedFilters from './AdvancedFilters';
import { emptyFilters, filterAndSort, type SortOrder } from './libraryFilters';
import DetailPanel from './DetailPanel';
import SettingsPanel from './SettingsPanel';
import WatchStatusSelect from './WatchStatusSelect';
import { getWatchStatus, watchStatuses, type WatchStatus } from './watchStatus';
import { loadLibrary, loadToken, saveLibrary, loadCollections, saveCollections, saveLibraryAndCollections } from './storage';
import { completedUpdate, validatePersonal, type PersonalData } from './personal';

export default function App() {
  const { theme, changeTheme, themeError } = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [library, setLibrary] = useState<Media[]>([]);
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [watchError, setWatchError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [selected, setSelected] = useState<Media | null>(null);
  const [statusFilter, setStatusFilter] = useState<WatchStatus | 'all'>('all');
  const [section, setSection] = useState<'library' | 'favorites' | 'collections' | 'calendar'>('library');
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
    Promise.all([loadLibrary(), loadToken(), loadCollections()]).then(([items, key, groups]) => {
      setLibrary(items); setToken(key); setCollections(groups);
    }).catch(() => setError('Kayıtlar okunamadı. Uzantıyı yeniden açmayı dene.')).finally(() => setReady(true));
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local') return;
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
      setNotice(exists ? `${item.title} listeden kaldırıldı.` : `${item.title} listene eklendi.`);
    } catch { setError('Liste kaydedilemedi. Tekrar dene.'); }
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
      setNotice(`${item.title}: ${watchStatuses[watchStatus]}`);
    } catch { setError('İzleme durumu kaydedilemedi. Tekrar dene.'); setWatchError('İzleme durumu kaydedilemedi. Tekrar dene.'); }
    finally { mutationLock.current = false; setBusy(false); }
  }

  async function savePersonal(item: Media, patch: PersonalData): Promise<boolean> {
    if (mutationLock.current) return false;
    const invalid = validatePersonal(patch);
    if (invalid) { setError(invalid); return false; }
    mutationLock.current = true; setBusy(true); setError('');
    try {
      const current = await loadLibrary();
      if (!current.some(m => mediaKey(m) === mediaKey(item))) throw new Error('missing');
      const next = current.map(m => mediaKey(m) === mediaKey(item) ? { ...m, ...patch } : m);
      await saveLibrary(next); setLibrary(next);
      return true;
    } catch { setError('Kişisel bilgiler kaydedilemedi. Tekrar dene.'); return false; }
    finally { mutationLock.current = false; setBusy(false); }
  }

  async function saveEpisode(item: Media, action: EpisodeAction, catalog: SeriesCatalog): Promise<string | null> {
    if (mutationLock.current) return 'Bir kayıt işlemi sürüyor. Tekrar dene.';
    mutationLock.current = true; setBusy(true);
    try {
      const current = await loadLibrary();
      const existing = current.find(m => mediaKey(m) === mediaKey(item));
      if (!existing) return 'Bu dizi artık kişisel listende değil.';
      const updated = applyEpisodeAction(existing, catalog, action);
      const next = current.map(m => mediaKey(m) === mediaKey(item) ? updated : m);
      await saveLibrary(next); setLibrary(next); return null;
    } catch { return 'Bölüm ilerlemesi kaydedilemedi. Önceki kayıt korundu; tekrar dene.'; }
    finally { mutationLock.current = false; setBusy(false); }
  }

  async function refreshMetadata() {
    if (mutationLock.current) return;
    if (!token) { setError('Tür ve yayın bilgileri için TMDB anahtarını ayarlardan ekle.'); return; }
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
      if (failed) setError('Bazı tür/yayın bilgileri alınamadı. Filtre bölümünden tekrar deneyebilirsin.');
    } catch { if (!controller.signal.aborted) setError('Filtre bilgileri kaydedilemedi. Tekrar dene.'); }
    finally { mutationLock.current = false; setBusy(false); setSyncing(false); }
  }

  async function commitCollection(action: CollectionAction): Promise<string | null> {
    if (mutationLock.current) return 'Bir kayıt işlemi sürüyor. Biraz sonra tekrar dene.';
    mutationLock.current = true; setBusy(true);
    try {
      if ((action.type === 'create' && action.mediaKey) || action.type === 'membership') {
        const current = await loadLibrary();
        if (!current.some(m => mediaKey(m) === action.mediaKey)) return 'Bu yapım artık kişisel listende değil.';
      }
      const groups = applyCollectionAction(await loadCollections(), action);
      await saveCollections(groups); setCollections(groups);
      return null;
    } catch (e) {
      return e instanceof Error && ['Koleksiyon adı 1–80 karakter olmalı.', 'Bu adda bir koleksiyon zaten var.', 'Koleksiyon bulunamadı.'].includes(e.message) ? e.message : 'Koleksiyon kaydedilemedi. Tekrar dene.';
    } finally { mutationLock.current = false; setBusy(false); }
  }

  const favorites = library.filter(m => m.favorite);
  const activeCollection = collections.find(c => c.id === collectionId);
  const source = section === 'collections' ? library.filter(m => activeCollection?.mediaKeys.includes(mediaKey(m))) : section === 'favorites' ? favorites : library;
  const items = filterAndSort(source, advanced, sort, libraryQuery, filter, statusFilter);
  const genreOptions = [...new Set(library.flatMap(m => m.genres ?? []))].sort((a, b) => a.localeCompare(b, 'tr'));
  const activeFilterCount = Object.entries(advanced).filter(([key, value]) => key !== 'ratingSource' && value !== '').length + (statusFilter !== 'all' ? 1 : 0) + (sort !== 'addedDesc' ? 1 : 0);
  const missingMetadata = library.filter(m => !m.genres || m.releaseDate === undefined).length;
  return <div className="app-shell">
    <header className="app-header">
      <div className="flex items-center gap-3"><img className="brand-icon" src="/icons/icon-128.png" width="42" height="42" alt=""/><div><h1>movie<span>marks</span></h1></div></div>
      <div className="flex gap-1"><button className="icon-button" aria-label={theme === 'dark' ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'} title={theme === 'dark' ? 'Aydınlık tema' : 'Karanlık tema'} onClick={() => void changeTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button" title="Geniş ekranda aç" aria-label="Geniş ekranda aç" onClick={() => void browser.tabs.create({ url: browser.runtime.getURL('/popup.html') })}><ExternalLink size={17}/></button><button className={`icon-button ${settings ? 'active' : ''}`} title="Ayarlar" aria-label="Ayarlar" onClick={() => setSettings(!settings)}><Settings size={19}/></button></div>
    </header>

    <SearchPanel token={token} library={library} busy={busy} add={item => void toggle(item, true)} openSettings={() => setSettings(true)} />
    <nav className="library-sections" aria-label="Kütüphane bölümleri">
      <button aria-current={section === 'library' ? 'page' : undefined} className={section === 'library' ? 'selected' : ''} onClick={() => setSection('library')}><BookMarked size={16}/>Kütüphane <span>{library.length}</span></button>
      <button aria-current={section === 'favorites' ? 'page' : undefined} className={section === 'favorites' ? 'selected' : ''} onClick={() => setSection('favorites')}><Heart size={16}/>Favoriler <span>{favorites.length}</span></button>
      <button aria-current={section === 'collections' ? 'page' : undefined} className={section === 'collections' ? 'selected' : ''} onClick={() => setSection('collections')}><Layers size={16}/>Koleksiyonlar <span>{collections.length}</span></button>
      <button aria-current={section === 'calendar' ? 'page' : undefined} className={section === 'calendar' ? 'selected' : ''} onClick={() => setSection('calendar')}><CalendarDays size={16}/>Takvim</button>
    </nav>
    {section === 'calendar' ? <EpisodeCalendar library={library} token={token} open={setSelected}/> : <>
    {section === 'collections' && <div className="collection-navigation"><label className="sr-only" htmlFor="collection-picker">Koleksiyon seç</label><Select id="collection-picker" label="Koleksiyon seç" value={activeCollection?.id ?? ''} onChange={setCollectionId} options={[{ value: '', label: 'Koleksiyon seç…' }, ...collections.map(c => ({ value: c.id, label: `${c.name} (${library.filter(m => c.mediaKeys.includes(mediaKey(m))).length})` }))]}/><button className="primary-button" onClick={() => setCollectionPanel('manage')}>Koleksiyonları yönet</button></div>}
    <div className="library-toolbar"><div className="search-box library-search"><Search size={16}/><input aria-label="Kütüphanede ara" placeholder="Kütüphanede ara…" value={libraryQuery} onChange={e => setLibraryQuery(e.target.value)}/>{libraryQuery && <button className="icon-button" aria-label="Liste aramasını temizle" onClick={() => setLibraryQuery('')}><X size={16}/></button>}</div>
    <div className="filters" aria-label="İçerik tipi">{(['all', 'movie', 'tv'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={filter === f ? 'selected' : ''}>{f === 'movie' && <Film size={13}/>} {f === 'tv' && <Tv size={13}/>} {f === 'all' ? 'Tümü' : f === 'movie' ? 'Film' : 'Dizi'}</button>)}</div></div>
    <div className="refine-toolbar"><span>{items.length} / {source.length} yapım{statusFilter !== 'all' ? ` · ${watchStatuses[statusFilter]}` : ''}</span><button className={`filter-open ${activeFilterCount ? 'active' : ''}`} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={14}/>Filtrele ve sırala{activeFilterCount > 0 && <span aria-hidden="true">{activeFilterCount}</span>}</button></div>
    {error && <div className="error" role="alert">{error}</div>}
    {notice && <div className="notice" role="status">{notice}<button aria-label="Bildirimi kapat" onClick={() => setNotice('')}><X size={14}/></button></div>}
    {!ready ? <div className="empty"><LoaderCircle className="animate-spin"/><p>Listen yükleniyor…</p></div> : items.length === 0 ? <div className="empty"><BookMarked size={28}/><h3>{section === 'collections' && !activeCollection ? collections.length ? 'Bir koleksiyon seç' : 'Henüz koleksiyon yok' : section === 'collections' && !source.length ? 'Bu koleksiyon henüz boş' : libraryQuery.trim() ? 'Listende eşleşen yapım yok' : section === 'favorites' && !favorites.length ? 'Henüz favori yok' : library.length ? 'Bu filtrelerde kayıt yok' : 'Kütüphanen henüz boş'}</h3><p>{section === 'collections' && (!activeCollection || !source.length) ? 'Koleksiyon oluşturabilir, kartlardaki koleksiyon düğmesiyle yapım ekleyebilirsin.' : libraryQuery.trim() ? 'Başka bir ad dene veya liste aramasını temizle.' : section === 'favorites' && !favorites.length ? 'Kalp simgesine basarak favorilerine ekleyebilirsin.' : library.length ? 'Arama veya filtreleri değiştirebilirsin.' : 'Aramadan film veya dizi ekleyebilirsin.'}</p></div> : <main className="media-grid">{items.map(item => {
      return <article key={mediaKey(item)} className="media-card">
        <div className="media-artwork"><button className="poster poster-button" aria-label={`${item.title} afişinden detayları aç`} onClick={() => { setWatchError(''); setSelected(item); }}>
          {item.poster_path && <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt={`${item.title} afişi`} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }}/>}<Film className="poster-placeholder" size={32}/>
          <span className="type-badge">{item.media_type === 'movie' ? <Film size={11}/> : <Tv size={11}/>} {item.media_type === 'movie' ? 'Film' : 'Dizi'}</span>{item.vote_average > 0 && <span className="rating" title="TMDB puanı"><Star size={11} fill="currentColor"/> {item.vote_average.toFixed(1)}</span>}
        </button><div className="card-quick-actions">
          <button className={`favorite-button ${item.favorite ? 'is-favorite' : ''}`} title={item.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} aria-label={`${item.title} ${item.favorite ? 'favorilerden çıkar' : 'favorilere ekle'}`} aria-pressed={!!item.favorite} disabled={busy} onClick={() => void savePersonal(item, { favorite: !item.favorite })}><Heart size={16} fill={item.favorite ? 'currentColor' : 'none'}/></button>
          <button className="favorite-button" title="Koleksiyona ekle" aria-label={`${item.title} koleksiyonlarını düzenle`} disabled={busy} onClick={() => setCollectionPanel(item)}><FolderPlus size={16}/></button>
        </div></div>
        <div className="card-content"><h3 title={item.title}><button className="title-button" onClick={() => { setWatchError(''); setSelected(item); }}>{item.title}</button></h3><div className="card-metadata"><span>{item.year || 'Tarih bilinmiyor'}</span>{item.personalRating != null && <span className="personal-score" title="Kişisel puanın"><Star size={11}/> {item.personalRating}/10</span>}{item.notes && <StickyNote size={12} aria-label="Kişisel notun var"/>}</div>
          <div className="card-bottom"><WatchStatusSelect title={item.title} value={getWatchStatus(item)} disabled={busy} onChange={status => void changeStatus(item, status)} /><button className="card-remove icon-button" title="Listeden kaldır" disabled={busy} onClick={() => void toggle(item)} aria-label={`${item.title} listeden kaldır`}><Trash2 size={14}/></button></div>
        </div>
      </article>;
    })}</main>}
    </>}
    {filtersOpen && <AdvancedFilters close={() => setFiltersOpen(false)} status={statusFilter} setStatus={setStatusFilter} value={advanced} change={setAdvanced} sort={sort} setSort={setSort} genres={genreOptions} missing={missingMetadata} syncing={syncing} refresh={() => void refreshMetadata()}/>}
    {themeError && <p className="error" role="alert">{themeError}</p>}
    {selected && <DetailPanel key={mediaKey(selected)} item={selected} token={token} watchStatus={getWatchStatus(library.find(m => mediaKey(m) === mediaKey(selected)) ?? selected)} busy={busy} onStatusChange={status => void changeStatus(selected, status)} onEpisodeSave={(action, catalog) => saveEpisode(selected, action, catalog)} statusError={watchError} collections={collections} onCollectionChange={commitCollection} personalItem={library.find(m => mediaKey(m) === mediaKey(selected)) ?? selected} onPersonalSave={patch => savePersonal(selected, patch)} close={() => setSelected(null)} />}
    {collectionPanel && <CollectionsPanel collections={collections} busy={busy} commit={commitCollection} item={collectionPanel === 'manage' ? undefined : library.find(m => mediaKey(m) === mediaKey(collectionPanel)) ?? collectionPanel} close={() => setCollectionPanel(null)}/>}
    {settings && <SettingsPanel token={token} theme={theme} themeError={themeError} onThemeChange={value => void changeTheme(value)} close={() => setSettings(false)} saved={key => { setToken(key); setNotice('Ayarlar kaydedildi.'); }} />}
    <footer><span>MOVIEMARKS</span><a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">Veriler: TMDB ↗</a></footer><p className="attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
  </div>;
}

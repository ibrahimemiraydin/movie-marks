import { BarChart3, BookMarked, CalendarDays, Film, Heart, Layers, LoaderCircle } from 'lucide-react';
import ContinueWatching from './ContinueWatching';
import WatchStatusSelect from './WatchStatusSelect';
import { filterAndSort, emptyFilters } from './libraryFilters';
import { mediaKey, type Media } from './tmdb';
import { getWatchStatus, type WatchStatus } from './watchStatus';
import type { AppSection } from './navigation';
import type { SaveEpisode } from './SeriesTracker';
import { t } from './i18n';

export default function PopupHome({ library, token, ready, busy, open, openPage, saveEpisode, changeStatus }: {
  library: Media[]; token: string; ready: boolean; busy: boolean; open: (item: Media) => void;
  openPage: (section: AppSection) => void; changeStatus: (item: Media, status: WatchStatus) => void;
  saveEpisode: (item: Media, ...args: Parameters<SaveEpisode>) => ReturnType<SaveEpisode>;
}) {
  const recent = filterAndSort(library, emptyFilters, 'addedDesc').slice(0, 2);
  return <div className="popup-home">
    {!ready ? <div className="empty"><LoaderCircle className="animate-spin"/><p>{t('Listen yükleniyor…')}</p></div> : <>
      <ContinueWatching library={library} token={token} busy={busy} open={open} saveEpisode={saveEpisode} completeMovie={item => changeStatus(item, 'completed')}/>
      <section className="popup-recent" aria-labelledby="popup-recent-title"><div className="popup-section-heading"><h2 id="popup-recent-title">{t('Son eklenenler')}</h2><button className="popup-library-link" onClick={() => openPage('library')}><BookMarked size={13}/>{t('Kütüphane')}<span>{library.length}</span></button></div>
        {!recent.length ? <div className="popup-empty"><BookMarked size={24}/><p>{t('Kütüphanen henüz boş')}</p><small>{t('Aramadan film veya dizi ekleyebilirsin.')}</small></div> : <div className="popup-recent-list">{recent.map(item => <article className="popup-recent-row" key={mediaKey(item)}>
          <button className="popup-recent-poster" aria-label={t('{0} son eklenen detaylarını aç', item.title)} onClick={() => open(item)}>{item.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" loading="lazy"/> : <Film size={17}/>}</button>
          <div><button className="title-button" onClick={() => open(item)}>{item.title}</button><small>{t(item.media_type === 'movie' ? 'Film' : 'Dizi')}{item.year ? ` · ${item.year}` : ''}</small></div>
          <WatchStatusSelect title={item.title} value={getWatchStatus(item)} disabled={busy} onChange={status => changeStatus(item, status)}/>
        </article>)}</div>}
      </section>
    </>}
    <nav className="popup-shortcuts" aria-label={t('Geniş sayfa kısayolları')}>{[{ id: 'favorites', label: 'Favoriler', icon: Heart }, { id: 'collections', label: 'Koleksiyonlar', icon: Layers }, { id: 'calendar', label: 'Takvim', icon: CalendarDays }, { id: 'statistics', label: 'İstatistikler', icon: BarChart3 }].map(({ id, label, icon: Icon }) => <button key={id} onClick={() => openPage(id as AppSection)}><Icon size={15}/>{t(label)}</button>)}</nav>
  </div>;
}

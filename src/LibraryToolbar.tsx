import { Film, LayoutGrid, List, RotateCcw, Search, SlidersHorizontal, Tv, X } from 'lucide-react';
import Button from './ui/Button';
import { t } from './i18n';

export type FilterChip = { id: string; label: string; remove: () => void };
export default function LibraryToolbar({ query, setQuery, type, setType, view, setView, count, total, chips, reset, openFilters }: {
  query: string; setQuery: (query: string) => void; type: 'all' | 'movie' | 'tv'; setType: (type: 'all' | 'movie' | 'tv') => void;
  view: 'grid' | 'list'; setView: (view: 'grid' | 'list') => void; count: number; total: number; chips: FilterChip[]; reset: () => void; openFilters: () => void;
}) {
  return <section className="library-controls" aria-label={t('Kütüphane araçları')}>
    <div className="toolbar-main"><div className="search-box library-search"><Search size={17}/><input aria-label={t('Kütüphanede ara')} placeholder={t('Kütüphanede ara…')} value={query} onChange={event => setQuery(event.target.value)}/>{query && <Button variant="ghost" size="icon" aria-label={t('Liste aramasını temizle')} onClick={() => setQuery('')}><X size={15}/></Button>}</div>
      <div className="filters" aria-label={t('İçerik tipi')}>{(['all', 'movie', 'tv'] as const).map(value => <button key={value} aria-pressed={type === value} className={type === value ? 'selected' : ''} onClick={() => setType(value)}>{value === 'movie' && <Film size={14}/>} {value === 'tv' && <Tv size={14}/>} {t(value === 'all' ? 'Tümü' : value === 'movie' ? 'Film' : 'Dizi')}</button>)}</div>
      <div className="refine-actions"><div className="view-switch" role="group" aria-label={t('Görünüm')}>{(['grid', 'list'] as const).map(mode => <Button key={mode} size="icon" variant="ghost" aria-label={t(mode === 'grid' ? 'Kart görünümü' : 'Liste görünümü')} title={t(mode === 'grid' ? 'Kart görünümü' : 'Liste görünümü')} aria-pressed={view === mode} onClick={() => setView(mode)}>{mode === 'grid' ? <LayoutGrid size={16}/> : <List size={16}/>}</Button>)}</div>
        <Button className={`filter-open ${chips.length ? 'active' : ''}`} onClick={openFilters}><SlidersHorizontal size={16}/>{t('Filtrele ve sırala')}{chips.length > 0 && <span className="filter-count" aria-hidden="true">{chips.length}</span>}</Button>
        {chips.length > 0 && <Button size="icon" variant="ghost" className="filter-reset" aria-label={t('Filtreleri sıfırla')} title={t('Filtreleri sıfırla')} onClick={reset}><RotateCcw size={16}/></Button>}
      </div>
    </div>
    <div className="toolbar-meta"><span>{t('{0} / {1} yapım', count, total)}</span>{chips.length > 0 && <div className="filter-chips" aria-label={t('Etkin filtreler')}>{chips.map(chip => <button key={chip.id} title={chip.label} aria-label={t('{0} filtresini kaldır', chip.label)} onClick={chip.remove}><span>{chip.label}</span><X size={12}/></button>)}</div>}</div>
  </section>;
}

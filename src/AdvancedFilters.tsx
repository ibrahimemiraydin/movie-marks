import { useEffect, useRef } from 'react';
import Select from './Select';
import { useModal, isBackdropClick } from './useModal';
import { watchStatuses, type WatchStatus } from './watchStatus';
import { X } from 'lucide-react';
import { emptyFilters, sortOptions, type LibraryFilters, type SortOrder } from './libraryFilters';
export default function AdvancedFilters({ value, change, sort, setSort, genres, missing, syncing, refresh, close, status, setStatus }: {
  value: LibraryFilters; change: (value: LibraryFilters) => void; sort: SortOrder; setSort: (sort: SortOrder) => void;
  close: () => void; status: WatchStatus | 'all'; setStatus: (status: WatchStatus | 'all') => void;
  genres: string[]; missing: number; syncing: boolean; refresh: () => void;
}) {
  const attempted = useRef(false);
  const dialog = useModal();
  useEffect(() => { if (missing > 0 && !syncing && !attempted.current) { attempted.current = true; refresh(); } }, [missing, syncing, refresh]);
  function field(key: keyof LibraryFilters, val: string) { change({ ...value, [key]: val }); }
  return <dialog ref={dialog} className="detail-dialog filter-dialog" aria-labelledby="filters-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (isBackdropClick(e)) close(); }}><div className="detail-topbar"><h2 id="filters-title">Filtre ve sıralama</h2><button autoFocus className="icon-button" aria-label="Filtre panelini kapat" onClick={close}><X size={20}/></button></div><div className="filter-body"><div className="advanced-grid">
    <label>İzleme durumu<Select label="İzleme durumu" value={status} onChange={value => setStatus(value as WatchStatus | 'all')} options={[{ value: 'all', label: 'Tüm durumlar' }, ...Object.entries(watchStatuses).map(([value,label]) => ({ value,label }))]}/></label>

    <label>Tür<Select label="Tür" value={value.genre} onChange={value => field('genre', value)} options={[{ value: '', label: 'Tüm türler' }, ...genres.map(label => ({ value: label, label }))]}/></label>
    <label>Sıralama<Select label="Sıralama" value={sort} onChange={value => setSort(value as SortOrder)} options={Object.entries(sortOptions).map(([value,label]) => ({ value,label }))}/></label>
    <label>Puan kaynağı<Select label="Puan kaynağı" value={value.ratingSource} onChange={value => field('ratingSource', value)} options={[{ value:'tmdb', label:'TMDB puanı' }, { value:'personal', label:'Kişisel puanım' }]}/></label>
    <label>Yıl başlangıcı<input type="number" min="1800" max="9999" value={value.yearFrom} onChange={e => field('yearFrom', e.target.value)}/></label>
    <label>Yıl bitişi<input type="number" min="1800" max="9999" value={value.yearTo} onChange={e => field('yearTo', e.target.value)}/></label>
    <label>En düşük puan<input type="number" min="0" max="10" step="0.1" value={value.ratingMin} onChange={e => field('ratingMin', e.target.value)}/></label>
    <label>En yüksek puan<input type="number" min="0" max="10" step="0.1" value={value.ratingMax} onChange={e => field('ratingMax', e.target.value)}/></label>
    <label>Yayın tarihi başlangıcı<input type="date" value={value.releaseFrom} onChange={e => field('releaseFrom', e.target.value)}/></label>
    <label>Yayın tarihi bitişi<input type="date" value={value.releaseTo} onChange={e => field('releaseTo', e.target.value)}/></label>
  </div>{(value.yearFrom && value.yearTo && Number(value.yearFrom) > Number(value.yearTo) || value.ratingMin && value.ratingMax && Number(value.ratingMin) > Number(value.ratingMax) || value.releaseFrom && value.releaseTo && value.releaseFrom > value.releaseTo) && <p className="error">Başlangıç değeri bitiş değerinden büyük olamaz.</p>}
    <p className="filter-note">Filtreler anında uygulanır. Puan sıralaması seçilen puan kaynağını kullanır.</p>
    <div className="advanced-actions"><button type="button" onClick={() => { change({ ...emptyFilters }); setSort('addedDesc'); setStatus('all'); }}>Filtreleri sıfırla</button>{missing > 0 && <button type="button" disabled={syncing} onClick={refresh}>{syncing ? 'Bilgiler tamamlanıyor…' : `${missing} yapımın tür/tarih bilgisini tamamla`}</button>}</div>
    {missing > 0 && <p className="filter-note">Eksik tür/tarih bilgileri TMDB’den tamamlanır. Bilinmeyen bilgiler etkin filtreyle eşleşmez.</p>}
    <div className="filter-done"><button className="primary-button" onClick={close}>Sonuçları göster</button></div></div></dialog>;
}

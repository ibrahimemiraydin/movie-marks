import { useState } from 'react';
import { ChevronLeft, ChevronRight, Film, Sparkles, Star, X } from 'lucide-react';
import { isBackdropClick, useModal } from './useModal';
import { formatWatchTime, type buildStatistics } from './statistics';
import { locale, t, useLanguage } from './i18n';

export default function YearReview({ stats, year, close }: { stats: ReturnType<typeof buildStatistics>; year: number; close: () => void }) {
  const language = useLanguage();
  const dialog = useModal(); const [page, setPage] = useState(0);
  const best = stats.yearHighestRated[0];
  const month = stats.busiestMonth ? new Date(2024, stats.busiestMonth.month - 1, 15).toLocaleDateString(locale(), { month: 'long' }) : '—';
  const titles = ['Senin sinema yılın', 'Yılın favori türü', 'Yılının yıldızları', 'En yüksek kişisel puanın', 'İzleme ritmin'];
  return <dialog ref={dialog} className="detail-dialog year-review-dialog" aria-labelledby="year-review-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (isBackdropClick(event)) close(); }} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); setPage(value => Math.max(0, Math.min(4, value + (event.key === 'ArrowRight' ? 1 : -1)))); } }}>
    <div className="detail-topbar"><h2 id="year-review-title">{t('{0} yıl özeti', year)}</h2><button autoFocus className="icon-button" aria-label={t('Yıl özetini kapat')} onClick={close}><X size={20}/></button></div>
    <div className={`year-review-slide year-review-slide-${page}`} aria-live="polite"><span className="review-kicker"><Sparkles size={14}/>MOVIEMARKS · {year}</span><h3>{t(titles[page]!)}</h3>
      {page === 0 && <><strong className="review-big">{stats.annual.movieWatches}<small>{t('film izleme')}</small></strong><div className="review-numbers"><span><b>{stats.annual.series}</b>{t('İzlenen dizi')}</span><span><b>{stats.annual.episodes}</b>{t('bölüm izleme')}</span><span><b>{formatWatchTime(stats.annual.minutes, language)}</b>{t('bilinen izleme süresi')}</span></div><p>{t('Bu yılki kayıtların; tekrar izlemeler dahil.')}</p></>}
      {page === 1 && <><strong className="review-word">{stats.annual.genres[0] ? t(stats.annual.genres[0].name) : t('Henüz yeterli bilgi yok.')}</strong><div className="review-pills">{stats.annual.genres.slice(0, 3).map(genre => <span key={genre.id}>{t(genre.name)} · {genre.count}</span>)}</div><p>{t('O yıl izlediğin farklı yapımların türlerine göre.')}</p></>}
      {page === 2 && <div className="review-people"><div><small>{t('Oyuncu')}</small><strong>{stats.annual.actors[0]?.name ?? '—'}</strong><span>{t('{0} yapım', stats.annual.actors[0]?.count ?? 0)}</span></div><div><small>{t('Yönetmen')}</small><strong>{stats.annual.directors[0]?.name ?? '—'}</strong><span>{t('{0} yapım', stats.annual.directors[0]?.count ?? 0)}</span></div></div>}
      {page === 3 && (best ? <div className="review-favorite">{best.poster_path ? <img src={`https://image.tmdb.org/t/p/w342${best.poster_path}`} alt=""/> : <Film size={60}/>}<strong>{best.title}</strong><span><Star size={20} fill="currentColor"/>{best.personalRating}/10</span><p>{t('Bu yıl izlediğin yapımlar arasından; güncel kişisel puanına göre.')}</p></div> : <p>{t('Bu yıl izlediğin yapımlara henüz puan vermedin.')}</p>)}
      {page === 4 && <><strong className="review-word">{month}</strong><p>{t('En hareketli ayın')}</p><div className="review-numbers"><span><b>{stats.activeDays}</b>{t('aktif gün')}</span><span><b>{stats.longestStreak}</b>{t('günlük en uzun seri')}</span></div></>}
      {(stats.annual.missingRuntime > 0 || stats.overall.undated > 0) && <small className="review-coverage">{t('Tarihsiz kayıtlar bu özete, süresi bilinmeyen izlemeler süreye dahil değildir.')}</small>}
    </div>
    <div className="review-navigation"><button className="secondary-button" disabled={page === 0} aria-label={t('Önceki sayfa')} onClick={() => setPage(value => value - 1)}><ChevronLeft size={17}/></button><div>{titles.map((title, index) => <button key={title} aria-label={t('Özet sayfası {0}', index + 1)} aria-current={page === index ? 'step' : undefined} onClick={() => setPage(index)}/>)}</div><button className="secondary-button" disabled={page === 4} aria-label={t('Sonraki sayfa')} onClick={() => setPage(value => value + 1)}><ChevronRight size={17}/></button></div>
  </dialog>;
}

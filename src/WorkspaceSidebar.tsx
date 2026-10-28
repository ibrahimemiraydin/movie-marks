import { BarChart3, BookMarked, CalendarDays, Folder, Heart, Layers } from 'lucide-react';
import type { Collection } from './collections';
import { sectionLabels, type AppSection } from './navigation';
import { t } from './i18n';

export default function WorkspaceSidebar({ section, change, libraryCount, favoriteCount, collections, openCollection }: {
  section: AppSection; change: (section: AppSection) => void; libraryCount: number; favoriteCount: number;
  collections: Collection[]; openCollection: (id: string) => void;
}) {
  const entries = [{ id: 'library', icon: BookMarked, count: libraryCount }, { id: 'favorites', icon: Heart, count: favoriteCount }, { id: 'collections', icon: Layers, count: collections.length }, { id: 'calendar', icon: CalendarDays }, { id: 'statistics', icon: BarChart3 }] as const;
  return <aside className="workspace-sidebar">
    <button className="sidebar-brand" aria-label={t('Moviemarks ana sayfa')} onClick={() => change('library')}><img className="brand-icon" src="/icons/icon-128.png" width="36" height="36" alt=""/><strong>movie<span>marks</span></strong></button>
    <nav className="workspace-nav" aria-label={t('Kütüphane bölümleri')}>{entries.map(({ id, icon: Icon, ...entry }) => <button key={id} title={t(sectionLabels[id])} aria-label={`${t(sectionLabels[id])}${'count' in entry ? ` ${entry.count}` : ''}`} aria-current={section === id ? 'page' : undefined} className={section === id ? 'selected' : ''} onClick={() => change(id)}><Icon size={18}/><span className="nav-label">{t(sectionLabels[id])}</span>{'count' in entry && <span className="nav-count" aria-hidden="true">{entry.count}</span>}</button>)}</nav>
    {collections.length > 0 && <section className="sidebar-collections"><h2>{t('Koleksiyonların')}</h2>{collections.slice(0, 6).map(group => <button key={group.id} title={group.name} aria-label={t('{0} koleksiyonunu aç', group.name)} onClick={() => openCollection(group.id)}><Folder size={14}/><span>{group.name}</span></button>)}</section>}
  </aside>;
}

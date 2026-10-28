import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Eye, FolderPlus, MoreHorizontal, Trash2 } from 'lucide-react';
import { t, useLanguage } from './i18n';
import Button from './ui/Button';

export default function CardActions({ title, disabled, details, collections, remove }: { title: string; disabled?: boolean; details: () => void; collections: () => void; remove: () => void }) {
  useLanguage();
  const id = useId();
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement | null>(null), menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  function close() { setOpen(false); trigger.current?.focus(); }
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => { const rect = trigger.current?.getBoundingClientRect(); if (rect) setPosition({ left: Math.max(10, Math.min(rect.right - 224, innerWidth - 234)), top: rect.bottom + 146 < innerHeight ? rect.bottom + 6 : Math.max(10, rect.top - 146) }); };
    place(); menu.current?.showPopover?.(); menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const outside = (event: Event) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside, true); document.addEventListener('focusin', outside);
    window.addEventListener('resize', place); document.addEventListener('scroll', place, true);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); };
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return <div ref={root} data-preserve-detail className="card-actions-menu">
    <button ref={trigger} type="button" className="favorite-button more-button" disabled={disabled} aria-label={t('{0} için diğer işlemler', title)} title={t('Diğer işlemler')} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}><MoreHorizontal size={17}/></button>
    {open && <div ref={menu} popover="manual" id={id} role="menu" aria-label={t('{0} işlemleri', title)} className="action-menu" style={position} onKeyDown={event => {
      const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index - 1 + buttons.length) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      else if (event.key === 'Tab') setTimeout(() => setOpen(false), 0);
    }}>
      <Button data-open-details variant="ghost" role="menuitem" tabIndex={-1} aria-label={t('{0} detaylarını aç', title)} onClick={() => { close(); details(); }}><Eye size={16}/>{t('Detayları aç')}</Button>
      <Button variant="ghost" role="menuitem" tabIndex={-1} aria-label={t('{0} koleksiyonlarını düzenle', title)} onClick={() => { close(); collections(); }}><FolderPlus size={16}/>{t('Koleksiyonlar')}</Button>
      <div className="menu-separator"/>
      <Button variant="ghost" role="menuitem" tabIndex={-1} className="menu-danger" aria-label={t('{0} listeden kaldır', title)} onClick={() => { close(); remove(); }}><Trash2 size={16}/>{t('Listeden kaldır')}</Button>
    </div>}
  </div>;
}

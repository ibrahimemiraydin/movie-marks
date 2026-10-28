import { t, useLanguage, locale } from './i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
export type SelectOption = { value: string; label: string };
export default function Select({ value, options, onChange, label, disabled, className = '', id }: {
  value: string; options: SelectOption[]; onChange: (value: string) => void; label: string; disabled?: boolean; className?: string; id?: string;
}) {
  useLanguage();
  const uid = useId();
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [cursor, setCursor] = useState(0);
  const selected = options.findIndex(o => o.value === value);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 260 });
  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect(); if (!rect) return;
      const below = innerHeight - rect.bottom - 12, above = rect.top - 12;
      const height = Math.min(260, options.length * 38 + 10);
      const flip = below < Math.min(160, height) && above > below;
      const maxHeight = Math.max(60, Math.min(height, flip ? above : below));
      const width = Math.min(Math.max(rect.width, 160), innerWidth - 20);
      setPosition({ left: Math.max(10, Math.min(rect.left, innerWidth - width - 10)), top: flip ? rect.top - maxHeight - 5 : rect.bottom + 5, width, maxHeight });
    }
    place();
    menu.current?.showPopover?.();
    const outside = (e: Event) => { if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside, true); document.addEventListener('focusin', outside);
    window.addEventListener('resize', place); document.addEventListener('scroll', place, true);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); };
  }, [open, options.length]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { if (open) menu.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView?.({ block: 'nearest' }); }, [cursor, open]);
  const choose = (index: number) => { const option = options[index]; if (option) onChange(option.value); setOpen(false); trigger.current?.focus(); };
  return <div className={`custom-select ${className}`} ref={root}>
    <button id={id} ref={trigger} type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? uid : undefined} aria-activedescendant={open ? `${uid}-${cursor}` : undefined} data-value={value} className="select-trigger" disabled={disabled} onClick={() => { setCursor(Math.max(0, selected)); setOpen(!open); }} onKeyDown={e => {
      if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
      else if (e.key === 'Tab') setOpen(false);
      else if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) { e.preventDefault(); setOpen(true); setCursor(e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : !open ? Math.max(0, selected) : (cursor + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (open) choose(cursor); else { setCursor(Math.max(0, selected)); setOpen(true); } }
      else if (e.key.length === 1) { const key = e.key.toLocaleLowerCase(locale()); const index = options.findIndex(o => o.label.toLocaleLowerCase(locale()).startsWith(key)); if (index >= 0) { e.preventDefault(); setOpen(true); setCursor(index); } }
    }}><span>{options[selected]?.label ?? t("Seç…")}</span><ChevronDown size={14} aria-hidden="true"/></button>
    {open && <div ref={menu} popover="manual" id={uid} className="select-menu" role="listbox" aria-label={label} style={position}>
      {options.map((option, index) => <div key={option.value} id={`${uid}-${index}`} role="option" aria-selected={option.value === value} data-value={option.value} data-index={index} className={`select-option ${cursor === index ? 'highlighted' : ''}`} onPointerMove={() => setCursor(index)} onMouseDown={e => e.preventDefault()} onClick={e => { e.preventDefault(); e.stopPropagation(); choose(index); }}><span>{option.label}</span>{option.value === value && <Check size={15}/>}</div>)}
    </div>}
  </div>;
}

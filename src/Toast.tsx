import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Info, MinusCircle, X } from 'lucide-react';
import { t, useLanguage } from './i18n';

export type Notice = { id: number; message: string; values?: (string | number)[]; kind: 'success' | 'removed' | 'updated' };
export default function Toast({ notice, dismiss }: { notice: Notice; dismiss: () => void }) {
  useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => { ref.current?.showPopover?.(); }, []);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [notice.id, paused, dismiss]);
  const Icon = notice.kind === 'removed' ? MinusCircle : notice.kind === 'updated' ? Info : CheckCircle2;
  return <div ref={ref} popover="manual" className={`toast toast-${notice.kind}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    <div role="status" aria-live="polite" aria-atomic="true"><Icon size={19}/><span>{t(notice.message, ...(notice.values ?? []).map((value, index) => notice.message === '{0}: {1}' && index === 1 ? t(String(value)) : value))}</span></div>
    <button className="icon-button" aria-label={t('Bildirimi kapat')} onClick={dismiss}><X size={16}/></button>
  </div>;
}

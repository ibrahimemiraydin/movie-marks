import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
let modalCount = 0;
let previousOverflow = '';

export function useModal({ modal = true }: { modal?: boolean } = {}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const pageX = window.scrollX, pageY = window.scrollY;
    const node = dialog.current;
    if (node?.open) node.close();
    node?.setAttribute('aria-modal', String(modal));
    if (modal) node?.showModal(); else node?.show();
    if (!modal) {
      if (window.scrollX !== pageX || window.scrollY !== pageY) window.scrollTo(pageX, pageY);
      return () => { previous?.focus({ preventScroll: true }); };
    }
    if (modalCount === 0) previousOverflow = document.body.style.overflow;
    modalCount++;
    document.body.style.overflow = 'hidden';
    return () => { modalCount--; if (modalCount === 0) document.body.style.overflow = previousOverflow; previous?.focus({ preventScroll: true }); };
  }, [modal]);
  return dialog;
}
export function isBackdropClick(e: MouseEvent<HTMLDialogElement>) {
  if (e.target !== e.currentTarget) return false;
  const rect = e.currentTarget.getBoundingClientRect();
  return e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
}

import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
let modalCount = 0;
let previousOverflow = '';

export function useModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.showModal();
    if (modalCount === 0) previousOverflow = document.body.style.overflow;
    modalCount++;
    document.body.style.overflow = 'hidden';
    return () => { modalCount--; if (modalCount === 0) document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  return dialog;
}
export function isBackdropClick(e: MouseEvent<HTMLDialogElement>) {
  if (e.target !== e.currentTarget) return false;
  const rect = e.currentTarget.getBoundingClientRect();
  return e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
}

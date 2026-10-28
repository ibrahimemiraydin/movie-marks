// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Toast, { type Notice } from './Toast';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const notice: Notice = { id: 1, kind: 'removed', message: '{0} listeden kaldırıldı.', values: ['Dexter'] };
it('kaldırmayı ayrı renkle, canlı bildirimle ve kapatma düğmesiyle gösterir', () => {
  const dismiss = vi.fn();
  const { container } = render(<Toast notice={notice} dismiss={dismiss}/>);
  expect(screen.getByRole('status', { hidden: true }).textContent).toBe('Dexter listeden kaldırıldı.');
  expect(container.querySelector('.toast-removed[popover="manual"]')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Bildirimi kapat', hidden: true }));
  expect(dismiss).toHaveBeenCalledOnce();
});
it('yeni bildirimde süreyi yeniler ve üzerine gelindiğinde kapanmayı bekletir', () => {
  vi.useFakeTimers();
  const dismiss = vi.fn();
  const { rerender, container } = render(<Toast notice={notice} dismiss={dismiss}/>);
  act(() => vi.advanceTimersByTime(4000));
  rerender(<Toast notice={{ ...notice, id: 2, kind: 'success', message: 'Ayarlar kaydedildi.' }} dismiss={dismiss}/>);
  act(() => vi.advanceTimersByTime(2000));
  expect(dismiss).not.toHaveBeenCalled();
  fireEvent.mouseEnter(container.firstChild!);
  act(() => vi.advanceTimersByTime(6000));
  expect(dismiss).not.toHaveBeenCalled();
  fireEvent.mouseLeave(container.firstChild!);
  act(() => vi.advanceTimersByTime(5000));
  expect(dismiss).toHaveBeenCalledOnce();
});

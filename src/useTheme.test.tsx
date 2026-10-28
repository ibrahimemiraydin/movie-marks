// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useTheme } from './useTheme';
const { get, set, listeners } = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), listeners: new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>() }));
vi.mock('wxt/browser', () => ({ browser: { storage: { local: { get, set }, onChanged: { addListener: (fn: typeof listeners extends Set<infer F> ? F : never) => listeners.add(fn), removeListener: (fn: typeof listeners extends Set<infer F> ? F : never) => listeners.delete(fn) } } } }));
function Probe() { const { theme, changeTheme, themeError } = useTheme(); return <><p>{theme}</p><button onClick={() => void changeTheme('light')}>Açık</button>{themeError && <p role="alert">{themeError}</p>}</>; }
beforeEach(() => { get.mockResolvedValue({ theme: 'dark' }); set.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.resetAllMocks(); listeners.clear(); delete document.documentElement.dataset.theme; });
it('kaydedilmiş temayı yükler ve diğer pencerenin değişimini uygular', async () => {
  get.mockResolvedValue({ theme: 'light' });
  render(<Probe/>); await screen.findByText('light');
  expect(document.documentElement.dataset.theme).toBe('light');
  for (const listener of listeners) listener({ theme: { newValue: 'dark' } }, 'local');
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
});
it('tercihi kalıcı kaydeder; kayıt hatasında önceki temayı korur', async () => {
  const first = render(<Probe/>);
  fireEvent.click(screen.getByText('Açık')); await screen.findByText('light');
  expect(set).toHaveBeenCalledWith({ theme: 'light' });
  first.unmount(); set.mockRejectedValue(new Error('storage'));
  render(<Probe/>); await screen.findByText('dark');
  fireEvent.click(screen.getByText('Açık')); await screen.findByRole('alert');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StatisticsPanel from './StatisticsPanel';
import { chooseSelect } from './testing/select';
import { emptyStatsMetadata, enrichStatsMetadata, readStatsMetadata } from './statisticsApi';
import type { Media } from './tmdb';
import { setLanguage } from './i18n';

vi.mock('wxt/browser', () => ({ browser: { storage: { onChanged: { addListener: vi.fn(), removeListener: vi.fn() } } } }));
vi.mock('./statisticsApi', async original => ({ ...await original<typeof import('./statisticsApi')>(), readStatsMetadata: vi.fn(), enrichStatsMetadata: vi.fn() }));
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; });
beforeEach(() => {
  vi.mocked(readStatsMetadata).mockImplementation(async item => ({ ...emptyStatsMetadata(item), runtime: 120, fetchedAt: new Date().toISOString() }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); setLanguage('tr'); });
const movie: Media = { id: 1, media_type: 'movie', title: 'Örnek Film', year: '2020', poster_path: null, overview: '', vote_average: 1, personalRating: 9, watchStatus: 'completed', watchedOn: '2024-01-01', rewatches: [{ id: 'r', date: '2024-02-01' }] };

it('yıl ve ay filtresini geçmişe uygular; beş sayfalık özeti klavyeyle gezebilir', async () => {
  const view = render(<StatisticsPanel library={[movie]} token="token" open={vi.fn()}/>);
  await waitFor(() => expect(view.container.querySelector('.stat-tile:last-child strong')?.textContent).toBe('4 sa 0 dk'));
  chooseSelect('Rapor yılı', '2024');
  expect(view.container.querySelectorAll('.watch-timeline li')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Ocak: 1 film, 0 bölüm. Geçmişi filtrele.' }));
  expect(view.container.querySelectorAll('.watch-timeline li')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Yıl özetini aç' }));
  const dialog = screen.getByRole('dialog', { name: '2024 yıl özeti' });
  fireEvent.keyDown(dialog, { key: 'ArrowRight' });
  expect(screen.getByRole('heading', { name: 'Yılın favori türü' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Özet sayfası 5' }));
  expect(screen.getByRole('heading', { name: 'İzleme ritmin' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yıl özetini kapat' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('tarihsiz kayıtları ayrı gösterir; hata halinde kütüphane kayıtlarını korur', async () => {
  vi.mocked(readStatsMetadata).mockImplementation(async item => emptyStatsMetadata(item));
  vi.mocked(enrichStatsMetadata).mockRejectedValue(new TypeError('offline'));
  const original = structuredClone(movie);
  const open = vi.fn();
  const view = render(<StatisticsPanel library={[{ ...movie, watchedOn: undefined, rewatches: [] }]} token="token" open={open}/>);
  await screen.findByRole('alert');
  expect(screen.getByText('1 kayıt tarihsiz; yıllık ve aylık raporlara eklenmedi.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Tarihi bilinmeyen · 1' }));
  expect(view.container.querySelectorAll('.watch-timeline li')).toHaveLength(1);
  fireEvent.click(view.container.querySelector('.watch-timeline button')!);
  expect(open).toHaveBeenCalled(); expect(movie).toEqual(original);
});
it('İngilizce boş durumda çalışır ve özet için veri gerektiğini belirtir', () => {
  setLanguage('en');
  render(<StatisticsPanel library={[]} token="" open={vi.fn()}/>);
  expect(screen.getByRole('heading', { name: 'Statistics' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Open year recap' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('No dated watch records for this year.')).toBeTruthy();
});

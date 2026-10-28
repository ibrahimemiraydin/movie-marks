// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContinueWatching from './ContinueWatching';
import { loadSeriesCatalog } from './tvApi';
import { defaultTracking, type SeriesCatalog } from './episodes';
import type { Media } from './tmdb';
import { setLanguage } from './i18n';

const { listeners } = vi.hoisted(() => ({ listeners: new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>() }));
vi.mock('wxt/browser', () => ({ browser: { storage: { onChanged: { addListener: (fn: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => listeners.add(fn), removeListener: (fn: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => listeners.delete(fn) } } } }));
vi.mock('./tvApi', () => ({ loadSeriesCatalog: vi.fn(), seriesCatalogKey: (id: number) => `tvCatalog:${id}` }));
const series: Media = { id: 1, media_type: 'tv', title: 'Dizi', year: '2024', poster_path: null, vote_average: 8, overview: '', watchStatus: 'watching' };
const catalog: SeriesCatalog = { id: 1, status: 'Returning Series', fetchedAt: '', seasons: [{ number: 1, name: 'Sezon 1', expected: 2, loaded: true, episodes: [1, 2].map(number => ({ id: number, season: 1, number, name: `Spoiler ${number}`, overview: '', still: null, runtime: null, airDate: '2020-01-01' })) }] };
beforeEach(() => { vi.mocked(loadSeriesCatalog).mockResolvedValue(structuredClone(catalog)); });
afterEach(() => { cleanup(); vi.clearAllMocks(); listeners.clear(); setLanguage('tr'); });
const props = () => ({ token: 'token', busy: false, open: vi.fn(), saveEpisode: vi.fn().mockResolvedValue(null), completeMovie: vi.fn() });

it('karttan ilk izlenmemiş bölümü ortak kayıt işlemine gönderir ve gelen ilerlemeyi gösterir', async () => {
  const callbacks = props();
  const view = render(<ContinueWatching {...callbacks} library={[series]}/>);
  const mark = await screen.findByRole('button', { name: 'Bölümü İzledim' });
  await waitFor(() => expect((mark as HTMLButtonElement).disabled).toBe(false));
  expect(screen.getByText('Sıradaki: S01 B01')).toBeTruthy();
  expect(screen.queryByText('Spoiler 1')).toBeNull();
  fireEvent.click(mark);
  expect(callbacks.saveEpisode).toHaveBeenCalledWith(series, { type: 'episode', key: '1:1', watched: true }, catalog);
  const episodeTracking = defaultTracking(); episodeTracking.runs[0]!.watched['1:1'] = '2024-01-01';
  view.rerender(<ContinueWatching {...callbacks} library={[{ ...series, episodeTracking }]}/>);
  expect(screen.getByText('Sıradaki: S01 B02')).toBeTruthy();
  expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1');
  expect(loadSeriesCatalog).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Dizi detaylarını aç' }));
  expect(callbacks.open).toHaveBeenCalled();
});
it('kayıt hatasını gösterir ve ilerlemeyi değiştirmez', async () => {
  const callbacks = props(); callbacks.saveEpisode.mockResolvedValue('Bölüm ilerlemesi kaydedilemedi. Önceki kayıt korundu; tekrar dene.');
  render(<ContinueWatching {...callbacks} library={[series]}/>);
  await screen.findByText('Sıradaki: S01 B01');
  fireEvent.click(screen.getByRole('button', { name: 'Bölümü İzledim' }));
  await screen.findByRole('alert');
  expect(screen.getByText('Sıradaki: S01 B01')).toBeTruthy();
});
it('eksik veya eski bilgide tek tıkla ilerlemeyi engeller; katalog güncellenince açar', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue({ ...catalog, warning: 'Güncelleme yapılamadı; kayıtlı bölüm bilgileri gösteriliyor. Yenileyerek tekrar deneyebilirsin.' });
  render(<ContinueWatching {...props()} library={[series]}/>);
  await screen.findByText('Kayıtlı bilgiler gösteriliyor. İlerlemeden önce yenile.');
  expect((screen.getByRole('button', { name: 'Bölümü İzledim' }) as HTMLButtonElement).disabled).toBe(true);
  act(() => { for (const listener of listeners) listener({ 'tvCatalog:1': { newValue: catalog } }, 'local'); });
  expect((screen.getByRole('button', { name: 'Bölümü İzledim' }) as HTMLButtonElement).disabled).toBe(false);
});
it('bitmiş dizi tamamlandığında kartı kaldırır; yeni aktif turu gösterir', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue({ ...catalog, status: 'Ended' });
  const callbacks = props(); const episodeTracking = defaultTracking();
  episodeTracking.runs[0]!.watched = { '1:1': '2024-01-01', '1:2': '2024-01-01' };
  const view = render(<ContinueWatching {...callbacks} library={[{ ...series, episodeTracking, watchStatus: 'completed' }]}/>);
  await waitFor(() => expect(screen.queryByRole('heading', { name: /Devam Et/ })).toBeNull());
  episodeTracking.runs.push({ id: 'second', name: '2. izleme', startedAt: '2025-01-01', watched: {} }); episodeTracking.activeRunId = 'second';
  view.rerender(<ContinueWatching {...callbacks} library={[{ ...series, episodeTracking }]}/>);
  expect(screen.getByText('2. izleme')).toBeTruthy();
  expect(screen.getByText('Sıradaki: S01 B01')).toBeTruthy();
});
it('filmi tamamlamak için doğru işlemi çağırır; İngilizceyi destekler', () => {
  setLanguage('en'); const callbacks = props(); const movie = { ...series, media_type: 'movie' as const };
  render(<ContinueWatching {...callbacks} library={[movie]}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Mark movie watched' }));
  expect(callbacks.completeMovie).toHaveBeenCalledWith(movie);
  expect(screen.queryByRole('progressbar')).toBeNull();
});

it('tarihi bilinmeyen bölümleri yetişildi diye göstermez ve otomatik işaretlemez', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue({ ...catalog, seasons: catalog.seasons.map(season => ({ ...season, episodes: season.episodes.map(episode => ({ ...episode, airDate: '' })) })) });
  render(<ContinueWatching {...props()} library={[series]}/>);
  await screen.findByText('Yayın tarihi bilinmeyen bölümler var');
  expect(screen.queryByText('Yayımlanan bölümlere yetiştin')).toBeNull();
  expect((screen.getByRole('button', { name: 'Bölümü İzledim' }) as HTMLButtonElement).disabled).toBe(true);
});

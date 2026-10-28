// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import EpisodeCalendar from './EpisodeCalendar';
import { loadSeriesCatalog } from './tvApi';
import type { Media } from './tmdb';
vi.mock('./tvApi', () => ({ loadSeriesCatalog: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('yaklaşan bölümleri sıralar, özel bölümleri ayara göre dışlar ve diziyi açar', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue({ id: 1, status: 'Returning Series', fetchedAt: '', seasons: [
    { number: 0, name: 'Özel', expected: 1, loaded: true, episodes: [{ id: 0, season: 0, number: 1, name: 'Özel', overview: 'Spoiler', still: null, runtime: 40, airDate: '2999-01-01' }] },
    { number: 1, name: 'Sezon 1', expected: 1, loaded: true, episodes: [{ id: 1, season: 1, number: 1, name: 'Bölüm', overview: 'Spoiler', still: null, runtime: 40, airDate: '2999-02-01' }] },
  ] });
  const item = { id: 1, media_type: 'tv', title: 'Dizi' } as Media;
  const open = vi.fn();
  render(<EpisodeCalendar library={[item]} token="token" open={open}/>);
  const button = await screen.findByRole('button', { name: /Dizi S01 B01/ });
  expect(screen.queryByText('S00 B01')).toBeNull(); expect(screen.queryByText('Spoiler')).toBeNull();
  fireEvent.click(button); expect(open).toHaveBeenCalledWith(item);
});
it('takvim güncellemesi başarısızsa eksik veri uyarısı gösterir', async () => {
  vi.mocked(loadSeriesCatalog).mockRejectedValue(new Error('offline'));
  render(<EpisodeCalendar library={[{ id: 1, media_type: 'tv', title: 'Dizi' } as Media]} token="token" open={vi.fn()}/>);
  await screen.findByRole('alert');
});

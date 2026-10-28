// @vitest-environment jsdom
import React from 'react';
import { chooseSelect } from './testing/select';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SeriesTracker from './SeriesTracker';
import { applyEpisodeAction, type Episode, type SeriesCatalog } from './episodes';
import { loadSeriesCatalog } from './tvApi';
import type { Media } from './tmdb';
vi.mock('./tvApi', () => ({ loadSeriesCatalog: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const episode = (number: number, date = '2020-01-01'): Episode => ({ id: number, season: 1, number, name: `Bölüm ${number}`, overview: `Gizli açıklama ${number}`, still: '/still.jpg', runtime: 45, airDate: date });
const catalog: SeriesCatalog = { id: 1, status: 'Ended', fetchedAt: '', seasons: [{ number: 1, name: 'Sezon 1', expected: 2, loaded: true, episodes: [episode(1), episode(2)] }] };
const item: Media = { id: 1, media_type: 'tv', title: 'Dizi', year: '', poster_path: null, overview: '', vote_average: 0 };
function Harness() {
  const [media, setMedia] = React.useState(item);
  return <SeriesTracker item={media} token="token" save={async (action, data) => { setMedia(old => applyEpisodeAction(old, data, action)); return null; }}/>;
}
it('yeni tur silme onayını iptal edebilir, onaylayınca ilk turun ilerlemesine döner', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue(catalog);
  render(<Harness/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Bölümü İzledim' }));
  fireEvent.click(screen.getByRole('button', { name: 'Yeni izleme turu' }));
  fireEvent.click(screen.getByRole('button', { name: 'İzleme turunu sil' }));
  expect(screen.queryByRole('group', { name: 'İzleme turunu silme onayı' })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
  expect(screen.queryByRole('button', { name: 'Turu sil' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'İzleme turunu sil' }));
  fireEvent.click(screen.getByRole('button', { name: 'Turu sil' }));
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'İzleme turu' }).getAttribute('data-value')).toBe('first'));
  expect((screen.getByRole('checkbox', { name: 'S01 B01 izlendi' }) as HTMLInputElement).checked).toBe(true);
  expect(screen.queryByRole('button', { name: 'İzleme turunu sil' })).toBeNull();
});
it('tur silme kaydı başarısızsa seçili turu ve onayı korur', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue(catalog);
  const media = applyEpisodeAction(item, catalog, { type: 'newRun' });
  render(<SeriesTracker item={media} token="token" save={async () => 'Silme kaydedilemedi'}/>);
  fireEvent.click(await screen.findByRole('button', { name: 'İzleme turunu sil' }));
  fireEvent.click(screen.getByRole('button', { name: 'Turu sil' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('combobox', { name: 'İzleme turu' }).getAttribute('data-value')).toBe(media.episodeTracking!.activeRunId);
  expect(screen.queryByRole('group', { name: 'İzleme turunu silme onayı' })).not.toBeNull();
});
it('tek tıkla ilerler, sonraki bölümü günceller ve tur ilerlemelerini ayırır', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue(catalog);
  render(<Harness/>);
  const button = await screen.findByRole('button', { name: 'Bölümü İzledim' });
  fireEvent.click(button);
  await waitFor(() => expect((screen.getByRole('checkbox', { name: 'S01 B01 izlendi' }) as HTMLInputElement).checked).toBe(true));
  expect(screen.getByText(/Sıradaki:/).textContent).toContain('S01 B02 · Bölüm 2');
  fireEvent.click(button);
  await screen.findByText('Dizi tamamlandı');
  expect((screen.getByRole('progressbar', { name: 'Dizi tamamlanma yüzdesi' }) as HTMLProgressElement).value).toBe(2);
  fireEvent.click(screen.getByRole('button', { name: 'Yeni izleme turu' }));
  expect((screen.getByRole('checkbox', { name: 'S01 B01 izlendi' }) as HTMLInputElement).checked).toBe(false);
  chooseSelect(screen.getByRole('combobox', { name: 'İzleme turu' }), 'first');
  expect((screen.getByRole('checkbox', { name: 'S01 B01 izlendi' }) as HTMLInputElement).checked).toBe(true);
});
it('izlenmemiş açıklamayı ve görseli gizler; kullanıcı isterse açar', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue(catalog);
  render(<Harness/>);
  await screen.findByText('Yayını bitmiş dizi');
  expect(screen.queryByText('Gizli açıklama 1')).toBeNull();
  expect(screen.queryByAltText('Bölüm görseli')).toBeNull();
  fireEvent.click(screen.getAllByText('Bölüm detayları')[0]!);
  fireEvent.click(screen.getAllByRole('button', { name: /Spoiler gizli/ })[0]!);
  expect(screen.queryByText('Gizli açıklama 1')).not.toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Spoiler koruması' }));
  expect(screen.queryByText('Gizli açıklama 2')).not.toBeNull();
});
it('kayıt hatasında işareti değiştirmez ve yeniden denenebilir hata gösterir', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue(catalog);
  render(<SeriesTracker item={item} token="token" save={async () => 'Kayıt hatası'}/>);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'S01 B01 izlendi' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('checkbox', { name: 'S01 B01 izlendi' }) as HTMLInputElement).checked).toBe(false);
});
it('eksik sezonlarda otomatik ilerleme kapalıdır; gelecek bölümler işaretlenmez', async () => {
  vi.mocked(loadSeriesCatalog).mockResolvedValue({ ...catalog, seasons: [{ ...catalog.seasons[0]!, loaded: false, episodes: [episode(1,'2999-01-01')] }] });
  render(<SeriesTracker item={item} token="token" save={async () => null}/>);
  expect((await screen.findByRole('button', { name: 'Bölümü İzledim' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('checkbox', { name: 'S01 B01 izlendi' }) as HTMLInputElement).disabled).toBe(true);
});

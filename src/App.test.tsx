// @vitest-environment jsdom
import React from 'react';
import { chooseSelect } from './testing/select';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { loadCollections, saveCollections, saveLibrary, saveLibraryAndCollections } from './storage';
import type { Collection } from './collections';
import { todayLocal } from './personal';
import { getFilterMetadata } from './tmdb';
import type { Media } from './tmdb';
import type { SaveEpisode } from './SeriesTracker';
vi.mock('./tmdb', async original => ({ ...await original<typeof import('./tmdb')>(), getFilterMetadata: vi.fn().mockResolvedValue({ genres: ['Dram'], releaseDate: '2020-02-01' }) }));

vi.mock('wxt/browser', () => ({ browser: { storage: { local: { get: vi.fn().mockResolvedValue({ theme: 'dark' }), set: vi.fn().mockResolvedValue(undefined) }, onChanged: { addListener: vi.fn(), removeListener: vi.fn() } } } }));
vi.mock('./SearchPanel', () => ({ default: () => <div>TMDB araması</div> }));
vi.mock('./DetailPanel', () => ({ default: ({ item, close, onEpisodeSave }: { item: Media; close: () => void; onEpisodeSave?: SaveEpisode }) => <div role="dialog" aria-label={item.title}><button onClick={close}>Detayı kapat</button>{item.media_type === 'tv' && <button onClick={() => void onEpisodeSave?.({ type: 'episode', key: '1:1', watched: true }, { id: item.id, status: 'Returning Series', fetchedAt: '', seasons: [{ number: 1, name: 'Sezon', expected: 1, loaded: true, episodes: [{ id: 1, season: 1, number: 1, name: 'Pilot', overview: '', still: null, runtime: 40, airDate: '2020-01-01' }] }] })}>Bölüm ilerlemesini kaydet</button>}</div> }));
vi.mock('./storage', () => ({
  loadToken: async () => 'token', saveToken: vi.fn(), saveLibrary: vi.fn(),
  loadCollections: vi.fn().mockResolvedValue([]), saveCollections: vi.fn(), saveLibraryAndCollections: vi.fn(),
  loadLibrary: async () => [
    { id: 1, media_type: 'movie', title: 'IŞIK', year: '2020', vote_average: 0 },
    { id: 2, media_type: 'tv', title: 'İstanbul', year: '2021', vote_average: 0 },
  ],
}));
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; });
beforeEach(() => { vi.mocked(loadCollections).mockResolvedValue([]); vi.mocked(saveCollections).mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('dizi detayından bölüm ilerlemesini mevcut kişisel kayda yazar', async () => {
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: 'İstanbul' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bölüm ilerlemesini kaydet' }));
  await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 2, title: 'İstanbul', watchStatus: 'watching', episodeTracking: expect.objectContaining({ activeRunId: 'first', runs: [expect.objectContaining({ watched: { '1:1': expect.any(String) } })] }) })])));
});
it('koleksiyon kaydı başarısız olursa taslak adını korur', async () => {
  vi.mocked(saveCollections).mockRejectedValueOnce(new Error('storage'));
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: 'IŞIK koleksiyonlarını düzenle' }));
  fireEvent.change(screen.getByLabelText('Yeni koleksiyon adı'), { target: { value: 'Yeni liste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Oluştur ve ekle' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Yeni koleksiyon adı') as HTMLInputElement).value).toBe('Yeni liste');
  expect(screen.queryByRole('checkbox', { name: 'Yeni liste' })).toBeNull();
});
it('karttan koleksiyon oluşturur, açar, adını değiştirir ve silince yapımı korur', async () => {
  let groups: Collection[] = [];
  vi.mocked(loadCollections).mockImplementation(async () => structuredClone(groups));
  vi.mocked(saveCollections).mockImplementation(async next => { groups = structuredClone(next); });
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: 'IŞIK koleksiyonlarını düzenle' }));
  fireEvent.change(screen.getByLabelText('Yeni koleksiyon adı'), { target: { value: 'Bilim Kurgu' } });
  fireEvent.click(screen.getByRole('button', { name: 'Oluştur ve ekle' }));
  await screen.findByRole('checkbox', { name: 'Bilim Kurgu' });
  fireEvent.click(screen.getByRole('button', { name: 'Koleksiyon panelini kapat' }));
  fireEvent.click(screen.getByRole('button', { name: /Koleksiyonlar/ }));
  chooseSelect(screen.getByLabelText('Koleksiyon seç'), groups[0]!.id);
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).not.toBeNull();
  expect(screen.queryByRole('heading', { name: 'İstanbul' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Koleksiyonları yönet' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bilim Kurgu adını değiştir' }));
  fireEvent.change(screen.getByLabelText('Koleksiyonun yeni adı'), { target: { value: 'En İyiler' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await screen.findByRole('button', { name: 'En İyiler koleksiyonunu sil' });
  fireEvent.click(screen.getByRole('button', { name: 'En İyiler koleksiyonunu sil' }));
  fireEvent.click(screen.getByRole('button', { name: 'Koleksiyonu sil' }));
  await waitFor(() => expect(groups).toHaveLength(0));
  fireEvent.click(screen.getByRole('button', { name: 'Koleksiyon panelini kapat' }));
  fireEvent.click(screen.getByRole('button', { name: /Kütüphane/ }));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).not.toBeNull();
  expect(saveLibrary).not.toHaveBeenCalled();
});
it('ana listeden kaldırırken koleksiyon üyeliklerini aynı kayıtta temizler', async () => {
  vi.mocked(loadCollections).mockResolvedValue([{ id: 'c', name: 'Liste', createdAt: '', mediaKeys: ['movie:1', 'tv:2'] }]);
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: 'IŞIK listeden kaldır' }));
  await waitFor(() => expect(saveLibraryAndCollections).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 2 })]), [{ id: 'c', name: 'Liste', createdAt: '', mediaKeys: ['tv:2'] }]));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).toBeNull();
});
it('eski tür ve yayın bilgilerini tamamlar; gelişmiş filtreleri uygular', async () => {
  render(<App/>);
  await screen.findByRole('heading', { name: 'IŞIK' });
  fireEvent.click(screen.getByText('Filtrele ve sırala'));
  await waitFor(() => expect(getFilterMetadata).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1, title: 'IŞIK', genres: ['Dram'], releaseDate: '2020-02-01' })])));
  fireEvent.change(screen.getByLabelText('Yıl başlangıcı'), { target: { value: '2021' } });
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'İstanbul' })).not.toBeNull();
  fireEvent.change(screen.getByLabelText('Yayın tarihi başlangıcı'), { target: { value: '2022-01-01' } });
  expect(screen.queryByRole('heading', { name: 'İstanbul' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Filtreleri sıfırla' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sonuçları göster' }));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).not.toBeNull();
});
it('favoriye ekler, ayrı bölümde gösterir ve çıkarınca listede tutar', async () => {
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: 'IŞIK favorilere ekle' }));
  await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1, favorite: true })])));
  fireEvent.click(screen.getByRole('button', { name: /Favoriler/ }));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).not.toBeNull();
  expect(screen.queryByRole('heading', { name: 'İstanbul' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'IŞIK favorilerden çıkar' }));
  await screen.findByText('Henüz favori yok');
  fireEvent.click(screen.getByRole('button', { name: /Kütüphane/ }));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).not.toBeNull();
});
it('durum kaydedilemezse önceki durumu korur', async () => {
  vi.mocked(saveLibrary).mockRejectedValueOnce(new Error('storage'));
  render(<App/>);
  const select = await screen.findByRole('combobox', { name: 'IŞIK izleme durumu' });
  chooseSelect(select, 'completed');
  await screen.findByRole('alert');
  expect(select.getAttribute('data-value')).toBe('planned');
});
it('ayarları ayrı dialog olarak açar ve kapatır', async () => {
  render(<App/>);
  await screen.findByRole('heading', { name: 'IŞIK' });
  fireEvent.click(screen.getByRole('button', { name: 'Ayarlar' }));
  expect(screen.queryByRole('dialog', { name: 'Ayarlar' })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Ayarları kapat' }));
  expect(screen.queryByRole('dialog', { name: 'Ayarlar' })).toBeNull();
});
it('eski kaydı İzlenecek gösterir, durumunu kaydeder ve filtreler', async () => {
  render(<App/>);
  const select = await screen.findByRole('combobox', { name: 'IŞIK izleme durumu' });
  expect(select.getAttribute('data-value')).toBe('planned');
  chooseSelect(select, 'completed');
  await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1, watchStatus: 'completed', watchedOn: todayLocal() })])));
  expect(select.getAttribute('data-value')).toBe('completed');
  fireEvent.click(screen.getByRole('button', { name: 'Filtrele ve sırala' }));
  chooseSelect('İzleme durumu', 'completed');
  fireEvent.click(screen.getByRole('button', { name: 'Sonuçları göster' }));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).not.toBeNull();
  expect(screen.queryByRole('heading', { name: 'İstanbul' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Dizi' }));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).toBeNull();
});
it('hem afiş hem ad detay panelini açar', async () => {
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: 'IŞIK afişinden detayları aç' }));
  expect(screen.queryByRole('dialog', { name: 'IŞIK' })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Detayı kapat' }));
  fireEvent.click(screen.getByRole('button', { name: 'İstanbul' }));
  expect(screen.queryByRole('dialog', { name: 'İstanbul' })).not.toBeNull();
});
it('kişisel listeyi ad ve kategoriyle filtreler, temizleyince tümünü gösterir', async () => {
  render(<App/>);
  await screen.findByRole('heading', { name: 'IŞIK' });
  const input = screen.getByRole('textbox', { name: 'Kütüphanede ara' });
  fireEvent.change(input, { target: { value: 'ışık' } });
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).not.toBeNull();
  expect(screen.queryByRole('heading', { name: 'İstanbul' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Dizi' }));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).toBeNull();
  expect(screen.queryByText('Listende eşleşen yapım yok')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Liste aramasını temizle' }));
  expect(screen.queryByRole('heading', { name: 'İstanbul' })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Tümü' }));
  expect(screen.queryByRole('heading', { name: 'IŞIK' })).not.toBeNull();
});

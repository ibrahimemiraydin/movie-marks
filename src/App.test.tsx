import { browser } from 'wxt/browser';
import { setLanguage } from './i18n';
// @vitest-environment jsdom
import React from 'react';
import { chooseSelect } from './testing/select';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { loadCollections, saveCollections, saveLibrary, saveLibraryAndCollections } from './storage';
import type { Collection } from './collections';
import { todayLocal } from './personal';
import { getFilterMetadata } from './tmdb';
import type { Media } from './tmdb';
import type { SaveEpisode } from './SeriesTracker';
vi.mock('./tmdb', async original => ({ ...await original<typeof import('./tmdb')>(), getFilterMetadata: vi.fn().mockResolvedValue({ genres: ['Dram'], releaseDate: '2020-02-01' }) }));

vi.mock('wxt/browser', () => ({ browser: { runtime: { getURL: (path: string) => `chrome-extension://demo${path}` }, tabs: { create: vi.fn().mockResolvedValue({}) }, storage: { local: { get: vi.fn().mockResolvedValue({ theme: 'dark' }), set: vi.fn().mockResolvedValue(undefined) }, onChanged: { addListener: vi.fn(), removeListener: vi.fn() } } } }));
vi.mock('./tvApi', async original => ({ ...await original<typeof import('./tvApi')>(), loadSeriesCatalog: vi.fn().mockImplementation(async (id: number) => ({ id, status: 'Returning Series', fetchedAt: '', seasons: [] })) }));
vi.mock('./SearchPanel', () => ({ default: ({ openDetails }: { openDetails: (item: Media) => void }) => <><button onClick={() => openDetails({ id: 99, title: 'Arama filmi', media_type: 'movie', year: '2025', poster_path: null, overview: '', vote_average: 7 })}>TMDB araması</button><button onClick={() => openDetails({ id: 100, title: 'Arama dizisi', media_type: 'tv', year: '2025', poster_path: null, overview: '', vote_average: 7 })}>TMDB dizi araması</button></> }));
vi.mock('./DetailPanel', () => ({ default: ({ item, close, onEpisodeSave, inLibrary, onFavorite, onCollectionChange }: { inLibrary?: boolean; onFavorite?: () => Promise<boolean>; onCollectionChange?: (action: import('./collections').CollectionAction) => Promise<string | null>; item: Media; close: () => void; onEpisodeSave?: SaveEpisode }) => <div role="dialog" aria-label={item.title}><button onClick={close}>Detayı kapat</button><span>{inLibrary ? 'Kayıtlı detay' : 'Arama detayı'}</span><button onClick={() => void onFavorite?.()}>Detay favorisi</button><button onClick={() => void onCollectionChange?.({ type: 'create', name: 'Arama koleksiyonu', mediaKey: `${item.media_type}:${item.id}` })}>Detay koleksiyonu</button>{item.media_type === 'tv' && <button onClick={() => void onEpisodeSave?.({ type: 'episode', key: '1:1', watched: true }, { id: item.id, status: 'Returning Series', fetchedAt: '', seasons: [{ number: 1, name: 'Sezon', expected: 1, loaded: true, episodes: [{ id: 1, season: 1, number: 1, name: 'Pilot', overview: '', still: null, runtime: 40, airDate: '2020-01-01' }] }] })}>Bölüm ilerlemesini kaydet</button>}</div> }));
vi.mock('./storage', () => ({
  loadToken: async () => 'token', saveToken: vi.fn(), saveLibrary: vi.fn(),
  loadCollections: vi.fn().mockResolvedValue([]), saveCollections: vi.fn(), saveLibraryAndCollections: vi.fn(),
  loadLibrary: async () => [
    { id: 1, media_type: 'movie', title: 'IŞIK', year: '2020', vote_average: 0 },
    { id: 2, media_type: 'tv', title: 'İstanbul', year: '2021', vote_average: 0 },
  ],
}));
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; });
beforeEach(() => { window.history.replaceState(null, '', '/'); setLanguage('tr'); vi.mocked(browser.storage.local.get).mockImplementation(async () => ({ theme: 'dark' })); vi.mocked(browser.storage.local.set).mockResolvedValue(undefined); vi.mocked(loadCollections).mockResolvedValue([]); vi.mocked(saveCollections).mockResolvedValue(undefined); });
afterEach(() => { cleanup(); setLanguage('tr'); vi.clearAllMocks(); });
it('dizi detayından bölüm ilerlemesini mevcut kişisel kayda yazar', async () => {
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: 'İstanbul' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bölüm ilerlemesini kaydet' }));
  await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 2, title: 'İstanbul', watchStatus: 'watching', episodeTracking: expect.objectContaining({ activeRunId: 'first', runs: [expect.objectContaining({ watched: { '1:1': expect.any(String) } })] }) })])));
});
it('koleksiyon kaydı başarısız olursa taslak adını korur', async () => {
  vi.mocked(saveCollections).mockRejectedValueOnce(new Error('storage'));
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: 'IŞIK için diğer işlemler' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'IŞIK koleksiyonlarını düzenle', hidden: true }));
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
  fireEvent.click(await screen.findByRole('button', { name: 'IŞIK için diğer işlemler' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'IŞIK koleksiyonlarını düzenle', hidden: true }));
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
  fireEvent.click(await screen.findByRole('button', { name: 'IŞIK için diğer işlemler' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'IŞIK listeden kaldır', hidden: true }));
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
  fireEvent.click(screen.getAllByRole('button', { name: 'Filtreleri sıfırla' }).at(-1)!);
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

it('aramadan favori ekleme kütüphaneyi oluşturur ve detayı kayıtlı hale getirir', async () => {
  render(<App/>);
  await screen.findByRole('heading', { name: 'IŞIK' });
  fireEvent.click(screen.getByRole('button', { name: 'TMDB araması' }));
  expect(screen.getByText('Arama detayı')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Detay favorisi' }));
  await screen.findByText('Kayıtlı detay');
  expect(saveLibrary).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 99, favorite: true, watchStatus: 'planned', addedAt: expect.any(String) })]));
});
it('aramadan koleksiyona ekleme yapım ve koleksiyonu tek işlemde kaydeder', async () => {
  render(<App/>);
  await screen.findByRole('heading', { name: 'IŞIK' });
  fireEvent.click(screen.getByRole('button', { name: 'TMDB araması' }));
  fireEvent.click(screen.getByRole('button', { name: 'Detay koleksiyonu' }));
  await screen.findByText('Kayıtlı detay');
  expect(saveLibraryAndCollections).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 99 })]), expect.arrayContaining([expect.objectContaining({ name: 'Arama koleksiyonu', mediaKeys: ['movie:99'] })]));
});
it('koleksiyon kaydı başarısızsa arama yapımını da kütüphaneye eklemez', async () => {
  vi.mocked(saveLibraryAndCollections).mockRejectedValueOnce(new Error('disk'));
  render(<App/>);
  await screen.findByRole('heading', { name: 'IŞIK' });
  fireEvent.click(screen.getByRole('button', { name: 'TMDB araması' }));
  fireEvent.click(screen.getByRole('button', { name: 'Detay koleksiyonu' }));
  await waitFor(() => expect(saveLibraryAndCollections).toHaveBeenCalled());
  expect(screen.queryByText('Kayıtlı detay')).toBeNull();
  expect(screen.getByText('Arama detayı')).toBeTruthy();
});

it('kayıtlı dili açılışta yükler; ayarlardan değiştirdiğinde tercihi saklar', async () => {
  vi.mocked(browser.storage.local.get).mockImplementation(async key => Array.isArray(key) ? { language: 'en' } : { theme: 'dark' });
  render(<App/>);
  await screen.findByRole('button', { name: /Library/ });
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.getByRole('group', { name: 'Language' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Türkçe' }));
  await screen.findByRole('button', { name: /Kütüphane/ });
  expect(browser.storage.local.set).toHaveBeenCalledWith({ language: 'tr' });
});
it('dil kaydedilemezse eski dili ve açık ayarları korur', async () => {
  render(<App/>);
  await screen.findByRole('heading', { name: 'IŞIK' });
  fireEvent.click(screen.getByRole('button', { name: 'Ayarlar' }));
  vi.mocked(browser.storage.local.set).mockRejectedValueOnce(new Error('disk'));
  fireEvent.click(screen.getByRole('button', { name: 'English' }));
  await screen.findByText('Dil tercihi kaydedilemedi. Tekrar dene.');
  expect(screen.getByRole('button', { name: 'Türkçe' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('dialog', { name: 'Ayarlar' })).toBeTruthy();
});

it('diğer açık pencereden gelen dil değişimini uygular', async () => {
  render(<App/>);
  await screen.findByRole('heading', { name: 'IŞIK' });
  act(() => {
    for (const [listener] of vi.mocked(browser.storage.onChanged.addListener).mock.calls) {
      listener({ language: { newValue: 'en' } }, 'local');
    }
  });
  expect(screen.getByRole('button', { name: /Library/ })).toBeTruthy();
  expect(document.documentElement.lang).toBe('en');
});

it('aramadan ilk bölüm işaretlemesi dizi ve ilerlemeyi tek kayıtta oluşturur', async () => {
  render(<App/>); await screen.findByRole('heading', { name: 'IŞIK' });
  fireEvent.click(screen.getByRole('button', { name: 'TMDB dizi araması' }));
  expect(screen.getByText('Arama detayı')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Bölüm ilerlemesini kaydet' }));
  await screen.findByText('Kayıtlı detay');
  expect(saveLibrary).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 100, watchStatus: 'watching', addedAt: expect.any(String), episodeTracking: expect.objectContaining({ runs: [expect.objectContaining({ watched: { '1:1': expect.any(String) } })] }) })]));
  expect(screen.getByRole('heading', { name: /Devam Et/ })).toBeTruthy();
});
it('aramadan ilk bölüm kaydı başarısızsa boş bir kütüphane kaydı oluşturmaz', async () => {
  vi.mocked(saveLibrary).mockRejectedValueOnce(new Error('disk'));
  render(<App/>); await screen.findByRole('heading', { name: 'IŞIK' });
  fireEvent.click(screen.getByRole('button', { name: 'TMDB dizi araması' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bölüm ilerlemesini kaydet' }));
  await waitFor(() => expect(saveLibrary).toHaveBeenCalled());
  expect(screen.getByText('Arama detayı')).toBeTruthy(); expect(screen.queryByText('Kayıtlı detay')).toBeNull();
});

it('popup kompakt ekranı gösterir ve kısayol ilgili geniş sayfayı açar', async () => {
  const view = render(<App surface="popup"/>);
  await screen.findByRole('heading', { name: 'Son eklenenler' });
  expect(view.container.querySelector('.workspace-sidebar')).toBeNull();
  expect(view.container.querySelector('.media-grid')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'İstatistikler' }));
  await waitFor(() => expect(browser.tabs.create).toHaveBeenCalledWith({ url: 'chrome-extension://demo/dashboard.html#statistics' }));
});
it('geniş sayfa adresindeki bölüm bağlantısını açar', async () => {
  window.history.replaceState(null, '', '/dashboard.html#favorites');
  render(<App surface="page"/>);
  await screen.findByText('Henüz favori yok');
  expect(screen.getByRole('button', { name: /Favoriler/ }).getAttribute('aria-current')).toBe('page');
  expect(screen.queryByRole('button', { name: 'Geniş ekranda aç' })).toBeNull();
});

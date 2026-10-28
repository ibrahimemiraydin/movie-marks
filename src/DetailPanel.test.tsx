// @vitest-environment jsdom
import React from 'react';
import { chooseSelect } from './testing/select';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DetailPanel from './DetailPanel';
import { getMediaDetails, type Media, type MediaDetails } from './tmdb';

vi.mock('./tmdb', async original => ({ ...await original<typeof import('./tmdb')>(), getMediaDetails: vi.fn() }));
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const item: Media = { id: 1, media_type: 'tv', title: 'Dizi', year: '2024', poster_path: null, vote_average: 8, overview: 'Kayıtlı açıklama' };
const details: MediaDetails = { ...item, overview: 'Güncel açıklama', originalTitle: 'Show', backdrop: null, genres: ['Dram'], date: '2024-01-01', runtime: 45, status: 'Returning Series', seasons: 2, episodes: 16, creators: ['Yaratıcı'], cast: [{ id: 1, name: 'Oyuncu', character: 'Karakter', profile: null }] };
it('sekmeler arasında not taslağını korur; filmde bölüm sekmesi göstermez', async () => {
  vi.mocked(getMediaDetails).mockResolvedValue(details);
  render(<DetailPanel item={{ ...item, media_type: 'movie' }} token="token" close={vi.fn()} onPersonalSave={async () => true}/>);
  await screen.findByText('Güncel açıklama');
  expect(screen.queryByRole('tab', { name: 'Bölümler' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Kişisel Alanım' }));
  fireEvent.change(screen.getByLabelText('Kişisel notlarım'), { target: { value: 'Kaybolmayan taslak' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Genel Bakış' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Kişisel Alanım' }));
  expect((screen.getByLabelText('Kişisel notlarım') as HTMLTextAreaElement).value).toBe('Kaybolmayan taslak');
});

it('detay panelinden bir koleksiyona eklerken film ve dizi kimliklerini ayırır', async () => {
  vi.mocked(getMediaDetails).mockResolvedValue(details);
  const commit = vi.fn().mockResolvedValue(null);
  render(<DetailPanel item={item} token="token" close={vi.fn()} collections={[{ id: 'c', name: 'Sevdiklerim', createdAt: '', mediaKeys: ['movie:1'] }]} onCollectionChange={commit}/>);
  await screen.findByText('Güncel açıklama');
  fireEvent.click(screen.getByRole('button', { name: 'Koleksiyonlar 0' }));
  const checkbox = screen.getByRole('checkbox', { name: 'Sevdiklerim' });
  expect((checkbox as HTMLInputElement).checked).toBe(false);
  fireEvent.click(checkbox);
  expect(commit).toHaveBeenCalledWith({ type: 'membership', id: 'c', mediaKey: 'tv:1', included: true });
});

it('kişisel izleme durumunu yayın durumundan ayrı değiştirir', async () => {
  vi.mocked(getMediaDetails).mockResolvedValue(details);
  const onStatusChange = vi.fn();
  render(<DetailPanel item={item} token="token" close={vi.fn()} watchStatus="watching" onStatusChange={onStatusChange}/>);
  await screen.findByText('Devam ediyor');
  const select = screen.getByRole('combobox', { name: 'Dizi izleme durumu' });
  expect(select.getAttribute('data-value')).toBe('watching');
  chooseSelect(select, 'completed');
  expect(onStatusChange).toHaveBeenCalledWith('completed');
});

it('dizi detaylarını gösterir ve kapanınca isteği iptal eder', async () => {
  vi.mocked(getMediaDetails).mockResolvedValue(details);
  const close = vi.fn();
  const view = render(<DetailPanel item={item} token="token" close={close}/>);
  await screen.findByText('Güncel açıklama');
  expect(screen.queryByText('Devam ediyor')).not.toBeNull();
  expect(screen.queryByText('16')).not.toBeNull();
  expect(screen.queryByText('Oyuncu')).not.toBeNull();
  expect(screen.getByRole('dialog', { name: 'Dizi' })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Detayları kapat' }));
  expect(close).toHaveBeenCalled();
  const signal = vi.mocked(getMediaDetails).mock.calls[0]![2];
  view.unmount();
  expect(signal.aborted).toBe(true);
  expect(document.body.style.overflow).toBe('');
});

it('hatada kayıtlı açıklamayı korur ve tekrar deneyebilir', async () => {
  vi.mocked(getMediaDetails).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(details);
  render(<DetailPanel item={item} token="token" close={vi.fn()}/>);
  await screen.findByRole('alert');
  expect(screen.queryByText('Kayıtlı açıklama')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
  await screen.findByText('Güncel açıklama');
  await waitFor(() => expect(getMediaDetails).toHaveBeenCalledTimes(2));
});

it('Escape kapatma olayını işler ve anahtar yokken istek göndermez', () => {
  const close = vi.fn();
  render(<DetailPanel item={item} token="" close={close}/>);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(close).toHaveBeenCalled();
  expect(getMediaDetails).not.toHaveBeenCalled();
});

// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SearchPanel from './SearchPanel';
import { personCredits, searchAll, type Media } from './tmdb';

vi.mock('./tmdb', async importOriginal => ({ ...await importOriginal<typeof import('./tmdb')>(), searchAll: vi.fn(), personCredits: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const film: Media = { id: 1, media_type: 'movie', title: 'Forrest Gump', year: '1994', poster_path: null, vote_average: 8, overview: '' };

it('tek karakteri arar, boş sorguyu göndermez ve dışarı basınca kapanır', async () => {
  vi.mocked(searchAll).mockResolvedValue({ media: [film], people: [] });
  render(<><button>Dış alan</button><SearchPanel token="token" library={[]} busy={false} add={vi.fn()} openSettings={vi.fn()}/></>);
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  expect(searchAll).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'O' } });
  await screen.findByText('Forrest Gump');
  expect(searchAll).toHaveBeenCalledWith('O', 'token', expect.any(AbortSignal));
  fireEvent.pointerDown(screen.getByText('Forrest Gump'));
  expect(screen.queryByRole('button', { name: 'Aramayı kapat' })).not.toBeNull();
  fireEvent.pointerDown(screen.getByText('Dış alan'));
  expect(screen.queryByRole('button', { name: 'Aramayı kapat' })).toBeNull();
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '   ' } });
  const count = vi.mocked(searchAll).mock.calls.length;
  await new Promise(resolve => setTimeout(resolve, 450));
  expect(searchAll).toHaveBeenCalledTimes(count);
});

it('oyuncuyu seçip yapımını ekler ve kayıtlı yapımı yeniden eklemez', async () => {
  vi.mocked(searchAll).mockResolvedValue({ media: [], people: [{ id: 31, name: 'Tom Hanks', profile_path: null }] });
  vi.mocked(personCredits).mockResolvedValue([film]);
  const add = vi.fn();
  const props = { token: 'token', library: [] as Media[], busy: false, add, openSettings: vi.fn() };
  const view = render(<SearchPanel {...props}/>);
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'Tom Hanks' } });
  fireEvent.click(await screen.findByRole('button', { name: /Tom Hanks/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Forrest Gump listeye ekle' }));
  expect(add).toHaveBeenCalledWith(film);
  view.rerender(<SearchPanel {...props} library={[film]}/>);
  expect((screen.getByRole('button', { name: 'Forrest Gump listemde' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Aramayı kapat' }));
  expect(screen.queryByText('Forrest Gump')).toBeNull();
});

it('yeni sorguda önceki isteği iptal eder ve Escape ile paneli kapatır', async () => {
  vi.mocked(searchAll).mockResolvedValue({ media: [film], people: [] });
  render(<SearchPanel token="token" library={[]} busy={false} add={vi.fn()} openSettings={vi.fn()}/>);
  const input = screen.getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'Forrest' } });
  await waitFor(() => expect(searchAll).toHaveBeenCalled());
  const signal = vi.mocked(searchAll).mock.calls[0]![2];
  fireEvent.change(input, { target: { value: 'Dune' } });
  expect(signal.aborted).toBe(true);
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Aramayı kapat' })).toBeNull();
});

it('arama afişi ve adı detay açar, arama panelini kapatır', async () => {
  vi.mocked(searchAll).mockResolvedValue({ media: [film], people: [] });
  const openDetails = vi.fn();
  render(<SearchPanel token="token" library={[]} busy={false} add={vi.fn()} openSettings={vi.fn()} openDetails={openDetails}/>);
  const input = screen.getByRole('textbox');
  fireEvent.focus(input); fireEvent.change(input, { target: { value: 'Forrest' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Forrest Gump afişinden detayları aç' }));
  expect(openDetails).toHaveBeenCalledWith(film);
  expect(screen.queryByRole('button', { name: 'Aramayı kapat' })).toBeNull();
  fireEvent.focus(input);
  fireEvent.click(await screen.findByRole('button', { name: 'Forrest Gump' }));
  expect(openDetails).toHaveBeenCalledTimes(2);
});

it('yönetmen ve yaratıcı kişi sonucundan yapımları açar, detay ve eklemeyi korur', async () => {
  vi.mocked(searchAll).mockResolvedValue({ media: [], people: [{ id: 525, name: 'Christopher Nolan', profile_path: null }] });
  vi.mocked(personCredits).mockResolvedValue([film]);
  const openDetails = vi.fn();
  render(<SearchPanel token="token" library={[]} busy={false} add={vi.fn()} openSettings={vi.fn()} openDetails={openDetails}/>);
  fireEvent.focus(screen.getByRole('textbox'));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Christopher Nolan' } });
  await screen.findByRole('heading', { name: 'Kişiler' });
  fireEvent.click(screen.getByRole('button', { name: /Christopher Nolan/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Forrest Gump' }));
  expect(personCredits).toHaveBeenCalledWith(525, 'token', expect.any(AbortSignal));
  expect(openDetails).toHaveBeenCalledWith(film);
});

it('grupları ve kişi mesleğini gösterir; klavyeyle gezinip detay açar ve odağı korur', async () => {
  const series = { ...film, id: 2, media_type: 'tv' as const, title: 'Dizi örneği' };
  vi.mocked(searchAll).mockResolvedValue({ media: [film, series], people: [{ id: 3, name: 'Yönetmen örneği', department: 'Directing', profile_path: null }] });
  const openDetails = vi.fn();
  render(<SearchPanel token="token" library={[]} busy={false} add={vi.fn()} openSettings={vi.fn()} openDetails={openDetails}/>);
  const input = screen.getByRole('textbox');
  fireEvent.focus(input); fireEvent.change(input, { target: { value: 'O' } });
  await screen.findByText('Yönetmen');
  expect(screen.getByRole('region', { name: 'Filmler' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Diziler' })).toBeTruthy();
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(document.activeElement?.textContent).toContain('Yönetmen örneği');
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(document.activeElement?.textContent).toBe('Forrest Gump');
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(document.activeElement).toBe(input);
  expect(screen.queryByRole('button', { name: 'Aramayı kapat' })).toBeNull();
  fireEvent.focus(input);
  await screen.findByRole('button', { name: 'Forrest Gump' });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  fireEvent.click(document.activeElement!);
  expect(openDetails).toHaveBeenCalledWith(film);
});

it('bağlam menüsünden gelen sorguyu odaklayıp otomatik arar; token sonradan yüklenince de korur', async () => {
  vi.mocked(searchAll).mockResolvedValue({ media: [film], people: [] });
  const props = { library: [], busy: false, add: vi.fn(), openSettings: vi.fn(), initialQuery: 'O' };
  const { rerender } = render(<SearchPanel {...props} token=""/>);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  expect(input.value).toBe('O');
  expect(document.activeElement).toBe(input);
  expect(screen.getByRole('button', { name: 'Aramayı kapat' })).toBeTruthy();
  expect(searchAll).not.toHaveBeenCalled();
  rerender(<SearchPanel {...props} token="token"/>);
  await screen.findByRole('button', { name: 'Forrest Gump' });
  expect(searchAll).toHaveBeenCalledWith('O', 'token', expect.any(AbortSignal));
});

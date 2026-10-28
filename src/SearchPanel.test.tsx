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

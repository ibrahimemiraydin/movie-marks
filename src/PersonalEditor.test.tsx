// @vitest-environment jsdom
import React from 'react';
import { chooseSelect } from './testing/select';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PersonalEditor from './PersonalEditor';
import type { Media } from './tmdb';
afterEach(cleanup);
const item: Media = { id: 1, media_type: 'movie', title: 'Film', year: '', poster_path: null, vote_average: 8, overview: '', watchStatus: 'completed', favorite: true };
it('yeniden izlemeyi ayrı kayıt olarak ekler ve mevcut kaydı silebilir', async () => {
  const save = vi.fn().mockResolvedValue(true);
  render(<PersonalEditor item={{ ...item, rewatches: [{ id: 'old', date: '2023-01-01' }] }} save={save}/>);
  fireEvent.change(screen.getByLabelText('Yeniden izleme tarihi'), { target: { value: '2024-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'İzlemeyi kaydet' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ rewatches: [{ id: 'old', date: '2023-01-01' }, { id: expect.any(String), date: '2024-01-01' }] }));
  fireEvent.click(screen.getByRole('button', { name: '2023-01-01 yeniden izleme kaydını sil' }));
  expect(screen.getByRole('button', { name: '2023-01-01 yeniden izleme kaydını sil' }).classList.contains('danger-button')).toBe(true);
  await waitFor(() => expect(save).toHaveBeenCalledWith({ rewatches: [] }));
});
it('not taslağı varken dışarıdan gelen izleme tarihini eski değerle ezmez', async () => {
  const save = vi.fn().mockResolvedValue(true);
  const view = render(<PersonalEditor item={item} save={save}/>);
  fireEvent.change(screen.getByLabelText('Kişisel notlarım'), { target: { value: 'Taslak' } });
  view.rerender(<PersonalEditor item={{ ...item, watchedOn: '2024-05-01' }} save={save}/>);
  expect((screen.getByLabelText('İzleme tarihi') as HTMLInputElement).value).toBe('2024-05-01');
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0]![0]).not.toHaveProperty('watchedOn');
});
it('kişisel puan, not ve tarihi birlikte kaydeder', async () => {
  const save = vi.fn().mockResolvedValue(true);
  render(<PersonalEditor item={item} save={save}/>);
  chooseSelect(screen.getByLabelText('Kişisel puanım'), '9');
  fireEvent.change(screen.getByLabelText('Kişisel notlarım'), { target: { value: 'Finali çok iyi.' } });
  fireEvent.change(screen.getByLabelText('İzleme tarihi'), { target: { value: '2024-01-02' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ personalRating: 9, notes: 'Finali çok iyi.', watchedOn: '2024-01-02' }));
  await screen.findByRole('status');
});
it('hatalı kayıtta not taslağını korur ve tekrar kaydedebilir', async () => {
  const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<PersonalEditor item={item} save={save}/>);
  fireEvent.change(screen.getByLabelText('Kişisel notlarım'), { target: { value: 'Kaybolmasın' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Kişisel notlarım') as HTMLTextAreaElement).value).toBe('Kaybolmasın');
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await screen.findByRole('status');
  expect(save).toHaveBeenCalledTimes(2);
});
it('puan, not ve tarihi temizleyebilir', async () => {
  const save = vi.fn().mockResolvedValue(true);
  render(<PersonalEditor item={{ ...item, personalRating: 10, notes: 'Eski', watchedOn: '2024-01-02' }} save={save}/>);
  chooseSelect(screen.getByLabelText('Kişisel puanım'), '');
  fireEvent.change(screen.getByLabelText('Kişisel notlarım'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tarihi temizle' }));
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ personalRating: null, notes: '', watchedOn: '' }));
});

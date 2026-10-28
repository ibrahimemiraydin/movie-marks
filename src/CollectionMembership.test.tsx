// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CollectionMembership from './CollectionMembership';
import type { Media } from './tmdb';
afterEach(cleanup);
const item = { id: 1, media_type: 'movie', title: 'Film' } as Media;
it('koleksiyon üyeliği ve yeni koleksiyon oluşturma işlemlerini iletir', async () => {
  const commit = vi.fn().mockResolvedValue(null);
  render(<CollectionMembership item={item} busy={false} collections={[{ id: 'c', name: 'Bilim Kurgu', createdAt: '', mediaKeys: [] }]} commit={commit}/>);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Bilim Kurgu' }));
  expect(commit).toHaveBeenCalledWith({ type: 'membership', id: 'c', mediaKey: 'movie:1', included: true });
  fireEvent.change(screen.getByLabelText('Yeni koleksiyon adı'), { target: { value: 'Sevdiklerim' } });
  fireEvent.click(screen.getByRole('button', { name: 'Oluştur ve ekle' }));
  await waitFor(() => expect(commit).toHaveBeenCalledWith({ type: 'create', name: 'Sevdiklerim', mediaKey: 'movie:1' }));
});
it('kayıt hatasını gösterir ve üyeliği değiştirmez', async () => {
  const commit = vi.fn().mockResolvedValue('Kayıt yapılamadı.');
  render(<CollectionMembership item={item} collections={[{ id: 'c', name: 'Bilim Kurgu', createdAt: '', mediaKeys: [] }]} commit={commit}/>);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Bilim Kurgu' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
});

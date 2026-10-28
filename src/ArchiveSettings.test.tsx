// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ArchiveSettings from './ArchiveSettings';
import { makeBackup } from './archive';
import { readArchive } from './archiveStorage';
import { readBackupFile, downloadArchive } from './archiveFiles';

vi.mock('./archiveStorage', () => ({ readArchive: vi.fn() }));
vi.mock('./archiveFiles', () => ({ readBackupFile: vi.fn(), downloadArchive: vi.fn() }));
const archive = { library: [{ id: 1, title: 'Film', media_type: 'movie' as const, year: '', poster_path: null, overview: '', vote_average: 0 }], collections: [] };
beforeEach(() => { vi.mocked(readArchive).mockResolvedValue(archive); vi.mocked(readBackupFile).mockResolvedValue(makeBackup(archive)); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function choose() { fireEvent.change(screen.getByLabelText('JSON yedek dosyası'), { target: { files: [new File(['{}'], 'backup.json', { type: 'application/json' })] } }); }
it('dosyayı önizler ama açık onaydan önce arşivi değiştirmez', async () => {
  const replace = vi.fn().mockResolvedValue(true); render(<ArchiveSettings replace={replace}/>);
  choose(); await screen.findByRole('group', { name: 'Yedeği geri yükleme onayı' });
  expect(replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Yedeği geri yükle' }));
  await screen.findByText('Yedek geri yüklendi.'); expect(replace).toHaveBeenCalledWith(expect.objectContaining(archive), false);
});
it('sıfırlamayı iptal edebilir; başarısız geri yüklemede önizlemeyi korur', async () => {
  const replace = vi.fn().mockResolvedValue(false); render(<ArchiveSettings replace={replace}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Arşivi temizle' }));
  expect(replace).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
  expect(screen.queryByRole('group', { name: 'Arşivi silme onayı' })).toBeNull();
  choose(); await screen.findByRole('button', { name: 'Yedeği geri yükle' });
  fireEvent.click(screen.getByRole('button', { name: 'Yedeği geri yükle' }));
  await screen.findByRole('alert'); expect(screen.getByText('backup.json')).toBeTruthy();
});
it('dışa aktarma salt okunurdur ve bozuk dosya onay ekranına geçemez', async () => {
  const replace = vi.fn(); render(<ArchiveSettings replace={replace}/>);
  fireEvent.click(screen.getByRole('button', { name: 'JSON dışa aktar' }));
  await waitFor(() => expect(downloadArchive).toHaveBeenCalled());
  const source = vi.mocked(downloadArchive).mock.calls[0]![0]; expect(JSON.parse(source).library).toEqual(archive.library);
  expect(replace).not.toHaveBeenCalled();
  vi.mocked(readBackupFile).mockRejectedValue(new Error('Bozuk dosya')); choose();
  await screen.findByText('Bozuk dosya'); expect(screen.queryByRole('button', { name: 'Yedeği geri yükle' })).toBeNull();
});
it('sıfırlama yalnızca son onayda boş arşivi gönderir', async () => {
  const replace = vi.fn().mockResolvedValue(true); render(<ArchiveSettings replace={replace}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Arşivi temizle' }));
  fireEvent.click(screen.getByRole('button', { name: 'Evet, arşivi sil' }));
  await screen.findByText('Arşiv temizlendi.'); expect(replace).toHaveBeenCalledWith({ library: [], collections: [] }, true);
});

// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsPanel from './SettingsPanel';
import { saveToken } from './storage';
vi.mock('./archiveStorage', () => ({ readArchive: vi.fn() }));
vi.mock('./storage', () => ({ saveToken: vi.fn() }));
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('anahtarı kaydeder, Bearer önekini çıkarır ve paneli kapatır', async () => {
  const saved = vi.fn(), close = vi.fn();
  render(<SettingsPanel token="old" saved={saved} close={close}/>);
  fireEvent.change(screen.getByLabelText('API Read Access Token'), { target: { value: '  Bearer new-token  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith('new-token'));
  expect(saveToken).toHaveBeenCalledWith('new-token');
  expect(close).toHaveBeenCalled();
});
it('kayıt hatasında açık kalır ve Escape ile kapanır', async () => {
  vi.mocked(saveToken).mockRejectedValue(new Error('storage'));
  const close = vi.fn(), saved = vi.fn();
  render(<SettingsPanel token="old" saved={saved} close={close}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await screen.findByRole('alert');
  expect(saved).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(close).toHaveBeenCalled();
});

// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CardActions from './CardActions';
afterEach(cleanup);
it('menüde klavyeyle gezinir, Escape ile odağı geri verir ve dışarı basınca kapanır', () => {
  render(<><button>Dış alan</button><CardActions title="Film" details={vi.fn()} collections={vi.fn()} remove={vi.fn()}/></>);
  const trigger = screen.getByRole('button', { name: 'Film için diğer işlemler' });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const items = screen.getAllByRole('menuitem', { hidden: true });
  expect(document.activeElement).toBe(items[0]);
  fireEvent.keyDown(items[0]!, { key: 'End' });
  expect(document.activeElement).toBe(items[2]);
  fireEvent.keyDown(items[2]!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(items[0]);
  fireEvent.keyDown(items[0]!, { key: 'Escape' });
  expect(screen.queryByRole('menu', { hidden: true })).toBeNull();
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger); fireEvent.pointerDown(screen.getByText('Dış alan'));
  expect(screen.queryByRole('menu', { hidden: true })).toBeNull();
});
it('işlemi bir kez çalıştırır ve menüyü kapatır', () => {
  const remove = vi.fn();
  render(<CardActions title="Film" details={vi.fn()} collections={vi.fn()} remove={remove}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Film için diğer işlemler' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Film listeden kaldır', hidden: true }));
  expect(remove).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('menu', { hidden: true })).toBeNull();
});

// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Select from './Select';
afterEach(cleanup);
const options = [{ value: 'a', label: 'Aydınlık' }, { value: 'b', label: 'Karanlık' }];
it('klavye okları ve Enter ile seçer; Escape üst panele gitmeden menüyü kapatır', () => {
  const change = vi.fn(), parentKey = vi.fn();
  render(<div onKeyDown={parentKey}><Select label="Seçim" value="a" options={options} onChange={change}/></div>);
  const trigger = screen.getByRole('combobox');
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  expect(change).toHaveBeenCalledWith('b');
  fireEvent.click(trigger); parentKey.mockClear();
  fireEvent.keyDown(trigger, { key: 'Escape' });
  expect(trigger.getAttribute('aria-expanded')).toBe('false'); expect(parentKey).not.toHaveBeenCalled();
});
it('dışarı basınca kapanır ve disabled durumunda açılmaz', () => {
  const view = render(<><button>Dış alan</button><Select label="Seçim" value="a" options={options} onChange={vi.fn()}/></>);
  const trigger = screen.getByRole('combobox');
  fireEvent.click(trigger); fireEvent.pointerDown(screen.getByText('Dış alan'));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  view.rerender(<Select label="Seçim" value="a" options={options} disabled onChange={vi.fn()}/>);
  fireEvent.click(screen.getByRole('combobox'));
  expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');
});

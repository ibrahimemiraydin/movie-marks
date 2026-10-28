// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { locale, runName, setLanguage, t, useLanguage } from './i18n';
import { english } from './translations';

afterEach(() => { cleanup(); setLanguage('tr'); });
function Probe() { useLanguage(); return <p>{t('Kütüphane')}</p>; }
it('açık bileşenleri anında günceller; belge dili ve tarih yerelini değiştirir', () => {
  render(<Probe/>);
  expect(screen.getByText('Kütüphane')).toBeTruthy();
  act(() => setLanguage('en'));
  expect(screen.getByText('Library')).toBeTruthy();
  expect(document.documentElement.lang).toBe('en');
  expect(locale()).toBe('en-US');
  act(() => setLanguage('tr'));
  expect(screen.getByText('Kütüphane')).toBeTruthy();
  expect(locale()).toBe('tr-TR');
});
it('değişkenleri ve kayıtlı izleme turu adlarını çevirir; kişisel metni korur', () => {
  setLanguage('en');
  expect(t('{0} listene eklendi.', 'Dexter')).toBe('Dexter added to your library.');
  expect(runName('İlk izleme')).toBe('First watch');
  expect(runName('3. izleme')).toBe('Watch 3');
  expect(runName('Ailemle izleme')).toBe('Ailemle izleme');
  expect(t('Bilinmeyen kullanıcı metni')).toBe('Bilinmeyen kullanıcı metni');
});
it('çeviriler tüm değişken yerlerini aynı sayıda korur', () => {
  for (const [key, value] of Object.entries(english)) {
    expect(value.match(/\{\d+\}/g)?.sort() ?? [], key).toEqual(key.match(/\{\d+\}/g)?.sort() ?? []);
  }
});

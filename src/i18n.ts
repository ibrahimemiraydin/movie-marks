import { useSyncExternalStore } from 'react';
import { english } from './translations';

export type Language = 'tr' | 'en';
let language: Language = 'tr';
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const locale = () => language === 'en' ? 'en-US' : 'tr-TR';
export function setLanguage(value: unknown) {
  language = value === 'en' ? 'en' : 'tr';
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  listeners.forEach(listener => listener());
}
export function useLanguage() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getLanguage);
}
/** Turkish source keys keep the default interface and existing local data compatible. */
export function t(key: string, ...values: (string | number)[]): string {
  const text = language === 'en' ? (values[0] === 1 ? english[`${key}__one`] : undefined) ?? english[key] ?? key : key;
  return text.replace(/\{(\d+)\}/g, (match, index: string) => String(values[Number(index)] ?? match));
}

export function runName(name: string) {
  if (name === 'İlk izleme') return t(name);
  const match = /^(\d+)\. izleme$/.exec(name);
  return match ? t('{0}. izleme', match[1]!) : name;
}

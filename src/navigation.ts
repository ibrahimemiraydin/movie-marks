export type AppSection = 'library' | 'favorites' | 'collections' | 'calendar' | 'statistics';
export const sectionLabels: Record<AppSection, string> = { library: 'Kütüphane', favorites: 'Favoriler', collections: 'Koleksiyonlar', calendar: 'Takvim', statistics: 'İstatistikler' };
export function sectionFromHash(hash: string): AppSection {
  const value = hash.replace(/^#/, '');
  return Object.hasOwn(sectionLabels, value) ? value as AppSection : 'library';
}

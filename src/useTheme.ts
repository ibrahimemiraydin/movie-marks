import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
export type Theme = 'dark' | 'light';
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [themeError, setThemeError] = useState('');
  useEffect(() => {
    let active = true;
    browser.storage.local.get('theme').then(result => { if (active) setTheme(result.theme === 'light' ? 'light' : 'dark'); }).catch(() => { if (active) setThemeError('Tema tercihi okunamadı.'); });
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => { if (area === 'local' && changes.theme) setTheme(changes.theme.newValue === 'light' ? 'light' : 'dark'); };
    browser.storage.onChanged.addListener(listener);
    return () => { active = false; browser.storage.onChanged.removeListener(listener); };
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  async function changeTheme(value: Theme) {
    setThemeError('');
    try { await browser.storage.local.set({ theme: value }); setTheme(value); }
    catch { setThemeError('Tema tercihi kaydedilemedi. Tekrar dene.'); }
  }
  return { theme, changeTheme, themeError };
}

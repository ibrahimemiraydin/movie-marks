import { t, useLanguage, type Language } from './i18n';
import { useState } from 'react';
import ArchiveSettings, { type ReplaceArchive } from './ArchiveSettings';
import type { Theme } from './useTheme';
import { Moon, Sun, X } from 'lucide-react';
import { saveToken } from './storage';
import { isBackdropClick, useModal } from './useModal';

export default function SettingsPanel({ token, close, saved, theme = 'dark', onThemeChange, themeError, onLanguageChange, languageError, onArchiveReplace, archiveBusy }: { onArchiveReplace?: ReplaceArchive; archiveBusy?: boolean; onLanguageChange?: (language: Language) => void; languageError?: string; themeError?: string; theme?: Theme; onThemeChange?: (theme: Theme) => void; token: string; close: () => void; saved: (token: string) => void }) {
  const language = useLanguage();
  const dialog = useModal();
  const [draft, setDraft] = useState(token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const key = draft.trim().replace(/^Bearer\s+/i, '');
      await saveToken(key); saved(key); close();
    } catch { setError("Ayarlar kaydedilemedi. Tekrar dene."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="detail-dialog settings-dialog" aria-labelledby="settings-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (isBackdropClick(e)) close(); }}>
    <div className="detail-topbar"><h2 id="settings-title">{t("Ayarlar")}</h2><button autoFocus className="icon-button" aria-label={t("Ayarları kapat")} onClick={close}><X size={20}/></button></div>
    <div className="settings-content">
    {onLanguageChange && <section className="appearance-settings"><h3>{t('Dil')}</h3><div className="theme-options" role="group" aria-label={t('Dil')}><button type="button" aria-pressed={language === 'tr'} onClick={() => onLanguageChange('tr')}>Türkçe</button><button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageChange('en')}>English</button></div>{languageError && <p className="error" role="alert">{t(languageError)}</p>}</section>}
    {onThemeChange && <section className="appearance-settings"><h3>{t("Görünüm")}</h3><div className="theme-options" role="group" aria-label={t("Tema")}><button type="button" aria-pressed={theme === 'light'} onClick={() => onThemeChange('light')}><Sun size={17}/>{t("Aydınlık")}</button><button type="button" aria-pressed={theme === 'dark'} onClick={() => onThemeChange('dark')}><Moon size={17}/>{t("Karanlık")}</button></div>{themeError && <p className="error" role="alert">{t(themeError)}</p>}</section>}
    <form onSubmit={submit} className="settings-panel"><h3>{t("TMDB bağlantısı")}</h3><label htmlFor="token">{t("API Read Access Token")}</label><input id="token" type="password" autoComplete="off" value={draft} onChange={e => setDraft(e.target.value)} placeholder={t("TMDB erişim anahtarını yapıştır")}/><p>{t("Anahtar bu tarayıcı profilinde yerel olarak saklanır.")}</p>{error && <div className="error" role="alert">{t(error)}</div>}<div className="flex items-center justify-between gap-3"><a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">{t("TMDB’den anahtar al ↗")}</a><button className="primary-button" disabled={busy}>{busy ? t("Kaydediliyor…") : t("Kaydet")}</button></div></form>
    {onArchiveReplace && <ArchiveSettings busy={archiveBusy} replace={onArchiveReplace}/>}
    </div>
  </dialog>;
}

import { useRef, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { archiveCsv, makeBackup, type Archive, type Backup } from './archive';
import { downloadArchive, readBackupFile } from './archiveFiles';
import { readArchive } from './archiveStorage';
import { todayLocal } from './personal';
import { locale, t, useLanguage } from './i18n';

export type ReplaceArchive = (archive: Archive, reset: boolean) => Promise<boolean>;
export default function ArchiveSettings({ busy = false, replace }: { busy?: boolean; replace: ReplaceArchive }) {
  useLanguage();
  const fileInput = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [filename, setFilename] = useState('');
  const [reset, setReset] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const disabled = busy || working;
  async function exportFile(csv: boolean) {
    if (lock.current || busy) return;
    lock.current = true; setWorking(true); setError(''); setMessage('');
    try {
      const archive = await readArchive();
      downloadArchive(csv ? archiveCsv(archive) : JSON.stringify(makeBackup(archive), null, 2), `moviemarks-${csv ? 'library' : 'backup'}-${todayLocal()}.${csv ? 'csv' : 'json'}`, csv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8');
      setMessage('Dosya indirilmeye hazırlandı.');
    } catch { setError('Arşiv dışa aktarılamadı. Tekrar dene.'); }
    finally { lock.current = false; setWorking(false); }
  }
  async function chooseFile(file?: File) {
    if (!file || lock.current || busy) return;
    lock.current = true; setWorking(true); setPreview(null); setReset(false); setError(''); setMessage('');
    try { setPreview(await readBackupFile(file)); setFilename(file.name); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Yedek dosyası okunamadı.'); }
    finally { lock.current = false; setWorking(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function commit(clear: boolean) {
    if (lock.current || busy || (!clear && !preview)) return;
    lock.current = true; setWorking(true); setError(''); setMessage('');
    try {
      if (!await replace(clear ? { library: [], collections: [] } : preview!, clear)) { setError('Arşiv kaydedilemedi. Önceki kayıtlar korundu; tekrar dene.'); return; }
      setPreview(null); setReset(false); setMessage(clear ? 'Arşiv temizlendi.' : 'Yedek geri yüklendi.');
    } catch { setError('Arşiv kaydedilemedi. Önceki kayıtlar korundu; tekrar dene.'); }
    finally { lock.current = false; setWorking(false); }
  }
  return <section className="archive-settings" aria-labelledby="archive-settings-title">
    <h3 id="archive-settings-title">{t('Arşiv ve yedekleme')}</h3><p>{t('JSON; yapımları, favorileri, puanları, notları, izleme tarihlerini, bölüm turlarını ve koleksiyonları içerir. TMDB anahtarı ve görünüm tercihleri yedeğe eklenmez.')}</p>
    <div className="archive-file-actions"><button className="secondary-button" disabled={disabled} onClick={() => void exportFile(false)}><FileJson size={15}/>{t('JSON dışa aktar')}</button><button className="secondary-button" disabled={disabled} onClick={() => void exportFile(true)}><FileSpreadsheet size={15}/>{t('CSV dışa aktar')}</button><button className="secondary-button" disabled={disabled} onClick={() => fileInput.current?.click()}><Upload size={15}/>{t('JSON içe aktar')}</button></div>
    <input ref={fileInput} type="file" className="sr-only" aria-label={t('JSON yedek dosyası')} accept=".json,application/json" disabled={disabled} onChange={event => void chooseFile(event.target.files?.[0])}/>
    <p className="archive-small">{t('CSV tablo içindir; tam geri yükleme için JSON kullan. Dosyalar en fazla 20 MB olabilir.')}</p>
    {preview && <div className="archive-confirm" role="group" aria-label={t('Yedeği geri yükleme onayı')}><strong className="archive-filename">{filename}</strong><p>{t('{0} yapım · {1} koleksiyon', preview.library.length, preview.collections.length)}</p><small>{t('Yedek tarihi: {0}', new Date(preview.exportedAt).toLocaleString(locale()))}</small><p>{t('Mevcut arşivin bu yedekle değiştirilecek. Devam etmeden önce mevcut JSON yedeğini indirebilirsin.')}</p><div><button className="primary-button" disabled={disabled} onClick={() => void commit(false)}><Download size={14}/>{t('Yedeği geri yükle')}</button><button className="secondary-button" disabled={disabled} onClick={() => setPreview(null)}>{t('Vazgeç')}</button></div></div>}
    <div className="archive-reset"><div><strong>{t('Arşivi sıfırla')}</strong><p>{t('Yapımlar, favoriler, notlar, puanlar, bölüm ilerlemesi ve koleksiyonlar silinir. TMDB bağlantısı ve tercihler korunur.')}</p></div><button className="danger-button" disabled={disabled} onClick={() => { setReset(true); setPreview(null); setError(''); setMessage(''); }}><Trash2 size={14}/>{t('Arşivi temizle')}</button></div>
    {reset && <div className="archive-confirm archive-confirm-danger" role="group" aria-label={t('Arşivi silme onayı')}><p>{t('Arşivin kalıcı olarak silinecek. Geri yükleyebilmek için önce JSON yedeğini indir.')}</p><div><button className="danger-button" disabled={disabled} onClick={() => void commit(true)}><Trash2 size={14}/>{t('Evet, arşivi sil')}</button><button className="secondary-button" disabled={disabled} onClick={() => setReset(false)}>{t('Vazgeç')}</button></div></div>}
    {error && <p className="error" role="alert">{t(error)}</p>}{message && <p className="personal-success" role="status">{t(message)}</p>}
  </section>;
}

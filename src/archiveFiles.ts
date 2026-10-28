import { MAX_BACKUP_BYTES, parseBackup } from './archive';

export async function readBackupFile(file: File) {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('Yedek dosyası en fazla 20 MB olabilir.');
  return parseBackup(await file.text());
}
export function downloadArchive(source: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([source], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor);
  try { anchor.click(); }
  finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

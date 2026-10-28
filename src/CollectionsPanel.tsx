import { t, useLanguage } from './i18n';
import { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { isBackdropClick, useModal } from './useModal';
import type { Collection, CommitCollection } from './collections';
import CollectionMembership from './CollectionMembership';
import type { Media } from './tmdb';

export default function CollectionsPanel({ collections, busy, commit, close, item }: { collections: Collection[]; busy?: boolean; commit: CommitCollection; close: () => void; item?: Media }) {
  useLanguage();
  const dialog = useModal();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [rename, setRename] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  return <dialog ref={dialog} className="detail-dialog collections-dialog" aria-labelledby="collections-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (isBackdropClick(e)) close(); }}>
    <div className="detail-topbar"><h2 id="collections-title">{item ? t("Koleksiyona ekle") : t("Koleksiyonları yönet")}</h2><button autoFocus className="icon-button" aria-label={t("Koleksiyon panelini kapat")} onClick={close}><X size={20}/></button></div><div className="collections-body">
      {item ? <CollectionMembership item={item} collections={collections} busy={busy} commit={commit}/> : <>
        <form className="collection-create" onSubmit={async e => { e.preventDefault(); setError(''); const result = await commit({ type: 'create', name }); if (result) setError(result); else setName(''); }}><input aria-label={t("Yeni koleksiyon adı")} value={name} disabled={busy} maxLength={80} placeholder={t("Örn. En İyi Bilim Kurgu Filmleri")} onChange={e => setName(e.target.value)}/><button className="primary-button" disabled={busy || !name.trim()}>{t("Oluştur")}</button></form>
        {collections.length === 0 && <p className="search-message">{t("Henüz koleksiyon oluşturmadın.")}</p>}
        {collections.map(c => <div key={c.id} className="collection-manage-row">{editing === c.id ? <form className="collection-create" onSubmit={async e => { e.preventDefault(); setError(''); const result = await commit({ type: 'rename', id: c.id, name: rename }); if (result) setError(result); else setEditing(null); }}><input aria-label={t("Koleksiyonun yeni adı")} value={rename} maxLength={80} disabled={busy} onChange={e => setRename(e.target.value)}/><button className="primary-button" disabled={busy || !rename.trim()}>{t("Kaydet")}</button><button className="secondary-button" type="button" onClick={() => setEditing(null)}>{t("Vazgeç")}</button></form> : <><strong>{c.name}</strong><div className="collection-row-actions"><button className="secondary-button" disabled={busy} aria-label={t("{0} adını değiştir", c.name)} onClick={() => { setEditing(c.id); setRename(c.name); setDeleting(null); }}><Pencil size={14}/>{t("Adını değiştir")}</button><button className="danger-button" disabled={busy} aria-label={t("{0} koleksiyonunu sil", c.name)} onClick={() => { setDeleting(c.id); setEditing(null); }}><Trash2 size={14}/>{t("Sil")}</button></div></>}
          {deleting === c.id && <div className="collection-delete"><p>“{c.name}{t("” silinsin mi? İçindeki yapımlar kişisel listende kalır.")}</p><button className="danger-button" disabled={busy} onClick={async () => { setError(''); const result = await commit({ type: 'delete', id: c.id }); if (result) setError(result); else setDeleting(null); }}>{t("Koleksiyonu sil")}</button><button className="secondary-button" disabled={busy} onClick={() => setDeleting(null)}>{t("Vazgeç")}</button></div>}
        </div>)}
        {error && <p className="error" role="alert">{t(error)}</p>}
      </>}
    </div>
  </dialog>;
}

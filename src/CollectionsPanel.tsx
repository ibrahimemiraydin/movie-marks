import { useState } from 'react';
import { X } from 'lucide-react';
import { isBackdropClick, useModal } from './useModal';
import type { Collection, CommitCollection } from './collections';
import CollectionMembership from './CollectionMembership';
import type { Media } from './tmdb';

export default function CollectionsPanel({ collections, busy, commit, close, item }: { collections: Collection[]; busy?: boolean; commit: CommitCollection; close: () => void; item?: Media }) {
  const dialog = useModal();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [rename, setRename] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  return <dialog ref={dialog} className="detail-dialog collections-dialog" aria-labelledby="collections-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (isBackdropClick(e)) close(); }}>
    <div className="detail-topbar"><h2 id="collections-title">{item ? 'Koleksiyona ekle' : 'Koleksiyonları yönet'}</h2><button autoFocus className="icon-button" aria-label="Koleksiyon panelini kapat" onClick={close}><X size={20}/></button></div><div className="collections-body">
      {item ? <CollectionMembership item={item} collections={collections} busy={busy} commit={commit}/> : <>
        <form className="collection-create" onSubmit={async e => { e.preventDefault(); setError(''); const result = await commit({ type: 'create', name }); if (result) setError(result); else setName(''); }}><input aria-label="Yeni koleksiyon adı" value={name} disabled={busy} maxLength={80} placeholder="Örn. En İyi Bilim Kurgu Filmleri" onChange={e => setName(e.target.value)}/><button className="primary-button" disabled={busy || !name.trim()}>Oluştur</button></form>
        {collections.length === 0 && <p className="search-message">Henüz koleksiyon oluşturmadın.</p>}
        {collections.map(c => <div key={c.id} className="collection-manage-row">{editing === c.id ? <form className="collection-create" onSubmit={async e => { e.preventDefault(); setError(''); const result = await commit({ type: 'rename', id: c.id, name: rename }); if (result) setError(result); else setEditing(null); }}><input aria-label="Koleksiyonun yeni adı" value={rename} maxLength={80} disabled={busy} onChange={e => setRename(e.target.value)}/><button disabled={busy || !rename.trim()}>Kaydet</button><button type="button" onClick={() => setEditing(null)}>Vazgeç</button></form> : <><strong>{c.name}</strong><div className="collection-row-actions"><button disabled={busy} aria-label={`${c.name} adını değiştir`} onClick={() => { setEditing(c.id); setRename(c.name); setDeleting(null); }}>Adını değiştir</button><button disabled={busy} aria-label={`${c.name} koleksiyonunu sil`} onClick={() => { setDeleting(c.id); setEditing(null); }}>Sil</button></div></>}
          {deleting === c.id && <div className="collection-delete"><p>“{c.name}” silinsin mi? İçindeki yapımlar kişisel listende kalır.</p><button disabled={busy} onClick={async () => { setError(''); const result = await commit({ type: 'delete', id: c.id }); if (result) setError(result); else setDeleting(null); }}>Koleksiyonu sil</button><button disabled={busy} onClick={() => setDeleting(null)}>Vazgeç</button></div>}
        </div>)}
        {error && <p className="error" role="alert">{error}</p>}
      </>}
    </div>
  </dialog>;
}

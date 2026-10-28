import { useState } from 'react';
import { mediaKey, type Media } from './tmdb';
import type { Collection, CommitCollection } from './collections';

export default function CollectionMembership({ item, collections, busy, commit }: { item: Media; collections: Collection[]; busy?: boolean; commit: CommitCollection }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  async function create(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const result = await commit({ type: 'create', name, mediaKey: mediaKey(item) });
    if (result) setError(result); else setName('');
  }
  return <section className="collection-membership"><h3>Koleksiyonları · {item.title}</h3>
    <div className="collection-checkboxes">{collections.length === 0 && <p className="filter-note">İlk koleksiyonunu oluştur ve bu yapımı ekle.</p>}{collections.map(c => <label key={c.id}><input type="checkbox" disabled={busy} checked={c.mediaKeys.includes(mediaKey(item))} onChange={async e => { setError(''); const result = await commit({ type: 'membership', id: c.id, mediaKey: mediaKey(item), included: e.target.checked }); if (result) setError(result); }}/><span>{c.name}</span></label>)}</div>
    <form onSubmit={create} className="collection-create"><label className="sr-only" htmlFor={`new-collection-${mediaKey(item)}`}>Yeni koleksiyon adı</label><input id={`new-collection-${mediaKey(item)}`} value={name} maxLength={80} disabled={busy} onChange={e => setName(e.target.value)} placeholder="Yeni koleksiyon adı…"/><button className="primary-button" disabled={busy || !name.trim()}>Oluştur ve ekle</button></form>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}

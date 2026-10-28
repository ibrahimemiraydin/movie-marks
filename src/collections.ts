export type Collection = { id: string; name: string; createdAt: string; mediaKeys: string[] };
export type CollectionAction =
  | { type: 'create'; name: string; mediaKey?: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'delete'; id: string }
  | { type: 'membership'; id: string; mediaKey: string; included: boolean };

export function applyCollectionAction(collections: Collection[], action: CollectionAction): Collection[] {
  if (action.type === 'create' || action.type === 'rename') {
    const name = action.name.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 80) throw new Error('Koleksiyon adı 1–80 karakter olmalı.');
    if (collections.some(c => c.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR') && (action.type !== 'rename' || c.id !== action.id))) throw new Error('Bu adda bir koleksiyon zaten var.');
    if (action.type === 'create') return [...collections, { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), mediaKeys: action.mediaKey ? [action.mediaKey] : [] }];
    if (!collections.some(c => c.id === action.id)) throw new Error('Koleksiyon bulunamadı.');
    return collections.map(c => c.id === action.id ? { ...c, name } : c);
  }
  if (!collections.some(c => c.id === action.id)) throw new Error('Koleksiyon bulunamadı.');
  if (action.type === 'delete') return collections.filter(c => c.id !== action.id);
  return collections.map(c => c.id !== action.id ? c : { ...c, mediaKeys: action.included ? [...new Set([...c.mediaKeys, action.mediaKey])] : c.mediaKeys.filter(key => key !== action.mediaKey) });
}
export const removeFromCollections = (collections: Collection[], key: string) => collections.map(c => ({ ...c, mediaKeys: c.mediaKeys.filter(k => k !== key) }));
export type CommitCollection = (action: CollectionAction) => Promise<string | null>;

import { expect, it } from 'vitest';
import { applyCollectionAction, removeFromCollections, type Collection } from './collections';
const base: Collection[] = [{ id: 'a', name: 'Bilim Kurgu', createdAt: '2024-01-01', mediaKeys: ['movie:1'] }, { id: 'b', name: 'Diziler', createdAt: '2024-01-02', mediaKeys: ['tv:1'] }];
it('koleksiyon oluşturur; boş, uzun ve aynı adları reddeder', () => {
  const next = applyCollectionAction(base, { type: 'create', name: '  En   İyi Filmler ', mediaKey: 'movie:2' });
  expect(next[2]).toMatchObject({ id: expect.any(String), name: 'En İyi Filmler', createdAt: expect.any(String), mediaKeys: ['movie:2'] });
  expect(() => applyCollectionAction(base, { type: 'create', name: 'BİLİM KURGU' })).toThrow('zaten var');
  expect(() => applyCollectionAction(base, { type: 'create', name: ' ' })).toThrow();
  expect(() => applyCollectionAction(base, { type: 'create', name: 'x'.repeat(81) })).toThrow();
  expect(base).toHaveLength(2);
});
it('aynı yapımı çoklu koleksiyonda tutar, tekrar eklemeyi tekilleştirir', () => {
  let next = applyCollectionAction(base, { type: 'membership', id: 'b', mediaKey: 'movie:1', included: true });
  next = applyCollectionAction(next, { type: 'membership', id: 'b', mediaKey: 'movie:1', included: true });
  expect(next[1]!.mediaKeys).toEqual(['tv:1', 'movie:1']);
  expect(next[0]!.mediaKeys).toEqual(['movie:1']);
  next = applyCollectionAction(next, { type: 'membership', id: 'a', mediaKey: 'movie:1', included: false });
  expect(next[0]!.mediaKeys).toEqual([]);
  expect(next[1]!.mediaKeys).toContain('movie:1');
});
it('ad değişimi üyelikleri korur; koleksiyon ve yapım temizliğini ayırır', () => {
  const renamed = applyCollectionAction(base, { type: 'rename', id: 'a', name: 'Favori Bilim Kurgu' });
  expect(renamed[0]!.mediaKeys).toEqual(['movie:1']);
  expect(applyCollectionAction(renamed, { type: 'delete', id: 'a' })).toEqual([base[1]]);
  expect(removeFromCollections(base, 'movie:1')[1]!.mediaKeys).toEqual(['tv:1']);
  expect(removeFromCollections(base, 'movie:1')[0]!.mediaKeys).toEqual([]);
  expect(() => applyCollectionAction(base, { type: 'rename', id: 'missing', name: 'Yeni' })).toThrow('bulunamadı');
});

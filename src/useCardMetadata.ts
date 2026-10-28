import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getFilterMetadata, mediaKey, type Media } from './tmdb';

type CardMetadata = { runtime: number | null; seasonCount: number | null; fetchedAt: number };
type Cache = Record<string, CardMetadata>;
const fresh = (value: CardMetadata | undefined) => value && Date.now() - value.fetchedAt < 7 * 24 * 60 * 60 * 1000;
export default function useCardMetadata(items: Media[], token: string) {
  const [cache, setCache] = useState<Cache>({});
  const signature = items.map(item => `${mediaKey(item)}:${item.runtime}:${item.seasonCount}`).join('|');
  useEffect(() => {
    if (!token || !items.length) return;
    const controller = new AbortController();
    void (async () => {
      const stored = await browser.storage.local.get('cardMetadata');
      const raw = stored.cardMetadata;
      const known: Cache = raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, CardMetadata] => {
        const value = entry[1] as CardMetadata | null;
        return !!value && Number.isFinite(value.fetchedAt) && (value.runtime === null || Number.isFinite(value.runtime) && value.runtime > 0) && (value.seasonCount === null || Number.isInteger(value.seasonCount) && value.seasonCount >= 0);
      })) : {};
      if (controller.signal.aborted) return;
      setCache(known);
      const pending = items.filter(item => (item.media_type === 'movie' ? item.runtime === undefined : item.seasonCount === undefined) && !fresh(known[mediaKey(item)]));
      let cursor = 0;
      const updates: Cache = {};
      await Promise.all(Array.from({ length: Math.min(2, pending.length) }, async () => {
        while (cursor < pending.length && !controller.signal.aborted) {
          const item = pending[cursor++]!;
          try {
            const data = await getFilterMetadata(item, token, controller.signal);
            if (controller.signal.aborted) return;
            const value = { runtime: data.runtime, seasonCount: data.seasonCount, fetchedAt: Date.now() };
            updates[mediaKey(item)] = value;
            setCache(current => ({ ...current, [mediaKey(item)]: value }));
          } catch { /* Missing optional information never blocks library use. */ }
        }
      }));
      if (!controller.signal.aborted && Object.keys(updates).length) {
        const latest = await browser.storage.local.get('cardMetadata');
        const merged = { ...known, ...(latest.cardMetadata ?? {}), ...updates } as Cache;
        const limited = Object.fromEntries(Object.entries(merged).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt).slice(0, 2000));
        await browser.storage.local.set({ cardMetadata: limited });
      }
    })().catch(() => { /* Optional cache unavailable. */ });
    return () => controller.abort();
  }, [signature, token]);
  return (item: Media) => ({ runtime: item.runtime ?? cache[mediaKey(item)]?.runtime, seasonCount: item.seasonCount ?? cache[mediaKey(item)]?.seasonCount });
}

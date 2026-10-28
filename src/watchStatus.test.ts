import { expect, it } from 'vitest';
import { getWatchStatus, watchStatuses, type WatchStatus } from './watchStatus';
it('eski ve bilinmeyen durumları veri değiştirmeden varsayılana eşler', () => {
  const old = { watchStatus: undefined };
  expect(getWatchStatus(old)).toBe('planned');
  expect(old.watchStatus).toBeUndefined();
  expect(getWatchStatus({ watchStatus: 'invalid' as WatchStatus })).toBe('planned');
  for (const status of Object.keys(watchStatuses) as WatchStatus[]) expect(getWatchStatus({ watchStatus: status })).toBe(status);
});

import { t, useLanguage } from './i18n';
import Select from './Select';
import { watchStatuses, type WatchStatus } from './watchStatus';

export default function WatchStatusSelect({ value, onChange, disabled, title, compact }: {
  value: WatchStatus; onChange: (value: WatchStatus) => void; disabled?: boolean; title: string; compact?: boolean;
}) {
  useLanguage();
  return <Select className={`watch-status status-${value} ${compact ? 'status-badge' : ''}`} label={t("{0} izleme durumu", title)} value={value} disabled={disabled} onChange={v => onChange(v as WatchStatus)} options={Object.entries(watchStatuses).map(([value, label]) => ({ value, label: t(label) }))}/>;
}

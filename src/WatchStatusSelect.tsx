import Select from './Select';
import { watchStatuses, type WatchStatus } from './watchStatus';

export default function WatchStatusSelect({ value, onChange, disabled, title }: {
  value: WatchStatus; onChange: (value: WatchStatus) => void; disabled?: boolean; title: string;
}) {
  return <Select className={`watch-status status-${value}`} label={`${title} izleme durumu`} value={value} disabled={disabled} onChange={v => onChange(v as WatchStatus)} options={Object.entries(watchStatuses).map(([value, label]) => ({ value, label }))}/>;
}

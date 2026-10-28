import Select from './Select';
import { CalendarDays, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { todayLocal, validatePersonal, type PersonalData } from './personal';
import type { Media } from './tmdb';

export default function PersonalEditor({ item, busy, save }: { item: Media; busy?: boolean; save: (data: PersonalData) => Promise<boolean> }) {
  const [rating, setRating] = useState(item.personalRating == null ? '' : String(item.personalRating));
  const [notes, setNotes] = useState(item.notes ?? '');
  const [date, setDate] = useState(item.watchedOn ?? '');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [rewatchDate, setRewatchDate] = useState(todayLocal());
  const [rewatchError, setRewatchError] = useState('');
  const [rewatchBusy, setRewatchBusy] = useState(false);
  const [dateDirty, setDateDirty] = useState(false);
  useEffect(() => { if (!dateDirty) setDate(item.watchedOn ?? ''); }, [item.watchedOn, dateDirty]);
  useEffect(() => {
    if (dirty) return;
    setRating(item.personalRating == null ? '' : String(item.personalRating)); setNotes(item.notes ?? ''); setDate(item.watchedOn ?? '');
  }, [item.personalRating, item.notes, item.watchedOn, dirty]);
  function change() { setDirty(true); setSaved(false); setError(''); }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = { personalRating: rating === '' ? null : Number(rating), notes, ...(dateDirty ? { watchedOn: date } : {}) };
    const invalid = validatePersonal(data);
    if (invalid) { setError(invalid); return; }
    if (await save(data)) { setDirty(false); setDateDirty(false); setSaved(true); setError(''); }
    else setError('Kişisel bilgilerin kaydedilemedi. Notun burada korunuyor; tekrar deneyebilirsin.');
  }
  async function addRewatch() {
    const invalid = validatePersonal({ watchedOn: rewatchDate });
    if (!rewatchDate || invalid) { setRewatchError(invalid || 'Yeniden izleme tarihi seç.'); return; }
    setRewatchBusy(true); setRewatchError('');
    const ok = await save({ rewatches: [...(item.rewatches ?? []), { id: crypto.randomUUID(), date: rewatchDate }] });
    if (!ok) setRewatchError('Yeniden izleme kaydedilemedi. Tekrar dene.');
    setRewatchBusy(false);
  }
  return <form className="personal-editor" onSubmit={submit}>
    <h3>Kişisel alanım</h3>
    <fieldset disabled={busy}><div className="personal-fields"><label>Puanım <span>/ 10</span><Select label="Kişisel puanım" value={rating} disabled={busy} onChange={value => { change(); setRating(value); }} options={[{ value: '', label: 'Puan verilmedi' }, ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} / 10` }))]}/></label><label>İzleme tarihi<input aria-label="İzleme tarihi" type="date" max={todayLocal()} value={date} onChange={e => { change(); setDateDirty(true); setDate(e.target.value); }}/></label></div>
      <div className="date-actions"><button type="button" onClick={() => { change(); setDateDirty(true); setDate(todayLocal()); }}>Bugün</button>{date && <button type="button" onClick={() => { change(); setDateDirty(true); setDate(''); }}>Tarihi temizle</button>}</div>
      <label className="notes-label">Notlarım<textarea aria-label="Kişisel notlarım" rows={4} maxLength={5000} value={notes} onChange={e => { change(); setNotes(e.target.value); }} placeholder="Bu yapım hakkında kendine bir not bırak…"/></label>
      <div className="personal-save"><span>{notes.length} / 5000{dirty ? ' · Kaydedilmedi' : ''}</span><button className="primary-button" disabled={busy || !dirty}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
    </fieldset>
    <section className="rewatch-list"><h4><RotateCcw size={15}/>Yeniden izleme <span>{item.rewatches?.length ?? 0} kayıt</span></h4><div className="rewatch-add"><label>Yeniden izleme tarihi<input aria-label="Yeniden izleme tarihi" type="date" max={todayLocal()} value={rewatchDate} disabled={busy || rewatchBusy} onChange={e => setRewatchDate(e.target.value)}/></label><button className="primary-button" type="button" disabled={busy || rewatchBusy} onClick={() => void addRewatch()}>İzlemeyi kaydet</button></div>{[...(item.rewatches ?? [])].sort((a,b) => b.date.localeCompare(a.date)).map(r => <div className="rewatch-entry" key={r.id}><span className="rewatch-date"><CalendarDays size={15}/>{new Date(`${r.date}T12:00:00`).toLocaleDateString('tr-TR')}</span><button className="danger-button" type="button" disabled={busy || rewatchBusy} aria-label={`${r.date} yeniden izleme kaydını sil`} onClick={async () => { setRewatchError(''); if (!await save({ rewatches: (item.rewatches ?? []).filter(entry => entry.id !== r.id) })) setRewatchError('Kayıt silinemedi. Tekrar dene.'); }}><Trash2 size={13}/>Sil</button></div>)}{rewatchError && <p className="error" role="alert">{rewatchError}</p>}</section>
    {error && <p className="error" role="alert">{error}</p>}{saved && <p className="personal-success" role="status">Kişisel bilgilerin kaydedildi.</p>}
  </form>;
}

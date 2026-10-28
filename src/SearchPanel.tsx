import { t, useLanguage } from './i18n';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Film, LoaderCircle, Plus, Search, UserRound, X } from 'lucide-react';
import { mediaKey, personCredits, searchAll, type Media, type Person, type SearchResults } from './tmdb';

export default function SearchPanel({ token, library, busy, add, openSettings, openDetails, initialQuery = '' }: {
  initialQuery?: string; token: string; library: Media[]; busy: boolean; add: (item: Media) => void; openSettings: () => void; openDetails?: (item: Media) => void;
}) {
  const language = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(!!initialQuery);
  const [person, setPerson] = useState<Person | null>(null);
  const [results, setResults] = useState<SearchResults>({ media: [], people: [] });
  const [credits, setCredits] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const skipFocus = useRef(false);
  function closeSearch() { skipFocus.current = true; inputRef.current?.focus(); skipFocus.current = false; setOpen(false); }
  const areaRef = useRef<HTMLElement>(null);
  useEffect(() => { if (initialQuery) inputRef.current?.focus(); }, [initialQuery]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !areaRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  useEffect(() => {
    const controller = new AbortController();
    setError(''); setResults({ media: [], people: [] }); setCredits([]);
    setLoading(false);
    if (!open || !token || (!person && !query.trim())) return () => controller.abort();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        if (person) {
          const items = await personCredits(person.id, token, controller.signal);
          if (!controller.signal.aborted) setCredits(items);
        } else {
          const items = await searchAll(query.trim(), token, controller.signal);
          if (!controller.signal.aborted) setResults(items);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof TypeError ? t("Bağlantı kurulamadı. Tekrar dene.") : e instanceof Error ? e.message : t("Arama yapılamadı."));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, person ? 0 : 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, person, token, open, language]);

  const media = person ? credits : results.media;
  return <section ref={areaRef} className="search-area" onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSearch(); }
    else if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) && (e.target !== inputRef.current || e.key.startsWith('Arrow'))) {
      const buttons = [...(areaRef.current?.querySelectorAll<HTMLButtonElement>('.search-primary') ?? [])];
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : e.key === 'ArrowDown' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
      e.preventDefault(); buttons[next]?.focus();
    } else if (open && e.key === 'Enter' && e.target === inputRef.current) { const first = areaRef.current?.querySelector<HTMLButtonElement>('.search-primary'); if (first) { e.preventDefault(); first.click(); } }
  }}>
    <div className="search-box"><Search size={19}/><input ref={inputRef} aria-describedby="search-keyboard-hint" aria-label={t("Film, dizi veya kişi ara")} aria-expanded={open} aria-controls="search-results" placeholder={t("Film, dizi veya kişi ara…")} value={query} onFocus={() => { if (!skipFocus.current) setOpen(true); }} onChange={e => { setQuery(e.target.value); setPerson(null); setOpen(true); }}/>{query && <button className="icon-button" aria-label={t("Aramayı temizle")} onClick={() => { setQuery(''); setPerson(null); }}><X size={16}/></button>}</div>
    {open && <div className="search-panel" id="search-results"><div className="search-panel-heading"><div className="flex items-center gap-2">{person && <button className="icon-button" aria-label={t("Arama sonuçlarına dön")} onClick={() => setPerson(null)}><ArrowLeft size={16}/></button>}<h2>{person ? `${person.name} · ${t("Film ve diziler")}` : t("Arama")}</h2></div><button className="icon-button" aria-label={t("Aramayı kapat")} onClick={closeSearch}><X size={17}/></button></div>
      <p className="search-keyboard-hint" id="search-keyboard-hint">{t("↑ ↓ gezin · Enter aç · Esc kapat")}</p><div className="search-results">
        {!token ? <div className="search-message"><p>{t("Arama için TMDB erişim anahtarını ekle.")}</p><button className="primary-button" onClick={openSettings}>{t("TMDB’yi bağla")}</button></div> : loading ? <div className="search-loading"><div className="search-message" role="status"><LoaderCircle size={20} className="animate-spin"/>{t("Aranıyor…")}</div><div className="search-skeleton" aria-hidden="true">{[0, 1, 2].map(i => <div key={i}><span/><div><i/><i/></div></div>)}</div></div> : error ? <div className="error" role="alert">{t(error)}</div> : !person && !query.trim() ? <p className="search-message">{t("Film, dizi, oyuncu, yönetmen veya yaratıcı adı yaz.")}</p> : <>
          {!person && results.people.length > 0 && <><h3 className="result-label">{t("Kişiler")}</h3>{results.people.map(p => <button key={p.id} className="person-row search-primary" onClick={() => setPerson(p)}><span className="person-avatar">{p.profile_path ? <img src={`https://image.tmdb.org/t/p/w185${p.profile_path}`} alt=""/> : <UserRound size={20}/>}</span><span><strong>{p.name}</strong><small>{t("Film ve dizilerini gör →")}</small><span className="person-role">{t(p.department === 'Acting' ? 'Oyuncu' : p.department === 'Directing' ? 'Yönetmen' : p.department === 'Writing' ? 'Yazar' : p.department === 'Production' ? 'Yapımcı' : 'Kişi')}</span></span></button>)}</>}
          {(['movie', 'tv'] as const).filter(type => media.some(item => item.media_type === type)).map(type => <section className="search-group" key={type} aria-label={t(type === 'movie' ? 'Filmler' : 'Diziler')}><h3 className="result-label">{t(type === 'movie' ? 'Filmler' : 'Diziler')}<span>{media.filter(item => item.media_type === type).length}</span></h3>{media.filter(item => item.media_type === type).map(item => { const saved = library.some(m => mediaKey(m) === mediaKey(item)); return <article className="search-result-row" key={mediaKey(item)}><button data-open-details className="result-poster" aria-label={t("{0} afişinden detayları aç", item.title)} onClick={() => { setOpen(false); openDetails?.(item); }}>{item.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" loading="lazy"/> : <Film size={18}/>}</button><div className="result-info"><h3><button data-open-details className="title-button search-primary" onClick={() => { setOpen(false); openDetails?.(item); }}>{item.title}</button></h3><p>{item.media_type === 'movie' ? t("Film") : t("Dizi")}{item.year ? ` · ${item.year}` : ''}</p></div><button className={`result-add ${saved ? 'is-saved' : ''}`} disabled={busy || saved} aria-label={`${item.title} ${saved ? t("listemde") : t("listeye ekle")}`} onClick={() => add(item)}>{saved ? <Check size={16}/> : <Plus size={16}/>}<span>{saved ? t("Listemde") : t("Ekle")}</span></button></article>; })}</section>)}
          {media.length === 0 && (person || results.people.length === 0) && <p className="search-message">{person ? t("Bu kişi için yapım bulunamadı.") : t("Sonuç bulunamadı.")}</p>}
        </>}
      </div>
    </div>}
  </section>;
}

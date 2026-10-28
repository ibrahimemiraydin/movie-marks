import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Film, LoaderCircle, Plus, Search, UserRound, X } from 'lucide-react';
import { mediaKey, personCredits, searchAll, type Media, type Person, type SearchResults } from './tmdb';

export default function SearchPanel({ token, library, busy, add, openSettings }: {
  token: string; library: Media[]; busy: boolean; add: (item: Media) => void; openSettings: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  const [results, setResults] = useState<SearchResults>({ media: [], people: [] });
  const [credits, setCredits] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const areaRef = useRef<HTMLElement>(null);
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
        if (!controller.signal.aborted) setError(e instanceof TypeError ? 'Bağlantı kurulamadı. Tekrar dene.' : e instanceof Error ? e.message : 'Arama yapılamadı.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, person ? 0 : 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, person, token, open]);

  const media = person ? credits : results.media;
  return <section ref={areaRef} className="search-area" onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
    <div className="search-box"><Search size={19}/><input aria-label="Film, dizi veya oyuncu ara" aria-expanded={open} aria-controls="search-results" placeholder="Film, dizi veya oyuncu ara…" value={query} onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); setPerson(null); setOpen(true); }}/>{query && <button className="icon-button" aria-label="Aramayı temizle" onClick={() => { setQuery(''); setPerson(null); }}><X size={16}/></button>}</div>
    {open && <div className="search-panel" id="search-results"><div className="search-panel-heading"><div className="flex items-center gap-2">{person && <button className="icon-button" aria-label="Arama sonuçlarına dön" onClick={() => setPerson(null)}><ArrowLeft size={16}/></button>}<h2>{person ? `${person.name} · Film ve diziler` : 'Arama'}</h2></div><button className="icon-button" aria-label="Aramayı kapat" onClick={() => setOpen(false)}><X size={17}/></button></div>
      <div className="search-results">
        {!token ? <div className="search-message"><p>Arama için TMDB erişim anahtarını ekle.</p><button className="primary-button" onClick={openSettings}>TMDB’yi bağla</button></div> : loading ? <div className="search-message" role="status"><LoaderCircle size={20} className="animate-spin"/>Aranıyor…</div> : error ? <div className="error" role="alert">{error}</div> : !person && !query.trim() ? <p className="search-message">Film, dizi veya oyuncu adı yaz.</p> : <>
          {!person && results.people.length > 0 && <><h3 className="result-label">Oyuncular</h3>{results.people.map(p => <button key={p.id} className="person-row" onClick={() => setPerson(p)}><span className="person-avatar">{p.profile_path ? <img src={`https://image.tmdb.org/t/p/w185${p.profile_path}`} alt=""/> : <UserRound size={20}/>}</span><span><strong>{p.name}</strong><small>Film ve dizilerini gör →</small></span></button>)}</>}
          {media.length > 0 && <h3 className="result-label">{person ? `${media.length} yapım · Popülerliğe göre` : 'Film ve diziler'}</h3>}
          {media.map(item => { const saved = library.some(m => mediaKey(m) === mediaKey(item)); return <article className="search-result-row" key={mediaKey(item)}><div className="result-poster">{item.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" loading="lazy"/> : <Film size={18}/>}</div><div className="result-info"><h3>{item.title}</h3><p>{item.media_type === 'movie' ? 'Film' : 'Dizi'}{item.year ? ` · ${item.year}` : ''}</p></div><button className={`result-add ${saved ? 'is-saved' : ''}`} disabled={busy || saved} aria-label={`${item.title} ${saved ? 'listemde' : 'listeye ekle'}`} onClick={() => add(item)}>{saved ? <Check size={16}/> : <Plus size={16}/>}<span>{saved ? 'Listemde' : 'Ekle'}</span></button></article>; })}
          {media.length === 0 && (person || results.people.length === 0) && <p className="search-message">{person ? 'Bu oyuncu için yapım bulunamadı.' : 'Sonuç bulunamadı.'}</p>}
        </>}
      </div>
    </div>}
  </section>;
}

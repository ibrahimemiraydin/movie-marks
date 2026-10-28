import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

// Üretim arayüzünü yalnızca sahte tarayıcı deposu ve kontrollü API yanıtlarıyla açar.
// Gerçek profil, TMDB anahtarı veya kullanıcının kişisel kayıtları okunmaz.
const root = resolve('.output/chrome-mv3');
const output = resolve('artifacts/ui');
await mkdir(output, { recursive: true });
const library = [
  { id: 1, title: 'Interstellar', media_type: 'movie', year: '2014', vote_average: 8.7, personalRating: 10, watchStatus: 'completed', watchedOn: '2026-01-05', rewatches: [{ id: 'demo-rewatch', date: '2026-02-10' }], favorite: true, genres: ['Bilim Kurgu'], releaseDate: '2014-11-05', notes: 'Tekrar izlenecek.' },
  { id: 2, title: 'Dune: Part Two', media_type: 'movie', year: '2024', vote_average: 8.2, watchStatus: 'watching', genres: ['Bilim Kurgu'], releaseDate: '2024-02-27' },
  { id: 3, title: 'Severance', media_type: 'tv', year: '2022', vote_average: 8.6, watchStatus: 'watching', favorite: true, genres: ['Dram'], releaseDate: '2022-02-18' },
  { id: 4, title: 'The Batman', media_type: 'movie', year: '2022', vote_average: 7.7, personalRating: 8, watchStatus: 'watching', genres: ['Suç'], releaseDate: '2022-03-01' },
  { id: 5, title: 'Arrival', media_type: 'movie', year: '2016', vote_average: 7.6, watchStatus: 'planned', genres: ['Bilim Kurgu'], releaseDate: '2016-11-10' },
  { id: 6, title: 'The Bear', media_type: 'tv', year: '2022', vote_average: 8.2, watchStatus: 'dropped', episodeTracking: { activeRunId: 'first', includeSpecials: false, spoilerProtection: true, runs: [{ id: 'first', name: 'İlk izleme', startedAt: '2024-01-01T12:00:00Z', watched: { '1:1': '2024-01-01T12:00:00Z' } }] }, genres: ['Dram'], releaseDate: '2022-06-23' },
].map((m, i) => ({ ...m, poster_path: `/demo-${m.id}.svg`, overview: 'Bu örnek açıklama yalnızca arayüz kontrolü için kullanılır.', addedAt: `2026-01-${String(20 - i).padStart(2,'0')}T12:00:00Z` }));
const palette = [['#1b2e50','#94b5c3'],['#4a2d20','#dc9c56'],['#162837','#80bbbd'],['#361a23','#ce4b4b'],['#14282b','#96b4a0'],['#302c25','#c7bb91']];
const poster = (id) => {
  const i = Math.max(0, library.findIndex(m => m.id === id));
  const [dark, light] = palette[i];
  const title = library[i].title.toUpperCase().replaceAll('&','&amp;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="540" viewBox="0 0 360 540"><defs><linearGradient id="g" x2=".4" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><rect width="360" height="540" fill="url(#g)"/><circle cx="180" cy="225" r="118" fill="none" stroke="${light}" stroke-width="1" opacity=".5"/><circle cx="180" cy="225" r="72" fill="${dark}" opacity=".75"/><path d="M0 350L120 200L210 370L290 270L360 350V540H0Z" fill="${dark}" opacity=".8"/><path d="M0 400L90 330L190 420L260 320L360 430V540H0Z" fill="#0b1018" opacity=".6"/><text x="180" y="455" fill="#f4f5f7" text-anchor="middle" font-family="Arial" font-weight="700" font-size="${title.length > 15 ? 22 : 28}" letter-spacing="2">${title}</text><text x="180" y="483" fill="#d7dee8" text-anchor="middle" font-family="Arial" font-size="10" letter-spacing="3">DEMO POSTER</text></svg>`;
};
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { const content = await readFile(path); res.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[extname(path)] || 'application/octet-stream'); res.end(content); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 580, height: 600 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const screenshots = [];
const apiLanguages = [];
try {
  await page.context().addInitScript(({ library, base }) => {
    const data = JSON.parse(localStorage.getItem('moviemarks-ui') || 'null') ?? { library, tmdbToken: 'demo-token', collections: [{ id: 'scifi', name: 'En İyi Bilim Kurgu Filmleri', createdAt: '', mediaKeys: ['movie:1','movie:2','movie:5'] }] };
    const listeners = new Set();
    window.addEventListener('storage', event => {
      if (event.key !== 'moviemarks-ui') return;
      const next = JSON.parse(event.newValue || '{}'), previous = JSON.parse(event.oldValue || '{}'), changes = {};
      for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
        if (JSON.stringify(previous[key]) !== JSON.stringify(next[key])) changes[key] = { oldValue: previous[key], newValue: next[key] };
      }
      for (const key of Object.keys(data)) delete data[key]; Object.assign(data, next);
      listeners.forEach(fn => fn(changes, 'local'));
    });

    globalThis.browser = {
      runtime: { id: 'demo', getURL: path => `${base}${path}` }, tabs: { create: async ({ url }) => { (globalThis.__openedUrls ??= []).push(url); return {}; } },
      storage: { local: {
        get: async key => structuredClone(key == null ? data : Array.isArray(key) ? Object.fromEntries(key.map(k => [k, data[k]])) : { [key]: data[key] }),
        set: async values => { const changes = {}; for (const [key, value] of Object.entries(values)) { changes[key] = { newValue: structuredClone(value), oldValue: data[key] }; data[key] = structuredClone(value); } localStorage.setItem('moviemarks-ui', JSON.stringify(data)); listeners.forEach(fn => fn(changes, 'local')); },
      }, onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } },
    };
  }, { library, base });
  await page.context().route('https://image.tmdb.org/**', route => {
    const id = Number(route.request().url().match(/demo-(\d+)/)?.[1] ?? 3);
    return route.fulfill({ contentType: 'image/svg+xml', body: poster(id) });
  });
  await page.context().route('https://api.themoviedb.org/**', route => {
    const url = new URL(route.request().url());
    apiLanguages.push(url.searchParams.get('language'));
    const id = Number(url.pathname.split('/')[3]);
    const newPopupMovie = { ...library[4], id: 1001, title: 'Popup Yeni Film', media_type: 'movie', year: '2024', releaseDate: '2024-01-01' };
    const item = id === 1001 ? newPopupMovie : id === 99 ? { ...library[1], id: 99, title: 'Arama Demo', media_type: 'tv' } : library.find(m => m.id === id) ?? library[2];
    let json;
    if (url.pathname.endsWith('/search/multi')) json = { results: url.searchParams.get('query') === 'Popup Yeni Film' ? [{ ...newPopupMovie, release_date: newPopupMovie.releaseDate }] : url.searchParams.get('query') === 'Demo Yönetmen' ? [{ id: 525, media_type: 'person', name: 'Demo Yönetmen', known_for_department: 'Directing', profile_path: null }] : [{ ...library[1], id: 99, title: 'Arama Demo', name: 'Arama Demo', media_type: 'tv' }] };
    else if (url.pathname.endsWith('/combined_credits')) json = { cast: [{ ...library[1], media_type: 'movie', popularity: 10 }], crew: [{ ...library[1], media_type: 'movie', job: 'Director', popularity: 10 }, { ...library[2], media_type: 'tv', name: library[2].title, job: 'Creator', popularity: 9 }] };
    else if (url.pathname.includes('/season/')) json = { episodes: [
      { id: 31, episode_number: 1, name: 'İlk Gün', crew: [{ id: 402, name: 'Örnek Bölüm Yönetmeni', job: 'Director' }], overview: 'Spoiler içeren örnek bölüm açıklaması.', still_path: '/demo-3.svg', runtime: 48, air_date: '2022-02-18' },
      { id: 32, episode_number: 2, name: 'Yeni Bir Başlangıç', overview: 'İkinci bölümün örnek açıklaması.', still_path: '/demo-3.svg', runtime: 46, air_date: '2022-02-25' },
      { id: 33, episode_number: 3, name: 'Yaklaşan Bölüm', overview: 'Gizli açıklama', runtime: 42, air_date: '2040-01-01' },
    ] };
    else json = { ...item, name: item.title, original_title: item.title, original_name: item.title, release_date: item.releaseDate, first_air_date: item.releaseDate, backdrop_path: item.poster_path, runtime: 169, episode_run_time: [48], status: item.media_type === 'tv' ? 'Returning Series' : 'Released', number_of_seasons: 1, number_of_episodes: 3, genres: item.genres.map(name => ({ name })), credits: { cast: [{ id: 301, name: 'Örnek Oyuncu', profile_path: null }], crew: [{ id: 401, name: 'Örnek Yönetmen', job: 'Director' }] }, created_by: [{ name: 'Örnek Yaratıcı' }], seasons: [{ season_number: 1, name: '1. Sezon', episode_count: 3 }] };
    return route.fulfill({ json });
  });
  const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
  const sharp = (await import('sharp')).default;
  for (const entries of [manifest.icons, manifest.action.default_icon]) {
    for (const [size, path] of Object.entries(entries)) {
      const meta = await sharp(resolve(root, path.replace(/^\//, ''))).metadata();
      assert.equal(meta.width, Number(size)); assert.equal(meta.height, Number(size)); assert(meta.hasAlpha);
    }
  }
  const screenshot = async name => { await page.screenshot({ path: resolve(output, `${name}.png`), animations: 'disabled', fullPage: ['popup','desktop','collections','calendar'].includes(name) }); screenshots.push(`${name}.png`); };
  const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sayfada yatay taşma var.');
  await page.goto(`${base}/dashboard.html`);
  await page.getByRole('button', { name: 'Interstellar', exact: true }).waitFor();
  await page.locator('.poster img').evaluateAll(images => Promise.all(images.map(img => img.decode().catch(() => {}))));
  assert.equal(await page.locator('.media-card').count(), 6);
  await page.locator('.brand-icon').evaluate(img => img.decode());
  assert.equal(await page.locator('.brand-icon').evaluate(img => img.naturalWidth), 128);
  await noOverflow();
  const colors = await page.evaluate(() => { const style = getComputedStyle(document.documentElement); return Object.fromEntries(['--bg','--surface','--raised','--hover','--text','--secondary','--muted','--accent','--on-accent','--input-border'].map(key => [key,style.getPropertyValue(key).trim()])); });
  function luminance(hex) { if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join(''); return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum, v, i) => sum + v * [.2126,.7152,.0722][i],0); }
  function contrast(a,b) { const values = [luminance(a),luminance(b)].sort((a,b)=>b-a); return (values[0]+.05)/(values[1]+.05); }
  const contrasts = [['--text','--surface'],['--secondary','--raised'],['--muted','--hover'],['--accent','--hover'],['--on-accent','--accent']].map(([fg,bg]) => ({ fg,bg,ratio:Number(contrast(colors[fg],colors[bg]).toFixed(2)) }));
  contrasts.forEach(c => assert(c.ratio >= 4.5, `Yetersiz metin kontrastı: ${c.fg}`));
  assert(contrast(colors['--input-border'],colors['--raised']) >= 3);
  await screenshot('popup');
  const continueSection = page.locator('.continue-section');
  const continueSeverance = page.locator('.continue-card').filter({ has: page.getByRole('button', { name: 'Severance detaylarını aç', exact: true }) });
  await continueSeverance.getByText('Sıradaki: S01 B01', { exact: true }).waitFor();
  assert.equal(await continueSection.locator('.continue-card').count(), 4);
  const checkContinueColumns = async (columns) => {
    const layout = await page.evaluate(() => {
      const rail = document.querySelector('.continue-rail');
      const cards = [...rail.querySelectorAll('.continue-card')].map(card => card.getBoundingClientRect());
      const libraryCard = document.querySelector('.media-grid .media-card').getBoundingClientRect();
      const frame = rail.getBoundingClientRect();
      return { railWidth: frame.width, gap: parseFloat(getComputedStyle(rail).columnGap), cards: cards.map(card => ({ left: card.left, right: card.right, width: card.width })), libraryWidth: libraryCard.width, frameLeft: frame.left, frameRight: frame.right, clientWidth: rail.clientWidth, scrollWidth: rail.scrollWidth };
    });
    assert(Math.abs(layout.cards[0].width - layout.libraryWidth) < 1, 'Devam Et kartları kütüphane sütunlarıyla aynı genişlikte olmalı.');
    assert(Math.abs(layout.cards[0].width * columns + layout.gap * (columns - 1) - layout.railWidth) < 1, 'Görünür sütunlar alana tam sığmalı.');
    if (layout.cards.length > columns) assert(layout.scrollWidth > layout.clientWidth, 'Fazla kartlar sadece raf içinde kaymalı.');
  };
  await checkContinueColumns(2);
  assert(parseFloat(await page.locator('.continue-rail').evaluate(el => getComputedStyle(el, '::-webkit-scrollbar').height)) >= 14, 'Continue scrollbar must offer a usable grab area');
  const intrinsicWidths = await page.evaluate(() => {
    const shell = document.querySelector('.app-shell'), section = document.querySelector('.continue-section'), rail = document.querySelector('.continue-rail');
    const oldShell = shell.getAttribute('style'), oldBody = document.body.getAttribute('style'), oldSection = section.getAttribute('style');
    const clones = Array.from({ length: 12 }, () => rail.appendChild(rail.firstElementChild.cloneNode(true)));
    shell.style.width = 'max-content'; shell.style.maxWidth = 'none'; document.body.style.width = 'max-content';
    const withRail = document.body.getBoundingClientRect().width;
    section.style.display = 'none';
    const withoutRail = document.body.getBoundingClientRect().width;
    for (const clone of clones) clone.remove();
    for (const [element, value] of [[shell, oldShell], [document.body, oldBody], [section, oldSection]]) { if (value === null) element.removeAttribute('style'); else element.setAttribute('style', value); }
    return { withRail, withoutRail };
  });
  assert(intrinsicWidths.withRail <= intrinsicWidths.withoutRail + 1, 'Yatay raf popup için daha büyük bir doğal genişlik istememeli.');

  await noOverflow(); await screenshot('continue-dark');
  await continueSection.getByRole('button', { name: 'Sonraki içerikler', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.continue-rail').scrollLeft > 0);
  await continueSection.getByRole('button', { name: 'Önceki içerikler', exact: true }).click();
  await continueSeverance.getByRole('button', { name: 'Bölümü İzledim', exact: true }).click();
  await continueSeverance.getByText('Sıradaki: S01 B02', { exact: true }).waitFor();
  await continueSeverance.getByRole('button', { name: 'Severance detaylarını aç', exact: true }).click();
  await page.getByRole('tab', { name: 'Bölümler', exact: true }).click();
  assert(await page.getByRole('checkbox', { name: 'S01 B01 izlendi', exact: true }).isChecked());
  // Changing the detail tracker must immediately update the home card too.
  await page.getByRole('checkbox', { name: 'S01 B02 izlendi', exact: true }).check();
  await page.getByRole('button', { name: 'Detayları kapat', exact: true }).click();
  await continueSeverance.getByText('S01 B03 · Yakında', { exact: true }).waitFor();
  assert(await continueSeverance.getByRole('button', { name: 'Bölümü İzledim', exact: true }).isDisabled());
  // Restore the second episode for the existing run-deletion checks below.
  await continueSeverance.getByRole('button', { name: 'Severance detaylarını aç', exact: true }).click();
  await page.getByRole('tab', { name: 'Bölümler', exact: true }).click();
  await page.getByRole('checkbox', { name: 'S01 B02 izlendi', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Detayları kapat', exact: true }).click();
  await continueSeverance.getByText('Sıradaki: S01 B02', { exact: true }).waitFor();

  assert.equal(await page.getByRole('button', { name: 'Filtreleri sıfırla', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Dizi', exact: true }).click();
  assert.equal(await page.locator('.media-card').count(), 2);
  const quickReset = page.getByRole('button', { name: 'Filtreleri sıfırla', exact: true });
  await quickReset.waitFor();
  const resetPosition = await quickReset.boundingBox(), filterPosition = await page.getByRole('button', { name: /Filtrele ve sırala/ }).boundingBox();
  assert(resetPosition.x > filterPosition.x + filterPosition.width, 'Sıfırlama düğmesi filtre düğmesinin sağında olmalı.');
  await noOverflow(); await screenshot('quick-filter-reset');
  await page.getByRole('button', { name: 'Dizi filtresini kaldır', exact: true }).click();
  assert.equal(await page.locator('.media-card').count(), 6);
  await page.getByRole('button', { name: 'Dizi', exact: true }).click();
  await quickReset.click();
  assert.equal(await page.locator('.media-card').count(), 6);
  assert.equal(await quickReset.count(), 0);
  assert.equal(await page.getByRole('dialog', { name: 'Filtre ve sıralama' }).count(), 0);
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click();
  await page.getByRole('dialog', { name: 'Ayarlar' }).waitFor();
  await noOverflow(); await screenshot('settings');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Severance', exact: true }).click();
  await page.getByRole('tab', { name: 'Bölümler', exact: true }).click();
  await page.locator('.series-tracker').getByRole('button', { name: 'Bölümü İzledim' }).waitFor();
  await page.locator('.series-tracker').getByRole('button', { name: 'Bölümü İzledim' }).click();
  assert(await page.getByRole('checkbox', { name: 'S01 B01 izlendi' }).isChecked());
  await page.getByRole('button', { name: 'Yeni izleme turu' }).click();
  await page.getByRole('button', { name: 'İzleme turunu sil', exact: true }).click();
  await page.getByRole('group', { name: 'İzleme turunu silme onayı' }).waitFor();
  await screenshot('run-delete-dark');
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  assert.notEqual(await page.getByRole('combobox', { name: 'İzleme turu' }).getAttribute('data-value'), 'first');
  await page.getByRole('button', { name: 'İzleme turunu sil', exact: true }).click();
  await page.getByRole('button', { name: 'Turu sil', exact: true }).click();
  assert.equal(await page.getByRole('combobox', { name: 'İzleme turu' }).getAttribute('data-value'), 'first');
  assert(await page.getByRole('checkbox', { name: 'S01 B01 izlendi' }).isChecked());
  await noOverflow();
  await page.locator('.detail-scroll').evaluate(el => { el.scrollTop = 0; });
  await screenshot('detail');
  await page.locator('.series-tracker').evaluate(el => { const parent = el.closest('.detail-scroll'); parent.scrollTop += el.getBoundingClientRect().top - parent.getBoundingClientRect().top - 12; });
  await screenshot('series');
  await page.locator('.episode-row').first().scrollIntoViewIfNeeded();
  await screenshot('episode-rows-modern');
  const episodeControl = await page.locator('.episode-row').first().evaluate(row => {
    const box = row.getBoundingClientRect(), control = row.querySelector('.episode-check').getBoundingClientRect(), list = row.closest('.episode-list').getBoundingClientRect();
    return { offset: Math.abs((control.top + control.bottom) / 2 - (box.top + box.bottom) / 2), inset: list.right - control.right, overscroll: getComputedStyle(row.closest('.episode-list')).overscrollBehaviorY };
  });
  assert(episodeControl.offset < 2, 'Episode control should be vertically centered');
  assert(episodeControl.inset >= 12, 'Episode control must stay clear of the scrollbar');
  assert.equal(episodeControl.overscroll, 'auto');
  await page.locator('.episode-list').evaluate(el => { el.style.maxHeight = '110px'; el.scrollTop = el.scrollHeight; });
  const outerBeforeWheel = await page.locator('.detail-scroll').evaluate(el => { el.scrollTop = Math.max(0, el.scrollTop - 80); return el.scrollTop; });
  await page.locator('.episode-list').hover();
  await page.mouse.wheel(0, 180);
  await page.waitForFunction(before => document.querySelector('.detail-scroll').scrollTop > before, outerBeforeWheel);
  await page.locator('.episode-list').evaluate(el => { el.style.maxHeight = ''; });

  await page.getByRole('tab', { name: 'Kişisel Alanım', exact: true }).click();
  const save = page.getByRole('button', { name: 'Kaydet', exact: true });
  await save.hover({ force: true });
  assert.equal(await save.evaluate(el => getComputedStyle(el).cursor), 'not-allowed');
  await page.keyboard.press('Escape');
  const input = page.getByRole('textbox', { name: 'Film, dizi veya kişi ara' });
  await input.fill('Dune');
  await page.locator('.search-result-row').waitFor();
  await screenshot('search');
  await page.locator('.app-header h1').click();
  assert.equal(await page.locator('#search-results').count(), 0);
  await input.focus();
  await page.locator('.search-result-row .title-button').click();
  await page.getByRole('dialog', { name: 'Arama Demo' }).waitFor();
  assert.equal(await page.getByRole('tab', { name: 'Kişisel Alanım' }).count(), 0);
  assert.equal(await page.getByRole('tab', { name: 'Bölümler' }).count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Kütüphaneye ekle', exact: true }).count(), 1);
  await screenshot('search-detail');
  await page.getByRole('tab', { name: 'Bölümler', exact: true }).click();
  await page.locator('.series-tracker').getByRole('button', { name: 'Bölümü İzledim', exact: true }).click();
  await page.getByRole('dialog', { name: 'Arama Demo', exact: true }).getByRole('combobox', { name: 'Arama Demo izleme durumu', exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog', { name: 'Arama Demo', exact: true }).getByRole('combobox', { name: 'Arama Demo izleme durumu', exact: true }).getAttribute('data-value'), 'watching');
  await page.getByRole('tab', { name: 'Kişisel Alanım', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Favorilere ekle', exact: true }).click();
  await page.getByRole('tab', { name: 'Bölümler', exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Kişisel Alanım', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Kütüphaneye ekle', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Detayları kapat' }).click();
  await page.getByRole('button', { name: 'Liste görünümü', exact: true }).click();
  await page.locator('.media-list').waitFor(); await noOverflow(); await screenshot('list-view');
  await page.reload(); await page.locator('.media-list').waitFor();
  await page.getByRole('button', { name: /Favoriler/ }).click();
  await page.locator('.media-list').waitFor();
  await page.getByRole('button', { name: 'Kart görünümü', exact: true }).click();
  await page.getByRole('button', { name: /Koleksiyonlar/ }).click();
  await page.getByRole('combobox', { name: 'Koleksiyon seç' }).click();
  await page.locator('[role=option][data-value=scifi]').click();
  assert.equal(await page.locator('.media-card').count(), 3);
  await noOverflow(); await screenshot('collections');
  await page.getByRole('button', { name: 'Takvim', exact: true }).click();
  await page.locator('.calendar-entry').first().waitFor();
  await screenshot('calendar');
  await page.getByRole('button', { name: /Kütüphane/ }).click();
  await input.fill('Demo Yönetmen');
  await page.locator('.search-panel').getByRole('button', { name: /Demo Yönetmen/ }).click();
  await page.locator('.search-result-row').first().waitFor();
  assert.equal(await page.locator('.search-result-row').count(), 2, 'Oyunculuk ve yönetmenlikteki aynı yapım tek görünmeli.');
  await page.locator('.search-panel').getByRole('button', { name: 'Dune: Part Two', exact: true }).waitFor();
  await screenshot('director-search');
  await page.locator('.search-panel').getByRole('button', { name: 'Severance', exact: true }).click();
  await page.getByRole('dialog', { name: 'Severance', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Detayları kapat', exact: true }).click();
  await page.getByRole('textbox', { name: 'Film, dizi veya kişi ara' }).fill('');
  await page.locator('.app-header h1').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await checkContinueColumns(4);
  await noOverflow(); await screenshot('desktop');
  await page.locator('.card-runtime').filter({ hasText: '169 dk' }).first().waitFor();
  await page.locator('.card-runtime').filter({ hasText: '1 sezon' }).first().waitFor();
  const cardMenu = page.getByRole('button', { name: 'Severance için diğer işlemler', exact: true });
  await cardMenu.press('ArrowDown');
  await page.getByRole('menu', { name: 'Severance işlemleri', exact: true }).waitFor();
  await screenshot('card-actions-dark');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Severance listeden kaldır');
  await page.keyboard.press('Escape');
  assert(await cardMenu.evaluate(el => el === document.activeElement));
  await cardMenu.click();
  await page.getByRole('menuitem', { name: 'Severance detaylarını aç', exact: true }).click();
  const sideSheet = page.getByRole('dialog', { name: 'Severance', exact: true });
  await sideSheet.waitFor();
  assert.equal(await sideSheet.getAttribute('aria-modal'), 'false');
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  await page.waitForFunction(() => Math.abs(document.querySelector('.detail-sheet').getBoundingClientRect().right - innerWidth) < .1);
  const sheetBounds = await sideSheet.boundingBox();
  assert.equal(Math.round(sheetBounds.x + sheetBounds.width), 1440);
  await noOverflow(); await screenshot('detail-side-sheet');
  await sideSheet.getByRole('button', { name: /Koleksiyonlar/ }).click();
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  const stableSheetNode = await sideSheet.elementHandle();
  await page.getByRole('button', { name: 'Interstellar', exact: true }).click();
  await page.getByRole('dialog', { name: 'Interstellar', exact: true }).waitFor();
  assert(await stableSheetNode.evaluate(node => node === document.querySelector('.detail-sheet') && node.open), 'Changing titles must reuse the open sheet');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.detail-dialog').count(), 0);

  const originalLibrary = await page.evaluate(async () => (await browser.storage.local.get('library')).library);
  await page.evaluate(async () => {
    const { library } = await browser.storage.local.get('library');
    const extra = Array.from({ length: 36 }, (_, i) => ({ ...library.find(item => item.media_type === 'movie'), id: 10000 + i, title: `Scroll regression ${i}`, favorite: false, watchStatus: 'planned', runtime: 169, addedAt: '2010-01-01T12:00:00Z' }));
    await browser.storage.local.set({ library: [...library, ...extra] });
  });
  await page.setViewportSize({ width: 1920, height: 1000 });
  const bottomPoster = page.locator('.media-grid .media-card').last().locator('.poster-button');
  await bottomPoster.scrollIntoViewIfNeeded();
  const beforeSheet = await page.evaluate(() => ({ y: scrollY, columns: getComputedStyle(document.querySelector('.media-grid')).gridTemplateColumns.split(' ').length, width: document.querySelector('.media-grid').getBoundingClientRect().width }));
  assert.equal(beforeSheet.columns, 6);
  assert(beforeSheet.y > 500);
  await bottomPoster.click();
  await page.locator('.detail-sheet').waitFor();
  const afterSheet = await page.evaluate(() => ({ y: scrollY, columns: getComputedStyle(document.querySelector('.media-grid')).gridTemplateColumns.split(' ').length, width: document.querySelector('.media-grid').getBoundingClientRect().width }));
  assert.equal(afterSheet.columns, 6);
  assert(afterSheet.width < beforeSheet.width, 'Sheet must reserve space in the workspace');
  const rightEdge = await page.locator('.media-grid').evaluate(el => el.getBoundingClientRect().right);
  const sheetLeft = await page.locator('.detail-sheet').evaluate(el => el.getBoundingClientRect().left);
  assert(rightEdge <= sheetLeft, 'Posters must not be covered by the sheet');
  assert(afterSheet.y > 500, 'Opening a bottom card must not jump to the page header');
  assert(await bottomPoster.isVisible());
  await screenshot('six-column-scroll-preserved');
  const sheetSearch = page.getByRole('textbox', { name: 'Film, dizi veya kişi ara', exact: true });
  await sheetSearch.fill('O');
  await page.locator('.search-result-row').waitFor();
  assert.equal(await page.locator('.detail-sheet').count(), 1);
  await screenshot('search-with-detail-open');
  await sheetSearch.press('Escape');
  assert.equal(await page.locator('.detail-sheet').count(), 1);
  await page.getByRole('button', { name: 'Detayları kapat', exact: true }).click();
  await page.evaluate(async library => { await browser.storage.local.set({ library }); scrollTo(0, 0); }, originalLibrary);
  await sheetSearch.fill('');
  await page.locator('.app-header h1').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Filtrele ve sırala' }).click();
  await page.getByRole('dialog', { name: 'Filtre ve sıralama' }).waitFor();
  await page.getByRole('combobox', { name: 'Sıralama', exact: true }).click();
  await page.getByRole('listbox').waitFor();
  await screenshot('filter-menu-dark');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog', { name: 'Filtre ve sıralama' }).count(), 1);
  await page.getByRole('combobox', { name: 'Sıralama', exact: true }).press('End');
  await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('combobox', { name: 'Sıralama', exact: true }).getAttribute('data-value'), 'watchedAsc');
  await page.getByRole('button', { name: 'Sonuçları göster' }).click();
  await page.setViewportSize({ width: 580, height: 600 });
  await page.getByRole('button', { name: 'Aydınlık temaya geç' }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.getByRole('button', { name: 'Interstellar', exact: true }).waitFor();
  await page.locator('.poster img').evaluateAll(images => Promise.all(images.map(img => img.decode().catch(() => {}))));
  await noOverflow(); await screenshot('popup-light');
  const lightColors = await page.evaluate(() => { const style = getComputedStyle(document.documentElement); return Object.fromEntries(['--surface','--raised','--hover','--text','--secondary','--muted','--accent','--button','--button-text'].map(key => [key,style.getPropertyValue(key).trim()])); });
  const lightContrasts = [['--text','--surface'],['--secondary','--raised'],['--muted','--hover'],['--accent','--hover'],['--button-text','--button']].map(([fg,bg]) => ({ fg,bg,ratio:Number(contrast(lightColors[fg],lightColors[bg]).toFixed(2)) }));
  lightContrasts.forEach(c => assert(c.ratio >= 4.5, `Açık tema kontrastı: ${c.fg} ${c.ratio}`));
  await page.getByRole('combobox', { name: 'Interstellar izleme durumu' }).click();
  await page.getByRole('listbox').waitFor(); await screenshot('status-menu-light');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Severance', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Severance' });
  await detail.waitFor();
  await detail.getByRole('button', { name: /Koleksiyonlar/ }).click();
  await page.getByRole('dialog', { name: 'Koleksiyona ekle' }).waitFor();
  await screenshot('nested-collection-light');
  await page.keyboard.press('Escape');
  assert.equal(await detail.count(), 1);
  assert.equal(await page.evaluate(() => document.body.style.overflow), page.viewportSize().width >= 900 ? '' : 'hidden');
  await page.getByRole('tab', { name: 'Kişisel Alanım', exact: true }).click();
  await page.getByLabel('Kişisel notlarım').fill('Sekmeler arasında korunacak taslak');
  await page.getByRole('tab', { name: 'Genel Bakış', exact: true }).click();
  await page.getByRole('tab', { name: 'Kişisel Alanım', exact: true }).click();
  assert.equal(await page.getByLabel('Kişisel notlarım').inputValue(), 'Sekmeler arasında korunacak taslak');
  await page.getByRole('combobox', { name: 'Kişisel puanım' }).click();
  await page.getByRole('option', { name: '9 / 10', exact: true }).click();
  await noOverflow(); await screenshot('personal-light');
  await page.getByRole('button', { name: 'İzlemeyi kaydet', exact: true }).click();
  await page.locator('.rewatch-entry').waitFor();
  assert(await page.locator('.rewatch-entry .danger-button').isVisible());
  await screenshot('rewatch-light');
  await page.locator('.rewatch-entry .danger-button').click();
  assert.equal(await page.locator('.rewatch-entry').count(), 0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('select').count(), 0, 'Native dropdown kalmamalı.');
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await screenshot('settings-english');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Library/ }).waitFor();
  await page.setViewportSize({ width: 580, height: 600 });
  await noOverflow(); await screenshot('library-english');
  await page.getByRole('combobox', { name: 'Watch status for Interstellar' }).click();
  await page.getByRole('option', { name: 'Watching', exact: true }).click();
  await page.locator('.toast-updated:popover-open').waitFor();
  assert((await page.locator('.toast').textContent()).includes('Watching'));
  const gridTop = await page.locator('.media-grid').evaluate(el => el.offsetTop);
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  assert.equal(await page.locator('.media-grid').evaluate(el => el.offsetTop), gridTop);
  await page.getByRole('button', { name: 'Severance', exact: true }).click();
  await page.getByRole('tab', { name: 'Episodes', exact: true }).click();
  await page.locator('.series-tracker').getByRole('button', { name: 'Mark episode watched', exact: true }).waitFor();
  assert(apiLanguages.includes('en-US'));
  assert.equal(await page.getByRole('combobox', { name: 'Watch run', exact: true }).innerText(), 'First watch');
  await page.getByRole('tab', { name: 'Personal', exact: true }).click();
  await page.getByLabel('My personal notes').fill('English draft');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('.toast-updated:popover-open').waitFor();
  assert.equal(await page.locator('.toast').evaluate(el => getComputedStyle(el).position), 'fixed');
  assert.equal(await page.locator('.toast').evaluate(el => getComputedStyle(el).animationName), 'toast-enter');
  await screenshot('toast-over-detail');
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  await page.getByRole('button', { name: 'More actions for Arrival', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Remove Arrival from library', exact: true }).click();
  await page.locator('.toast-removed:popover-open').waitFor();
  assert((await page.locator('.toast').textContent()).includes('Arrival removed'));
  await screenshot('toast-removed');
  await page.locator('.toast').waitFor({ state: 'detached', timeout: 7000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /Severance remove from favorites/ }).click();
  await page.locator('.toast:popover-open').waitFor();
  assert.equal(await page.locator('.toast').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Türkçe', exact: true }).click();
  await page.getByRole('button', { name: 'Ayarları kapat', exact: true }).click();
  await page.getByRole('button', { name: /Kütüphane/ }).waitFor();
  await page.getByRole('button', { name: 'İstatistikler', exact: true }).click();
  await page.getByRole('heading', { name: 'İstatistikler', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Yenile', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('.statistics-loading'));
  await noOverflow(); await page.screenshot({ path: resolve(output, 'statistics-dark-or-light.png'), fullPage: true, animations: 'disabled' }); screenshots.push('statistics-dark-or-light.png');
  assert.equal(await page.locator('.stat-tile').count(), 4);
  assert.equal(await page.locator('.monthly-chart button').count(), 12);
  assert((await page.locator('.statistics').innerText()).includes('Örnek Oyuncu'));
  await page.getByRole('combobox', { name: 'Rapor yılı', exact: true }).click();
  await page.getByRole('option', { name: '2026', exact: true }).click();
  await page.getByRole('button', { name: 'Ocak: 1 film, 0 bölüm. Geçmişi filtrele.', exact: true }).click();
  assert.equal(await page.locator('.watch-timeline li').count(), 1);
  await page.getByRole('button', { name: 'Yıl özetini aç', exact: true }).click();
  await page.getByRole('dialog', { name: '2026 yıl özeti', exact: true }).waitFor();
  await screenshot('year-review');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('heading', { name: 'Yılın favori türü', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Özet sayfası 3', exact: true }).click();
  await screenshot('year-review-people');
  await page.getByRole('button', { name: 'Özet sayfası 4', exact: true }).click();
  await page.getByRole('heading', { name: 'En yüksek kişisel puanın', exact: true }).waitFor();
  await noOverflow(); await screenshot('year-review-favorite');
  await page.getByRole('button', { name: 'Özet sayfası 5', exact: true }).click();
  await page.getByRole('heading', { name: 'İzleme ritmin', exact: true }).waitFor();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.getByRole('heading', { name: 'Statistics', exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await noOverflow(); await screenshot('statistics-desktop-english');
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await noOverflow(); await screenshot('statistics-desktop-dark');
  await page.locator('.monthly-chart>button').first().focus();
  await page.getByRole('tooltip').waitFor();
  await screenshot('statistics-chart-tooltip');
  await page.locator('.workspace-heading h1').click();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const archivePanel = page.locator('.archive-settings');
  const jsonDownload = page.waitForEvent('download');
  await archivePanel.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const jsonFile = await jsonDownload;
  const jsonSource = await readFile(await jsonFile.path(), 'utf8');
  const backup = JSON.parse(jsonSource);
  assert.equal(backup.format, 'moviemarks'); assert.equal(backup.version, 1);
  assert(backup.library.length > 0); assert(backup.collections.length > 0);
  assert(!jsonSource.includes('demo-token') && !jsonSource.includes('tmdbToken'));
  const csvDownload = page.waitForEvent('download');
  await archivePanel.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const csvFile = await csvDownload;
  const csvSource = await readFile(await csvFile.path(), 'utf8');
  assert(csvSource.startsWith('\uFEFF')); assert(csvSource.includes('"Title"')); assert(csvSource.includes('Interstellar'));
  const backupInput = archivePanel.getByLabel('JSON backup file', { exact: true });
  await backupInput.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"not":"backup"}') });
  await archivePanel.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('moviemarks-ui')).library.length), backup.library.length);
  await archivePanel.getByRole('button', { name: 'Clear archive', exact: true }).click();
  await archivePanel.getByRole('group', { name: 'Confirm archive deletion', exact: true }).waitFor();
  await archivePanel.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('moviemarks-ui')).library.length), backup.library.length);
  await archivePanel.getByRole('button', { name: 'Clear archive', exact: true }).click();
  await archivePanel.getByRole('button', { name: 'Yes, delete archive', exact: true }).click();
  await archivePanel.getByText('Archive cleared.', { exact: true }).waitFor();
  const cleared = await page.evaluate(() => JSON.parse(localStorage.getItem('moviemarks-ui')));
  assert.deepEqual(cleared.library, []); assert.deepEqual(cleared.collections, []);
  assert.equal(cleared.tmdbToken, 'demo-token'); assert.equal(cleared.language, 'en'); assert.equal(cleared.theme, 'dark');
  await backupInput.setInputFiles({ name: 'moviemarks-backup.json', mimeType: 'application/json', buffer: Buffer.from(jsonSource) });
  await archivePanel.getByRole('group', { name: 'Confirm backup restore', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('moviemarks-ui')).library.length), 0);
  await page.locator('.settings-content').evaluate(el => { el.scrollTop = el.scrollHeight / 2; });
  await screenshot('archive-restore-preview');
  await archivePanel.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await archivePanel.getByText('Backup restored.', { exact: true }).waitFor();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('moviemarks-ui')));
  assert.deepEqual(restored.library, backup.library); assert.deepEqual(restored.collections, backup.collections);
  assert.equal(restored.tmdbToken, 'demo-token');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  const popup = await page.context().newPage();
  popup.on('pageerror', error => errors.push(error.message));
  await popup.setViewportSize({ width: 480, height: 600 });
  await popup.goto(`${base}/popup.html`);
  await popup.getByRole('heading', { name: 'Recently added', exact: true }).waitFor();
  assert.equal(await popup.locator('.workspace-sidebar').count(), 0);
  assert.equal(await popup.locator('.media-grid').count(), 0);
  assert.equal(await popup.locator('.popup-recent-row').count(), 2);
  assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth), 480);
  await popup.screenshot({ path: resolve(output, 'popup-compact.png'), animations: 'disabled', fullPage: true }); screenshots.push('popup-compact.png');
  await popup.getByRole('button', { name: 'Open in a full tab', exact: true }).click();
  assert((await popup.evaluate(() => globalThis.__openedUrls.at(-1))).endsWith('/dashboard.html#library'));
  await popup.locator('.popup-shortcuts').getByRole('button', { name: 'Statistics', exact: true }).click();
  const statisticsUrl = await popup.evaluate(() => globalThis.__openedUrls.at(-1));
  assert(statisticsUrl.endsWith('/dashboard.html#statistics'));
  await page.goto(statisticsUrl);
  await page.getByRole('heading', { name: 'Statistics', exact: true }).waitFor();
  const oldEpisodes = Number(await page.locator('.stat-tile').nth(2).locator('strong').textContent());
  const quickSeries = popup.locator('.continue-card').filter({ has: popup.getByRole('button', { name: 'Open Arama Demo details', exact: true }) });
  await quickSeries.getByText('Up next: S01 E02', { exact: true }).waitFor();
  await quickSeries.getByRole('button', { name: 'Mark episode watched', exact: true }).click();
  await page.waitForFunction(count => Number(document.querySelectorAll('.stat-tile strong')[2]?.textContent) === count + 1, oldEpisodes);
  await quickSeries.getByText('S01 E03 · Upcoming', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Library/ }).click();
  await page.getByRole('button', { name: 'Interstellar', exact: true }).click();
  await page.getByRole('tab', { name: 'Personal', exact: true }).click();
  await page.getByLabel('My personal notes').fill('Cross-surface note');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  await popup.locator('.popup-recent-row').getByRole('button', { name: 'Interstellar', exact: true }).click();
  await popup.getByRole('tab', { name: 'Personal', exact: true }).click();
  assert.equal(await popup.getByLabel('My personal notes').inputValue(), 'Cross-surface note');
  await popup.getByRole('button', { name: 'Close details', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await popup.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Türkçe', exact: true }).click();
  await page.getByRole('button', { name: 'Ayarları kapat', exact: true }).click();
  await popup.getByRole('heading', { name: 'Son eklenenler', exact: true }).waitFor();
  await popup.getByRole('textbox', { name: 'Film, dizi veya kişi ara', exact: true }).fill('Popup Yeni Film');
  await popup.getByRole('button', { name: 'Popup Yeni Film listeye ekle', exact: true }).click();
  await page.getByRole('button', { name: 'Popup Yeni Film', exact: true }).waitFor();
  assert(await popup.getByRole('button', { name: 'Popup Yeni Film listemde', exact: true }).isDisabled());
  await popup.getByRole('button', { name: 'Aramayı temizle', exact: true }).click();
  await popup.locator('.app-header h1').click();
  await popup.getByRole('combobox', { name: 'Popup Yeni Film izleme durumu', exact: true }).click();
  await popup.getByRole('option', { name: 'İzleniyor', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Popup Yeni Film izleme durumu"]')?.dataset.value === 'watching');

  await popup.screenshot({ path: resolve(output, 'popup-compact-light-tr.png'), animations: 'disabled', fullPage: true }); screenshots.push('popup-compact-light-tr.png');
  await noOverflow(); await screenshot('workspace-library-final');
  const popupLayoutArchive = await popup.evaluate(async () => (await browser.storage.local.get('library')).library);
  await popup.evaluate(async () => {
    const { library } = await browser.storage.local.get('library');
    await browser.storage.local.set({ library: library.map(item => ({ ...item, title: `${item.title} Çok Uzun Bir Film veya Dizi İsmi Ek Başlık İkinci Kısım`, ...(item.media_type === 'tv' ? { watchStatus: 'watching', episodeTracking: { activeRunId: 'second', includeSpecials: false, spoilerProtection: true, runs: [{ id: 'first', name: 'İlk izleme', startedAt: '2024-01-01T12:00:00Z', watched: {} }, { id: 'second', name: '2. izleme', startedAt: '2024-01-01T12:00:00Z', watched: { '1:1': '2024-01-01T12:00:00Z' } }] } } : {}) })) });
  });
  for (const language of ['tr', 'en']) {
    await popup.evaluate(async language => { await browser.storage.local.set({ language }); }, language);
    await popup.waitForFunction(language => document.documentElement.lang === language, language);
    await popup.waitForFunction(() => !document.querySelector('.continue-section .animate-spin'));
    const popupHeight = await popup.locator('.popup-shell').evaluate(el => el.getBoundingClientRect().height);
    assert(popupHeight <= 600, `Popup overflow with long titles and rewatches (${language}): ${popupHeight}`);
    assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth), 480);
  }
  await popup.screenshot({ path: resolve(output, 'popup-long-title-rewatch.png'), animations: 'disabled', fullPage: true }); screenshots.push('popup-long-title-rewatch.png');
  await popup.evaluate(async library => { await browser.storage.local.set({ library, language: 'tr' }); }, popupLayoutArchive);
  await popup.goto(`${base}/popup.html?search=${encodeURIComponent('O & Dizi?')}`);
  const selectionInput = popup.getByRole('textbox', { name: 'Film, dizi veya kişi ara', exact: true });
  assert.equal(await selectionInput.inputValue(), 'O & Dizi?');
  await popup.locator('.search-result-row').waitFor();
  assert.equal(await popup.locator('#search-results').count(), 1);
  assert.equal(await popup.locator('.popup-attribution').count(), 0);
  await popup.screenshot({ path: resolve(output, 'selection-search-popup.png'), animations: 'disabled', fullPage: true }); screenshots.push('selection-search-popup.png');
  await popup.close();
  assert.equal(errors.length, 0, errors.join('\n'));
  await writeFile(resolve(output,'validation.json'), JSON.stringify({ mode:'Headless Chromium; built UI; simulated extension storage and TMDB; demo vector posters', viewports:['480x600 popup','580x600 workspace','1440x1000 workspace'], checks:['no horizontal overflow','navigation and type filter','settings dialog and Escape','episode marking','disabled Save cursor','search outside dismissal','collection filter','calendar','zero page exceptions','language switch and persistence','localized TMDB requests','toast top layer and no layout shift','toast colors and dismissal','reduced motion','continue watching eligibility and carousel','continue card widths match library columns; overflow stays inside rail','home/detail episode synchronization in both directions','continue watching upcoming episode guard','statistics metadata and totals','monthly history filter','year recap navigation','English statistics and five tab layout','director/creator search and combined credit deduplication','search episode auto-add and watch status','JSON and CSV downloads','invalid backup is non-mutating','reset cancellation and preference preservation','JSON restore round trip','distinct popup and dashboard entries','popup section deep links','live cross-surface episode/statistics sync','live cross-surface notes/theme/language sync','popup search add and quick status sync','run deletion with confirmation','rewatch delete button','manifest icon dimensions/alpha','header icon loaded','card menu keyboard and focus restoration','individual filter chips','non-modal detail sheet and nested modal locking','sheet direct content switching','monthly chart accessible tooltip','selection query opens popup search automatically','six columns remain visible beside sheet; selected bottom card stays in view','search keeps detail sheet open','movie runtime and series season count on cards','open sheet node reused during title changes','episode controls centered and inset','episode list scroll chains to detail area','popup fits 600 px with long titles and rewatch labels in both languages'], colors, lightColors, textContrasts:contrasts, lightContrasts, screenshots },null,2));
  console.log(`UI kontrolleri başarılı: ${screenshots.length} görüntü, ${contrasts.length} metin kontrastı, 3 ekran boyutu ve iki arayüz.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

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
  { id: 1, title: 'Interstellar', media_type: 'movie', year: '2014', vote_average: 8.7, personalRating: 10, watchStatus: 'completed', favorite: true, genres: ['Bilim Kurgu'], releaseDate: '2014-11-05', notes: 'Tekrar izlenecek.' },
  { id: 2, title: 'Dune: Part Two', media_type: 'movie', year: '2024', vote_average: 8.2, watchStatus: 'planned', genres: ['Bilim Kurgu'], releaseDate: '2024-02-27' },
  { id: 3, title: 'Severance', media_type: 'tv', year: '2022', vote_average: 8.6, watchStatus: 'watching', favorite: true, genres: ['Dram'], releaseDate: '2022-02-18' },
  { id: 4, title: 'The Batman', media_type: 'movie', year: '2022', vote_average: 7.7, personalRating: 8, watchStatus: 'paused', genres: ['Suç'], releaseDate: '2022-03-01' },
  { id: 5, title: 'Arrival', media_type: 'movie', year: '2016', vote_average: 7.6, watchStatus: 'planned', genres: ['Bilim Kurgu'], releaseDate: '2016-11-10' },
  { id: 6, title: 'The Bear', media_type: 'tv', year: '2022', vote_average: 8.2, watchStatus: 'dropped', genres: ['Dram'], releaseDate: '2022-06-23' },
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
const page = await browser.newPage({ viewport: { width: 580, height: 600 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const screenshots = [];
try {
  await page.addInitScript(({ library, base }) => {
    const data = JSON.parse(sessionStorage.getItem('moviemarks-ui') || 'null') ?? { library, tmdbToken: 'demo-token', collections: [{ id: 'scifi', name: 'En İyi Bilim Kurgu Filmleri', createdAt: '', mediaKeys: ['movie:1','movie:2','movie:5'] }] };
    const listeners = new Set();
    globalThis.browser = {
      runtime: { id: 'demo', getURL: path => `${base}${path}` }, tabs: { create: async () => ({}) },
      storage: { local: {
        get: async key => structuredClone(key == null ? data : { [key]: data[key] }),
        set: async values => { const changes = {}; for (const [key, value] of Object.entries(values)) { changes[key] = { newValue: structuredClone(value), oldValue: data[key] }; data[key] = structuredClone(value); } sessionStorage.setItem('moviemarks-ui', JSON.stringify(data)); listeners.forEach(fn => fn(changes, 'local')); },
      }, onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } },
    };
  }, { library, base });
  await page.route('https://image.tmdb.org/**', route => {
    const id = Number(route.request().url().match(/demo-(\d+)/)?.[1] ?? 3);
    return route.fulfill({ contentType: 'image/svg+xml', body: poster(id) });
  });
  await page.route('https://api.themoviedb.org/**', route => {
    const url = new URL(route.request().url());
    const id = Number(url.pathname.split('/')[3]);
    const item = library.find(m => m.id === id) ?? library[2];
    let json;
    if (url.pathname.endsWith('/search/multi')) json = { results: [library[1]] };
    else if (url.pathname.includes('/season/')) json = { episodes: [
      { id: 31, episode_number: 1, name: 'İlk Gün', overview: 'Spoiler içeren örnek bölüm açıklaması.', still_path: '/demo-3.svg', runtime: 48, air_date: '2022-02-18' },
      { id: 32, episode_number: 2, name: 'Yeni Bir Başlangıç', overview: 'İkinci bölümün örnek açıklaması.', still_path: '/demo-3.svg', runtime: 46, air_date: '2022-02-25' },
      { id: 33, episode_number: 3, name: 'Yaklaşan Bölüm', overview: 'Gizli açıklama', runtime: 42, air_date: '2040-01-01' },
    ] };
    else json = { ...item, name: item.title, original_title: item.title, original_name: item.title, release_date: item.releaseDate, first_air_date: item.releaseDate, backdrop_path: item.poster_path, runtime: 169, episode_run_time: [48], status: item.media_type === 'tv' ? 'Returning Series' : 'Released', number_of_seasons: 1, number_of_episodes: 3, genres: item.genres.map(name => ({ name })), credits: { cast: [], crew: [{ name: 'Örnek Yönetmen', job: 'Director' }] }, created_by: [{ name: 'Örnek Yaratıcı' }], seasons: [{ season_number: 1, name: '1. Sezon', episode_count: 3 }] };
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
  const screenshot = async name => { await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: ['popup','desktop','collections','calendar'].includes(name) }); screenshots.push(`${name}.png`); };
  const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sayfada yatay taşma var.');
  await page.goto(`${base}/popup.html`);
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
  await page.getByRole('button', { name: 'Dizi', exact: true }).click();
  assert.equal(await page.locator('.media-card').count(), 2);
  await page.getByRole('button', { name: 'Tümü', exact: true }).click();
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click();
  await page.getByRole('dialog', { name: 'Ayarlar' }).waitFor();
  await noOverflow(); await screenshot('settings');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Severance', exact: true }).click();
  await page.getByRole('tab', { name: 'Bölümler', exact: true }).click();
  await page.getByRole('button', { name: 'Bölümü İzledim' }).waitFor();
  await page.getByRole('button', { name: 'Bölümü İzledim' }).click();
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
  await page.getByRole('tab', { name: 'Kişisel Alanım', exact: true }).click();
  const save = page.getByRole('button', { name: 'Kaydet', exact: true });
  await save.hover({ force: true });
  assert.equal(await save.evaluate(el => getComputedStyle(el).cursor), 'not-allowed');
  await page.keyboard.press('Escape');
  const input = page.getByRole('textbox', { name: 'Film, dizi veya oyuncu ara' });
  await input.fill('Dune');
  await page.locator('.search-result-row').waitFor();
  await screenshot('search');
  await page.locator('.app-header h1').click();
  assert.equal(await page.locator('#search-results').count(), 0);
  await page.getByRole('button', { name: /Koleksiyonlar/ }).click();
  await page.getByRole('combobox', { name: 'Koleksiyon seç' }).click();
  await page.locator('[role=option][data-value=scifi]').click();
  assert.equal(await page.locator('.media-card').count(), 3);
  await noOverflow(); await screenshot('collections');
  await page.getByRole('button', { name: 'Takvim', exact: true }).click();
  await page.locator('.calendar-entry').first().waitFor();
  await screenshot('calendar');
  await page.getByRole('button', { name: /Kütüphane/ }).click();
  await page.getByRole('textbox', { name: 'Film, dizi veya oyuncu ara' }).fill('');
  await page.locator('.app-header h1').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await noOverflow(); await screenshot('desktop');
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
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
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
  assert.equal(errors.length, 0, errors.join('\n'));
  await writeFile(resolve(output,'validation.json'), JSON.stringify({ mode:'Headless Chromium; built UI; simulated extension storage and TMDB; demo vector posters', viewports:['580x600','1440x1000'], checks:['no horizontal overflow','navigation and type filter','settings dialog and Escape','episode marking','disabled Save cursor','search outside dismissal','collection filter','calendar','zero page exceptions','run deletion with confirmation','rewatch delete button','manifest icon dimensions/alpha','header icon loaded'], colors, lightColors, textContrasts:contrasts, lightContrasts, screenshots },null,2));
  console.log(`UI kontrolleri başarılı: ${screenshots.length} görüntü, ${contrasts.length} metin kontrastı, 2 ekran boyutu.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

<p align="center">
  <img src="public/icons/icon-128.png" width="88" height="88" alt="Moviemarks ikonu" />
</p>

# Moviemarks

Chromium tabanlı tarayıcılar için kişisel film, dizi ve bölüm takip merkezi. **WXT · React · TypeScript · Tailwind CSS** ile geliştirilmiştir.

## Özellikler

- TMDB üzerinden film, dizi ve oyuncu araması; oyuncuların film/dizi listeleri.
- Kişisel kütüphane, favoriler ve birden fazla özel koleksiyon.
- İzlenecek, İzleniyor, Tamamlandı, Ara verildi ve Bırakıldı durumları.
- Kişisel puan, özel notlar, izleme tarihi ve yeniden izleme tarihleri.
- Tür, yıl, puan, yayın tarihi ve izleme durumuna göre filtreleme; isim, eklenme, puan ve izlenme tarihine göre sıralama.
- Sezon/bölüm listeleri, tek tek veya toplu işaretleme, sıradaki bölüm, ilerleme çubukları ve yaklaşan bölüm takvimi.
- Özel bölüm seçeneği, spoiler koruması ve ayrı ilerleme tutan tekrar izleme turları.
- Aydınlık/karanlık tema, sekmeli içerik detayları ve klavye destekli seçim menüleri.

## Gereksinimler

- Node.js 22 veya üzeri ve npm.
- Güncel Chrome, Edge, Brave veya başka Chromium tabanlı tarayıcı.
- Arama ve güncel içerik bilgileri için kendi TMDB **API Read Access Token** değerin: [TMDB API ayarları](https://www.themoviedb.org/settings/api).

Token'ı kaynak dosyalara ekleme. Kurulumdan sonra uzantının Ayarlar paneline gir; kısa API key yerine API Read Access Token kullan.

## Yerel kurulum

```sh
npm ci
npm run build
```

1. Chrome'da `chrome://extensions`, Edge'de `edge://extensions` sayfasını aç.
2. Geliştirici modunu etkinleştir.
3. **Paketlenmemiş öğe yükle** ile `.output/chrome-mv3` klasörünü seç.
4. Moviemarks'ı araç çubuğuna sabitle ve Ayarlar'dan TMDB token'ını kaydet.

Güncellemelerden sonra yeniden build alıp uzantılar sayfasındaki yenile düğmesine bas. Bu depo Chrome Web Store yayını değildir; kaynak kod ve yerel kurulum içindir.

## Geliştirme ve doğrulama

```sh
npm run dev          # WXT geliştirme sunucusu
npm run typecheck    # TypeScript kontrolü
npm test             # Birim ve bileşen testleri
npm run zip          # Chrome için dağıtım paketi
npm run icons        # Kaynak görselden PNG ikon boyutlarını üret
```

`npm run dev` çıktısı `.output/chrome-mv3-dev` altındadır. Otomatik tarayıcı açılışı için WXT'nin isteğe bağlı `web-ext` bağımlılığı ayrıca kurulabilir.

Chromium arayüz kontrolleri:

```sh
npm run build
npx playwright install chromium
npm run test:ui
```

UI kontrolü gerçek kullanıcı profilini kullanmaz: depolama ve TMDB yanıtları kontrollü örneklerle değiştirilir. Önizlemelerdeki afişler demo vektörlerdir. Gerçek uzantı TMDB afişlerini kullanır. Kontrol raporları ve ekran görüntüleri yayın dışındaki `artifacts/` klasörüne yazılır. Bu kontroller gerçek TMDB hesabıyla canlı doğrulama yerine geçmez.

## Veri ve gizlilik

- Kütüphane, koleksiyonlar, notlar, puanlar, tema, bölüm ilerlemeleri ve token yalnızca tarayıcı profilinin `chrome.storage.local` alanında saklanır. Proje dosyalarına yazılmaz.
- Token, uygulama tarafından kaynak koda gömülmez veya günlüğe yazılmaz; yalnızca TMDB API isteklerinin yetkilendirme başlığında kullanılır. Tarayıcı profiline erişimi olan kişiler yerel verilere erişebilir.
- Arama ve detay istekleri `api.themoviedb.org`, görsel istekleri `image.tmdb.org` adresine gider. Kişisel not, puan ve izleme işaretleri TMDB'ye gönderilmez.
- Uygulamaya ait ayrı bir sunucu, analitik veya bulut eşitlemesi yoktur. Uzantı kaldırılırsa yerel veriler silinebilir; dışa aktarma/yedekleme henüz yoktur.
- Gerekli izinler: `storage` ve `https://api.themoviedb.org/*`. Gezinme geçmişi veya tüm sayfalara erişim izni istenmez.
- `.env` dosyaları, bağımlılıklar, derleme çıktıları, yerel profiller ve test raporları Git dışında tutulur. Test dosyalarındaki `demo-token`, `secret-token` gibi değerler işlevsiz örneklerdir.

## Takip davranışı ve sınırlar

- Bölüm bilgileri TMDB'ye bağlıdır. Katalog altı saat önbelleğe alınır; Yenile düğmesi güncel bilgiyi yeniden ister. Bağlantı hatasında varsa önbellek uyarıyla gösterilir.
- Özel bölümler varsayılan kapalıdır. Gelecek tarihli bölümler işaretlenemez. Tarihi bilinmeyen bölüm elle işaretlenebilir; otomatik ilerleme yalnızca yayımlanmış bölümleri seçer.
- Devam eden diziye yetişmek yayın tamamlandı anlamına gelmez. Önceden genel durum olarak Tamamlandı seçilen kayıtlar otomatik bölüm işaretlerine dönüştürülmez.
- İzleme turları ve tarih bazlı yeniden izlemeler ayrıdır. İlk tur silinmez; ek turlar onayla kaldırılabilir. Not taslakları sekme değişiminde korunur, panel kapatılmadan önce Kaydet ile saklanmalıdır.
- Koleksiyon silmek yapımı kütüphaneden kaldırmaz. Yapım kütüphaneden kaldırılırsa koleksiyon üyelikleri de temizlenir.
- Eski kayıtların kesin eklenme tarihi bilinmediğinden tarih uydurulmaz. Ayrı pencerelerde eşzamanlı düzenlemede son kayıt geçerlidir.

## Proje yapısı

- `entrypoints/popup/`: Uzantı giriş noktası.
- `src/`: Arayüz, TMDB istemcileri, yerel depolama ve testler.
- `public/icons/`: Paketlenen PNG ikonları.
- `assets/branding/`: İkon kaynağı ve üretim notları. İkon yerleşik görsel üretim aracıyla oluşturulmuştur.
- `scripts/`: İkon üretimi ve örnek verilerle arayüz kontrolü.
- [Sürüm geçmişi](docs/CHANGELOG.md).

## Lisans ve atıf

Bu proje için henüz ayrı bir açık kaynak lisansı seçilmemiştir; paket `UNLICENSED` olarak işaretlidir. GitHub'da public olması bir açık kaynak lisansı eklendiği anlamına gelmez. Bağımlılıklar kendi lisanslarına tabidir; TMDB veri ve görselleri ilgili kullanım koşullarına tabidir.

This product uses the TMDB API but is not endorsed or certified by TMDB.

[TMDB geliştirici belgeleri](https://developer.themoviedb.org/docs/getting-started) · [Chrome ikon rehberi](https://developer.chrome.com/docs/extensions/develop/ui/configure-icons)

<p align="center">
  <img src="public/icons/icon-128.png" width="88" height="88" alt="Moviemarks ikonu" />
</p>

# Moviemarks

Chromium tabanlı tarayıcılar için kişisel film, dizi ve bölüm takip merkezi. **WXT · React · TypeScript · Tailwind CSS** ile geliştirilmiştir.

## Özellikler

- TMDB üzerinden film, dizi, oyuncu, yönetmen ve yaratıcı araması; kişilerin film/dizi listeleri.
- Kompakt popup ve ayrı geniş yönetim ekranı; ortak açık/koyu tema, kart işlem menüleri ve kaldırılabilir filtre etiketleri.
- Geniş ekranda sağ detay paneli; aramada ve işlem menülerinde klavye desteği.
- Seçili metne sağ tıklayarak “Moviemarks’ta ara”: popup otomatik açılır ve seçilen metni arar. Doğrudan popup açma Chrome 127+ gerektirir; desteklenmeyen tarayıcılarda küçük bir uzantı penceresi kullanılır.
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

## Hazır paket

[GitHub Releases](https://github.com/ibrahimemiraydin/movie-marks/releases) sayfasından en güncel Chrome ZIP paketini indirip ayrı bir klasöre çıkar. Uzantılar sayfasında geliştirici modunu açarak **Paketlenmemiş öğe yükle** ile çıkardığın klasörü seç. ZIP dosyasını doğrudan yüklemek yerine önce çıkarmalısın. Mevcut kurulumu güncellerken klasörü aynı konumda tutup uzantıyı yenile; arşivini korumak için önce Ayarlar'dan JSON yedeği alabilirsin.

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
- Uygulamaya ait ayrı bir sunucu, analitik veya bulut eşitlemesi yoktur. Uzantı kaldırılırsa yerel veriler silinebilir; Ayarlar → Arşiv ve yedekleme bölümünden JSON yedeği alınabilir.
- Gerekli izinler: yerel kayıtlar için `storage`, seçili metne sağ tık araması için `contextMenus` ve TMDB verileri için `https://api.themoviedb.org/*`. Gezinme geçmişi veya tüm sayfalara erişim izni istenmez.
- `.env` dosyaları, bağımlılıklar, derleme çıktıları, yerel profiller ve test raporları Git dışında tutulur. Test dosyalarındaki `demo-token`, `secret-token` gibi değerler işlevsiz örneklerdir.

## Takip davranışı ve sınırlar

- Bölüm bilgileri TMDB'ye bağlıdır. Katalog altı saat önbelleğe alınır; Yenile düğmesi güncel bilgiyi yeniden ister. Bağlantı hatasında varsa önbellek uyarıyla gösterilir.
- Özel bölümler varsayılan kapalıdır. Gelecek tarihli bölümler işaretlenemez. Tarihi bilinmeyen bölüm elle işaretlenebilir; otomatik ilerleme yalnızca yayımlanmış bölümleri seçer.
- Devam eden diziye yetişmek yayın tamamlandı anlamına gelmez. Önceden genel durum olarak Tamamlandı seçilen kayıtlar otomatik bölüm işaretlerine dönüştürülmez.
- İzleme turları ve tarih bazlı yeniden izlemeler ayrıdır. İlk tur silinmez; ek turlar onayla kaldırılabilir. Not taslakları sekme değişiminde korunur, panel kapatılmadan önce Kaydet ile saklanmalıdır.
- Koleksiyon silmek yapımı kütüphaneden kaldırmaz. Yapım kütüphaneden kaldırılırsa koleksiyon üyelikleri de temizlenir.
- Eski kayıtların kesin eklenme tarihi bilinmediğinden tarih uydurulmaz. Ayrı pencerelerde eşzamanlı düzenlemede son kayıt geçerlidir.

## Proje yapısı

- `entrypoints/popup/`: Kompakt uzantı ekranı.
- `entrypoints/dashboard/`: Geniş yönetim sayfası.
- `entrypoints/background.ts`: Seçili metin bağlam menüsü ve popup açma.
- `src/`: Arayüz, TMDB istemcileri, yerel depolama ve testler.
- `public/icons/`: Paketlenen PNG ikonları.
- `assets/branding/`: İkon kaynağı ve üretim notları. İlk görsel kaynak korunur; güncel PNG ikonları küçük boyutlarda okunabilirliği artıran SVG kaynağından üretilir.
- `scripts/`: İkon üretimi ve örnek verilerle arayüz kontrolü.
- [Sürüm geçmişi](docs/CHANGELOG.md).

## Lisans ve atıf

Bu proje için henüz ayrı bir açık kaynak lisansı seçilmemiştir; paket `UNLICENSED` olarak işaretlidir. GitHub'da public olması bir açık kaynak lisansı eklendiği anlamına gelmez. Bağımlılıklar kendi lisanslarına tabidir; TMDB veri ve görselleri ilgili kullanım koşullarına tabidir.

This product uses the TMDB API but is not endorsed or certified by TMDB.

[TMDB geliştirici belgeleri](https://developer.themoviedb.org/docs/getting-started) · [Chrome ikon rehberi](https://developer.chrome.com/docs/extensions/develop/ui/configure-icons)

### Dil ve bildirimler

Ayarlar → Dil bölümünden Türkçe veya English seçilebilir. Tercih bu tarayıcı profilinde saklanır ve açık uzantı pencerelerine uygulanır. Arama, detay ve bölüm bilgileri seçilen TMDB dilinde istenir; önceden kaydedilmiş içerik adları, kişisel notlar ve koleksiyon adları korunur. TMDB’de seçilen dilde açıklama bulunmayabilir.

İşlem bildirimleri ekranın üstünde bağımsız açılır: ekleme yeşil, kaldırma amber, güncelleme mavi. Beş saniye sonra kapanır; üzerine gelindiğinde veya klavye odağı içindeyken bekler. Hareket azaltma tercihi etkinse giriş animasyonu oynatılmaz.

### Devam Et

Kütüphane üstündeki Devam Et alanı, izleniyor olarak işaretlenen yapımları ve aktif izleme turunda en az bir bölüm izlenmiş dizileri gösterir. Kütüphane filtrelerinden bağımsızdır. Kartlardaki bölüm işaretleme ve sezon ilerlemesi detay paneliyle aynı kaydı kullanır; afiş ve başlık detayları açar. Özel bölümler dizi tercihine göre dahil edilir. Tamamen biten diziler alandan kalkar; devam eden dizilerde yeni bölüm bekleme durumu gösterilir. Eski veya eksik TMDB bilgisinde önce yenileme gerekir. Film kartındaki Filmi izledim düğmesi filmi tamamlandı olarak işaretler ve bugünün tarihini kaydeder.

### İstatistikler ve yıl özeti

İstatistikler sekmesinde tüm zamanların izlenen farklı film/dizi sayıları, bölüm izlemeleri ve bilinen süre toplamı gösterilir. En az bir bölümü izlenen dizi sayılır. Film tekrarları ve tüm bölüm izleme turları süreye dahildir; aynı bölüm farklı turlarda tekrar sayılır. Özel bölüm geçmişi takip tercihi sonradan kapatılsa da istatistikte korunur.

Yıllık rapor ve aylık grafikler gerçek izleme tarihlerini kullanır; grafikte bir ay seçilerek geçmiş filtrelenir. Tarihsiz kayıtlar genel toplamlarda tutulur, yıllara dağıtılmaz. Süresi bilinmeyen izlemeler süre toplamına eklenmez. Elle tamamlanan diziler veya yalnızca tarihle kaydedilen dizi tekrarları, izlenmiş bölüm sayısı ya da süre varsayımı oluşturmaz.

Tür/oyuncu/yönetmen sıralamaları izlenen farklı yapım sayısını kullanır. Oyuncular TMDB ana kadrosundan (ilk 20), yönetmenler film veya izlenmiş bölüm kredilerinden alınır; dizi yaratıcıları yönetmen kabul edilmez. Puan sıralaması kütüphanedeki güncel kişisel puanlara dayanır. Yıl özeti seçilen yılın tarihli kayıtlarıyla beş sayfalık kişisel rapor sunar.

Süre, tür ve kadro bilgileri `statsMetadata:<movie|tv>:<id>` anahtarlarında yerel olarak saklanır ve 7 gün sonra yeniden alınabilir. Bölüm önbelleklerinin mevcut süreleri de kullanılır. İstekler iki yapımla sınırlanır; yalnızca izleme kaydı bulunan sezonlar alınır. TMDB’ye izleme tarihleri, notlar veya kişisel puanlar gönderilmez. Silinen içerikler ve izleme turları rapordan da çıkar.

### Yönetmen ve yaratıcı araması

Arama film/dizi adlarının yanında oyuncu, yönetmen ve yaratıcı gibi TMDB kişi kayıtlarını da kapsar. Kişi seçilince [birleşik film/dizi kredileri](https://developer.themoviedb.org/reference/person-combined-credits) üzerinden oyunculuk ve ekip görevleriyle ilişkili yapımlar birlikte gösterilir. Bir yapımda birden fazla görev varsa tek satır görünür; listeden detay açma ve kütüphaneye ekleme kullanılabilir. Sonuçlar TMDB’deki kişi ve görev kayıtlarının kapsamına bağlıdır.

### Aramadan bölüm takibi

Kütüphanede olmayan dizilerin arama detayında Bölümler sekmesi kullanılabilir. Özel bölüm/spoiler tercihleri önizlemede tutulur. İlk tekil veya toplu izlendi işlemi, dizi ve ilerlemesini aynı kütüphane yazımında kaydeder. Mevcut otomatik durum, Devam Et ve tamamlanma kuralları uygulanır; Kişisel Alanım kayıt sonrasında açılır. Sadece bölüm listesini açmak veya tercihlerle oynamak kütüphaneye eklemez.

### JSON/CSV ve arşiv sıfırlama

Ayarlar → Arşiv ve yedekleme bölümündeki JSON dışa aktarma; kütüphane, favoriler, puanlar, notlar, izleme tarihleri, tekrarlar, tüm bölüm turları ve koleksiyonları indirir. TMDB anahtarı, dil/tema/görünüm tercihleri ve yeniden alınabilen TMDB önbellekleri dosyaya dahil edilmez.

JSON içe aktarma, `moviemarks` formatındaki sürüm 1 yedeklerini doğrular ve önizler. Son onay mevcut arşivi yedekteki arşivle değiştirir; birleştirme yapmaz. Yanlış sürüm, bozuk alanlar, yinelenen kimlikler veya kayıp koleksiyon üyelikleri yazımdan önce reddedilir. Üst sınır 20 MB'dir. İçe aktarma sırasında token veya bilinmeyen ayarlar dosyadan alınmaz.

CSV yalnızca tablo çıktısıdır; tam geri yükleme JSON ile yapılır. UTF-8 BOM, tırnak/satır sonu kaçışı ve formül gibi başlayan metinler için metin öneki kullanılır. Notlar, koleksiyonlar ve toplam/aktif tur bölüm sayıları sütunlarda yer alır.

Arşivi temizle işlemi son onaydan sonra kütüphane ve koleksiyonları birlikte boşaltır; kişisel arşiv kayıtları silinir. TMDB bağlantısı, tercihler ve yeniden kullanılabilir içerik önbellekleri korunur. Geri alabilmek için işlemden önce JSON yedeği alınmalıdır.

### Popup ve geniş sayfa

Tarayıcı araç çubuğundaki `popup.html`, 480 px genişliğinde hızlı kullanım ekranıdır: TMDB araması ve içerik ekleme, kompakt Devam Et, son iki kaydın detayları ve hızlı izleme durumu değiştirme. Favoriler, Koleksiyonlar, Takvim ve İstatistikler kısayolları ilgili yönetim bölümünü yeni sekmede açar.

Geniş ekranda aç düğmesi `dashboard.html#library` adresine gider. Bu ayrı arayüzde yan menü, koleksiyon kısayolları, pencereye uyarlanan büyük kart/liste düzeni, gelişmiş filtreler ve tüm yönetim panelleri bulunur. `#favorites`, `#collections`, `#calendar` ve `#statistics` bölüm bağlantıları desteklenir. Dar pencerede yan menü simge şeridine dönüşür.

İki arayüz aynı veri ve kayıt işlemlerini kullanır; ekran seçimi pencere genişliğine göre değil giriş adresine göre yapılır. Kütüphane/bölüm ilerlemesi, tema ve dil değişimleri `browser.storage.onChanged` ile açık ekranlara yansır. Ayrı pencerelerde aynı kaydı eşzamanlı düzenlerken mevcut son-yazım davranışı geçerlidir. JSON yedek biçimi değişmez.

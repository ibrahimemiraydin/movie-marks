# Sürüm geçmişi

Eski sürümlerde anlatılan davranışlar sonraki sürüm notlarıyla değişmiş olabilir. Güncel kullanım için [README](../README.md) dosyasına bak.

## 0.2.0

- Popup tanıtım metinleri kaldırıldı.
- Arama, kişisel listeden ayrı ve kaydırılabilir panelde açılır.
- Oyuncu seçimiyle TMDB rol aldığı film/dizi listesi eklenmiştir.
- Kayıtlı yapımlar arama panelinde tekrar eklenemez; kaldırma kişisel listeden yapılır.
- Mevcut yerel liste ve token için depolama anahtarları korunmuştur.

## 0.2.1

- Tek karakterli TMDB araması.
- Arama alanının dışına tıklayınca panel kapanır.
- Benim listem için Türkçe büyük/küçük harf uyumlu yerel ad araması; film/dizi filtresiyle birlikte çalışır.

## 0.3.0 — İçerik detayları

Benim listem bölümünde afişe veya yapım adına tıklayınca ayrı detay paneli açılır. TMDB üzerinden konu, orijinal ad, türler, puan, yayın tarihi, durum, film süresi veya varsa bölüm süresi, yönetmen/yaratıcı ve ilk 12 oyuncu yüklenir. Dizilerde sezon ve bölüm sayıları da gösterilir. TMDB verisinde olmayan alanlar boş bırakılır; Türkçe konu yoksa bu belirtilir.

Panel çarpı, Escape veya dış alana tıklamayla kapanır. Klavye odağı panel içinde kalır ve kapanınca açan düğmeye döner. Panel kapanırken istek iptal edilir. Bağlantı hatasında kayıtlı bilgiler görünür ve tekrar deneme sunulur. Liste/token saklama biçimi değişmedi.

Doğrulama: otomatik testler kontrollü API yanıtları ve DOM ortamını kullanır; canlı TMDB ve gerçek tarayıcı görünümü ayrıca kontrol edilmelidir.

API kaynakları: https://developer.themoviedb.org/reference/movie-details ve https://developer.themoviedb.org/reference/tv-series-details

## 0.4.0 — İzleme durumları ve ayarlar paneli

Ayarlar, çarpı/Escape/dış alana tıklamayla kapanan ayrı bir panelde açılır. Kaydedilmeyen değişiklikler kapanınca iptal edilir. Kaydetme hataları panel içinde gösterilir.

Film ve diziler için kişisel izleme durumları:
- İzlenecek
- İzleniyor
- Tamamlandı
- Ara verildi
- Bırakıldı

Kartlardan veya detay panelinden durum değiştirilebilir. Liste durum filtresi, ad araması ve film/dizi filtresi birlikte çalışır. Gösterilen/toplam kayıt sayısı belirtilir. Durumlar tarayıcıda yerel saklanır ve başka açık Moviemarks pencerelerine kayıt değişikliği bildirilir. TMDB hesabına gönderilmez. Yayın durumu ile kişisel izleme durumu birbirinden ayrıdır.

Mevcut kayıtlarda durum yoksa İzlenecek kabul edilir; toplu veri silme veya dönüştürme yapılmaz. Yeni kayıtlar İzlenecek durumuyla eklenir. Kaydetme işlemi başarısız olursa gösterilen durum değiştirilmez. Dizilerde Tamamlandı kullanıcının yapım bazındaki seçimidir; bölüm/sezon bazlı ilerleme ve yeni sezon gelince otomatik değişim bu sürümde yoktur.

## 0.5.0 — Favoriler ve kişisel kayıtlar

- Kartlardaki kalp veya detay panelindeki Favorilere ekle ile bir yapımı favorile. Benim listem yanındaki Favoriler bölümünde görüntüle. Favoriden çıkarmak yapımı kişisel listeden silmez; listeden kaldırmak o yapımın kişisel kaydını da kaldırır.
- Detay panelindeki Kişisel alanım: 1–10 arasında tam sayı puan, en fazla 5000 karakter not ve izleme tarihi. Değişiklikler Kaydet düğmesiyle saklanır; paneli kaydetmeden kapatırsan taslak kalıcı kayda geçmez.
- Kişisel puan TMDB puanından ayrıdır. Puan verilmedi seçeneği puanı, boş not notu, Tarihi temizle tarihi kaldırır. Bugün düğmesi yerel takvim tarihini seçer. Gelecek veya geçersiz tarih kaydedilemez.
- İzleme tarihi kullanıcı tarafından belirlenir; Tamamlandı durumuna geçmek kendiliğinden tarih atamaz. Film veya dizi için tek bir izleme tarihi saklanır; yeniden izleme geçmişi ve bölüm bazında tarihler henüz yoktur.
- Favorilerde de arama, tür ve izleme durumu filtreleri kullanılabilir. Kartlarda kişisel puan ve not işareti gösterilir.
- Eski kayıtlarda favori kapalı, puan/tarih/not boş kabul edilir. Yeni alanlar mevcut kayıtlarla birlikte chrome.storage.local içinde tutulur. Kişisel puan ve notlar TMDB'ye gönderilmez.
- Testler favoriye ekleme/çıkarma, puan-not-tarih kaydı/temizleme, kayıt hatasında taslağın korunması, geçersiz veri ve yeniden yüklemede veri korunmasını kapsar. Canlı tarayıcı görünümü ayrıca kontrol edilmelidir.

## 0.6.0 — Yeniden izleme, gelişmiş filtreler ve sıralama

- Disabled Kaydet düğmesi bekleme imleci göstermez.
- İzleme durumu başka bir durumdan Tamamlandı olarak değişince izleme tarihi yerel takvimde bugüne ayarlanır. Zaten Tamamlandı olan kaydı tekrar aynı duruma geçirmek tarihi değiştirmez. Eski tamamlanmış kayıtların bilinmeyen tarihleri geriye dönük uydurulmaz. Tarihi Kişisel alanım içinden düzeltebilirsin.
- Yeniden izleme tarihleri ayrı kayıtlar halinde tutulur. Bir tarih seçip İzlemeyi kaydet ile hemen ekle; ilgili kaydın Sil düğmesi yalnızca o yeniden izlemeyi kaldırır. Aynı günde birden fazla izleme kaydı tutulabilir. Bu işlem ilk izleme alanını veya izleme durumunu değiştirmez. Not/puan taslağını da kaydetmez.
- Filtrele ve sırala bölümü: içerik türü (Dram, Komedi vb.), yıl aralığı, TMDB veya kişisel puan aralığı, yayın tarihi aralığı. Mevcut film/dizi, izleme durumu ve ad aramasıyla birlikte uygulanır; Favoriler bölümünde de çalışır. Dizilerde yayın tarihi ilk yayın tarihidir.
- Sıralama: isim, eklenme tarihi, seçilen kaynaktaki puan ve son izlenme tarihi; her biri iki yönde. Son izlenme ilk izleme ve yeniden izleme kayıtlarının en yenisidir. Eksik sıralama alanları her iki yönde sona konur; eşit veya bilinmeyen alanlarda mevcut liste sırası korunur.
- Yeni eklenen yapımlar gerçek eklenme zamanıyla saklanır. Önceki sürümler eklenme tarihi tutmadığı için eski kayıtların kesin eklenme tarihleri bilinmez ve uydurulmaz.
- Tür ve tam yayın tarihi eksik olan eski kayıtlar için gelişmiş filtre bölümünü ilk açtığında TMDB bilgileri tamamlanır. Eksik veriler için tekrar deneme düğmesi vardır. Aynı anda en fazla üç istek yapılır; hata alan gruptan sonra durulur. Anahtar veya bağlantı yoksa yerel kayıtlar korunur. Yeni eklemelerde de bu bilgiler alınmaya çalışılır.
- Metadata tamamlanırken kişisel kayıt işlemleri kısa süreli devre dışıdır. Eksik alanlar etkin filtreye dahil edilmez. Tür/yayın tarihi alınırken kişisel notlar/puanlar API'ye gönderilmez.
- Bu sürüm 0.5.0'daki tek izleme tarihi ve manuel Tamamlandı davranışını yukarıdaki şekilde genişletir. Var olan favoriler, notlar, puanlar, durumlar ve token korunur.

## 0.7.0 — Özel koleksiyonlar

- Benim listem ve Favoriler yanındaki Koleksiyonlar bölümünden koleksiyon seç veya Koleksiyonları yönet panelini aç. Örneğin En İyi Bilim Kurgu Filmleri adında bir liste oluşturabilirsin.
- Kartlardaki klasör/ekle simgesi koleksiyon üyelik panelini açar. Detay panelindeki Koleksiyonlar açılır bölümünde de birden fazla koleksiyona işaret koyabilir veya yeni koleksiyon oluşturup yapımı doğrudan ekleyebilirsin. Üyelikler anında kaydedilir.
- Koleksiyon adları 1–80 karakterdir; baş/son boşluklar temizlenir ve aynı adla ikinci koleksiyon oluşturulamaz. Türkçe büyük/küçük harf eşleşmesi kullanılır. İsim değiştirmek üyelikleri korur.
- Koleksiyondan çıkarmak veya koleksiyonu silmek ana listedeki yapımı, puanını, notlarını, tarihlerini ya da favori bilgisini silmez. Koleksiyon silme panelde onaylanır.
- Ana listeden kaldırılan yapımın tüm koleksiyon üyelikleri de temizlenir; liste ve koleksiyon değişiklikleri tek yerel kayıt çağrısıyla yazılır. Film ve dizi kimlikleri ayrıdır. Tek bir yapım çok sayıda koleksiyonda bulunabilir, aynı koleksiyonda iki kez tutulmaz.
- Koleksiyon içeriği mevcut arama, film/dizi, izleme durumu, gelişmiş filtre ve sıralamayla birlikte çalışır. Seçicideki sayı koleksiyonun toplam mevcut yapım sayısıdır; liste sayacı filtrelenmiş/ toplam sayıyı gösterir.
- Koleksiyonlar chrome.storage.local içindeki ayrı collections anahtarında saklanır; eski profiller boş koleksiyonlarla başlar. Ana listedeki mevcut kişisel alanlar ve TMDB token'ı değiştirilmez. TMDB anahtarı olmadan koleksiyonları düzenleyebilirsin. Koleksiyon adları ve üyelikler TMDB'ye gönderilmez.
- Otomatik testler oluşturma, yeniden adlandırma, çoklu üyelik, kimlik ayrımı, tekrar eklememe, ana listeden kaldırma, koleksiyon silerken yapımı koruma, kayıt hataları ve yerel depodan yeniden yüklemeyi kapsar. Gerçek tarayıcı görünümü ayrıca kontrol edilmelidir.

## 0.8.0 — Dizi, sezon ve bölüm takip sistemi

### Kullanım

Bir diziyi detay panelinden aç. Sezon ve bölüm takibi bölümünde:
- Sezon seçicisinden TMDB'deki normal ve (seçeneği açarsan) özel sezonlara geç.
- Bölüm kutusunu işaretle veya geri al. Bölümü İzledim, yayımlanmış ilk izlenmemiş bölümü işaretler ve sırayı ilerletir. Atlanan bölüm varsa önce ona döner.
- Sezonun yayımlanan bölümlerini izledim, yalnızca tarihi gelmiş bölümleri topluca işaretler. Sezon işaretlerini kaldır yalnızca seçili tur ve sezonun kayıtlarını kaldırır.
- Dizi ve sezon ilerleme çubukları, seçili turdaki bilinen toplam bölüm sayısına göre hesaplanır. Yayımlanması beklenen bilinen bölümler de toplamda yer alır. Özel bölümler kapalıysa toplam/sıra/ilerlemeye dahil edilmez; işaretleri silinmez.
- Bölüm detaylarında ad, yayın tarihi, varsa süre, Türkçe açıklama ve görsel bulunur. İzlenmemiş bölümlerin açıklaması ve görseli varsayılan olarak gizlidir. Tek bölüm için açabilir veya dizi bazında spoiler korumasını kapatabilirsin.
- Yeni izleme turu ayrı, boş ilerleme açar. İzleme turu seçicisinden ilk veya önceki turlara dönebilirsin; önceki işaretler korunur. Bu özellik eski kişisel yeniden izleme tarihi kayıtlarından ayrıdır.

### Tamamlanma ve eski kayıtlar

- Bölüm işaretleri yayımlanmış/daha önce izlenmiş bilgilerin kişisel kaydıdır. Bölüm işaretlemesi ile kişisel durum İzleniyor olarak güncellenir. Yalnızca yayını bitmiş/iptal edilmiş dizinin takip edilen tüm bilinen bölümleri izlendiyse Tamamlandı olur ve izleme tarihi bugüne kaydedilir.
- Devam eden dizinin güncel bölümlerine yetişmek, yayın tamamlandı anlamına gelmez; İzleniyor olarak kalır. Yeni bölümler geldiğinde yüzde ve sıradaki bölüm yeniden hesaplanır.
- Önceden genel durum olarak Tamamlandı seçilmiş dizilerin bölüm işaretleri otomatik uydurulmaz. Geçmiş ilerlemeyi sezon toplu işaretleme düğmeleriyle girebilirsin. Genel durum seçicisi bölüm kutularını kendiliğinden değiştirmez.
- Gelecek tarihli bölümler işaretlenemez. Yayın tarihi bilinmeyen bölüm elle işaretlenebilir; otomatik sıra/toplu işaretleme tarihi bilinmeyenleri atlar. TMDB takvim günü bilgisi kullanılır; saat veya yayın platformuna göre kesin erişim saati bilinmez.
- Son izlenen bölüm işaretleme zamanına göre belirlenir; toplu işaretleme eşit zamanlarında en yüksek bölüm sırası gösterilir. İzlenme tarihine göre liste sıralaması bölüm izleme kayıtlarını da dikkate alır.

### Takvim ve veri

- Takvim sekmesi, kişisel listedeki bütün dizilerin bugün veya sonrası için TMDB'de tarih verilmiş, seçili turda izlenmemiş bölümlerini tarih sırasıyla gösterir. Takvim açıklama/görsel göstermez; diziye basınca detayları açılır. Özel bölümler dizi ayarına göre dahil edilir. TMDB'nin next_episode_to_air bilgisi de varsa kullanılır.
- Bölüm ve sezon bilgileri TMDB dizi/sezon uçlarından alınır. Aynı dizinin sezonları en fazla üç paralel istekte yüklenir. Takvim dizileri sırayla işler. Büyük listelerde ilk yükleme zaman alabilir; görünümden çıkınca yükleme iptal edilir.
- Kataloglar ayrı tvCatalog:<id> yerel anahtarlarında altı saat önbelleğe alınır; Yenile düğmesi bunu atlar. Bağlantı yoksa mevcut önbellek uyarıyla gösterilir. Gerçek yayın tarihi/sezon bilgisi TMDB'ye bağlıdır.
- Kısmi yüklemede başarılı sezonlar korunur ve eksik veri belirtilir. Eksik sezonlar otomatik sıra ve Tamamlandı hesabını engeller; Yenile ile tekrar denenebilir. Ağ/kayıt hatası kişisel ilerlemeyi silmez.
- İzleme turları, seçenekler ve bölüm işaretleme zamanları Media.episodeTracking içinde kişisel listeyle birlikte saklanır; API'ye gönderilmez. Favoriler, koleksiyonlar, notlar ve puanlar korunur. Katalog önbelleği kişisel ilerleme değildir.
- Otomatik testler sıra/boşluklar, tek tıkla ilerleme, sezon toplu işlemi, tamamlanma, yeni bölüm, özel sezonlar, tekrar izleme turları, spoiler gizleme, takvim, hatalar/iptal/önbellek, App kaydı ve yeniden yüklemeyi kapsar. Gerçek TMDB token'ıyla ağ ve tarayıcı görünümü ayrıca doğrulanmalıdır.

API kaynakları: https://developer.themoviedb.org/reference/tv-season-details ve https://developer.themoviedb.org/reference/tv-series-details

## 0.9.0 — Arayüz ve renk sistemi

Arayüz antrasit, kırık beyaz ve altın vurgulu yeni bir tasarıma taşındı. Ana zemin #0D0F14, paneller #15181F, yükseltilmiş yüzeyler #1D212B, ana yazı #F4F5F7, ikincil yazı #B8C0CE ve vurgu #E9BB68. Renkler src/style.css içindeki ortak değişkenlerden yönetilir. Bu seçim film siteleri için evrensel tek doğru palet iddiası değil; afişleri öne çıkaran, sınırlı vurgu kullanan bir tasarım tercihidir.

- Kütüphane sekmeleri ikonlar ve seçili durumlarıyla tek gezinme alanında toplandı; gereksiz BETA etiketi kaldırıldı. Tanıtım/slogan alanı eklenmedi.
- Liste araması ve Film/Dizi seçimi aynı satırda. Durum ve gelişmiş filtreler daha kompakt bir düzende.
- Favori ve koleksiyon hızlı işlemleri afiş üzerinde; kaldırma düğmesi kart altındaki ikona taşındı. Klavyeyle erişim ve açıklayıcı adları korunur.
- Kartlar, detay paneli, arama paneli, ayarlar, koleksiyonlar, kişisel alan, bölüm takibi ve takvim ortak yüzey, kenar, düğme ve odak stilini kullanır.
- Durumlar metin ve renk beraber kullanılarak ayrılır. Hover/selected/pressed/disabled/focus durumları belirginleştirildi. Disabled düğmede bekleme imleci yoktur. Azaltılmış hareket tercihi desteklenir.
- Veri şeması, TMDB bağlantısı ve kişisel kayıt biçimi değiştirilmedi.

### Görsel doğrulama

```sh
npm run build
npx playwright install chromium
npm run test:ui
```

UI kontrolü üretim çıktısını Chromium'da 580x600 ve 1440x1000 boyutlarında açar. Uzantı depolaması/API yanıtları kontrollü örneklerle değiştirilir; gerçek profil/token okunmaz. Önizlemelerdeki afişler test için üretilmiş demo vektörlerdir. Gerçek uzantıda TMDB afişleri kullanılmaya devam eder. artifacts/ui altında ekran görüntüleri ve validation.json oluşturulur. Üretim paketine bu örnekler veya test araçları dahil edilmez.

Doğrulama kapsamı: yatay taşma, sekmeler, film/dizi filtresi, ayarlar ve Escape, bölüm işaretleme, disabled Kaydet imleci, arama dışına basarak kapatma, koleksiyon filtresi, takvim, sayfa hataları ve beş ana metin/zemin kontrast çifti. Bu ölçüm bütün arayüzün WCAG sertifikası veya gerçek TMDB hesabıyla uçtan uca test anlamına gelmez.

Tasarım kaynakları:
- Material yüzey/renk rolleri: https://m3.material.io/styles/color/roles
- W3C normal metin için 4.5:1 kontrast ilkesi: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum

## 0.10.0 — Temalar, sekmeler ve özel seçim menüleri

- Benim listem bölümü Kütüphane adını aldı. Favoriler ve Koleksiyonlar aynı kütüphane kayıtlarının farklı görünümleridir.
- Başlıktaki güneş/ay simgesinden veya Ayarlar > Görünüm bölümünden Aydınlık/Karanlık seç. Tercih chrome.storage.local içindeki theme anahtarında saklanır, tekrar açılışta yüklenir ve diğer açık uzantı pencerelerine uygulanır. Önceki profiller karanlık temayla başlar. Kaydetme hatasında önceki tercih korunur ve hata gösterilir.
- Filtrele ve sırala artık ayrı modal panel açar. İzleme durumu, tür/yıl/tarih/puan ve sıralama bu paneldedir. Değişiklikler anında listeye uygulanır; Sonuçları göster veya çarpı/Escape/dış alan paneli kapatır. Sıfırlama gelişmiş filtreleri, durum filtresini ve sıralamayı sıfırlar; yerel ad araması ve film/dizi hızlı filtresi bağımsızdır. Etkin filtre/sıralama sayısı düğmede gösterilir.
- Detay paneli Genel Bakış, diziler için Bölümler ve Kişisel Alanım sekmelerine ayrıldı. Afiş, favori/koleksiyon düğmeleri ve izleme durumu ortak başlıkta kalır. Filmlerde bölüm sekmesi gösterilmez. Bölüm ve kişisel alan ilk ziyaretlerinde yüklenir; sekmeler arasında geçiş not taslağını ve bölüm görünümünü silmez. Panel tamamen kapatılırsa kaydedilmemiş not taslağı kalıcılaştırılmaz.
- Detaydaki Koleksiyonlar düğmesi afiştekine benzer ayrı bir panel açar. Üstteki panel kapanınca içerik detayları açık kalır; klavye odağı önceki düğmeye döner ve arka plan kaydırma kilidi korunur.
- İzleme durumu, koleksiyon seçimi, kişisel puan, sezon/tur seçimi ve filtre menüleri ortak özel Select bileşenini kullanır. Tarayıcının native select menüsü kalmadı. Menüler tema ile uyumludur; seçili satırı işaretler, uzun listelerde kaydırılır ve native Popover top layer üzerinden dialog/scroll sınırlarında kesilmeden açılır. Güncel Chromium tabanlı tarayıcılar hedeflenir. Tarih alanlarının native tarih seçicisi korunur.
- Açılır menü klavye desteği: yukarı/aşağı, Home/End, ilk harf, Enter/Boşluk, Escape; Tab dışarı geçer. Escape önce açık menüyü, sonra üst paneli kapatır. Detay sekmeleri sol/sağ ok ve Home/End ile de değiştirilebilir.
- Kişisel kayıtlar, koleksiyonlar, bölüm ilerlemeleri ve TMDB anahtarı korunur; tema yalnızca yeni bir yerel tercih alanıdır.
- Doğrulama: birim/DOM testleri, gerçek Chromium'da karanlık ve aydınlık tema, yeniden açılışta tercih, panel üstünde özel menü, klavye seçimi/Escape, iç içe koleksiyon paneli, sekmeler arasında taslak ve yatay taşma. İki temada ana metin/zemin çiftleri en az 4.5:1 ile kontrol edilir; bu bütün arayüz için WCAG sertifikası değildir. Örnek veriler ve kontrollü API yanıtları kullanılır; gerçek TMDB hesabı bu kontrolde kullanılmaz.

## 0.11.0 — İzleme turu silme, yeniden izleme görünümü ve ikon

- Bölümler sekmesinde ilk tur dışındaki seçili turlar için İzleme turunu sil düğmesi vardır. Düğme, seçili turun adını ve silinecek işaret sayısını belirten bir onay açar; Vazgeç kayıtları değiştirmez.
- Turu sil yalnızca seçili turu kaldırır. İlk izleme korunur. Aktif tur silindiğinde önceki mevcut tura geçilir; o turun bölüm işaretleri ve tamamlanma durumu geri gelir. Kayıt hatasında tur ve onay korunur. Diğer turlar, kişisel not/puan/favori ve koleksiyonlar etkilenmez.
- Aradan tur silindikten sonra yeni tur adları çakışmaz; mevcut en büyük tur numarasının bir sonrası kullanılır.
- Kişisel alanımdaki tarih bazlı yeniden izleme satırları takvim ikonu, çerçeve ve ayrı tehlike rengi Sil düğmesiyle yenilendi. Tarih kaydı silme ve bölüm ilerlemesi turunu silme birbirinden bağımsızdır.
- Yeni ikon: antrasit yuvarlatılmış kare içinde altın yer imi ve negatif alanda oynatma simgesi. Yerleşik image_gen ile üretilmiştir; şeffaf köşeler korunur. Üretim promptu: assets/branding/icon-prompt.md. Kaynak: assets/branding/moviemarks-icon-source-v1.png.
- `npm run icons` ile kaynaktan 16, 32, 48, 128, 256 ve 512 px PNG boyutları üretilir. Manifest icons/action.default_icon, favicon ve uygulama başlığı yeni varlıkları kullanır. Public ikonlar üretim paketine dahildir; kaynak görsel ve üretim promptu paket dışındadır.
- İkon ölçü/alfa doğrulaması artifacts/branding/validation.json, küçük boyut kontrolü artifacts/branding/icon-size-check.png içinde tutulur. Üretim paketindeki manifest referansları ile dosya boyutları Chromium smoke kontrolünde de doğrulanır.
- Ek testler: boş turu iptal/sil, ilerlemeli turun korunması, ilk turu silme koruması, mevcut tur adlarının çakışmaması, kayıt hatası ve yeniden izleme düğmesinin görünmesi. Chromium örnek depo/API verileriyle tur silme, önceki ilerlemeye dönüş, yeniden izleme silme ve ikon yükleme kontrol edilir. Gerçek kullanıcı profilindeki toolbar simgesi bu otomatik kontrolde açılmaz.

Chrome ikon rehberi: https://developer.chrome.com/docs/extensions/develop/ui/configure-icons

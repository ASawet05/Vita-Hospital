# Vita Hospital

2.5D izometrik hastane yönetimi, acil servis ve klinik dedektiflik oyunu. Tarayıcıda çalışır, kurulum ya da derleme gerektirmez.

**Canlı sürüm:** https://asawet05.github.io/Vita-Hospital/

> **Önemli:** Vita Hospital bir eğitim oyunudur. Gerçek tıbbi teşhis veya tedavi önerisi sunmaz. Klinik düşünmeyi, doğru soru sormayı ve sağlık okuryazarlığını öğretir. Oyundaki referans aralıkları ve acil senaryolar sadeleştirilmiş örneklerdir.

## Tamamen özgün grafikler

Oyunda **hiçbir harici görsel ya da ses dosyası yoktur**. Her şey HTML5 Canvas üzerinde kodla çizilir:

- zemin dokuları ve duvarlar
- 100'ü aşkın eşya, cihaz ve dekor türü
- karakterler, araçlar ve kampüs

Çizim kiti (`js/art.js`, `js/art_extra.js`) her nesneyi kutu, silindir, küre ve yüzey süslerinden kurar. Nesneler dünya koordinatında tanımlandığı için 4 kamera açısında da doğru yüzleri görünür.

## Nasıl oynanır

| İşlem | Masaüstü | Mobil |
|---|---|---|
| Yürüme | `WASD` / ok tuşları (`Shift` ile koşma) | Sol alttaki joystick |
| Etkileşim | `E` / `Enter` veya karaktere/cihaza tıklama | Sağ alttaki dinamik eylem düğmesi |
| Kamera | Sürükle, tekerlek, `Q` / `R` ile 90° döndürme, `F` ile takip | Sürükle, iki parmakla yakınlaştırma, düğmeler |
| Yönetim paneli | `P` veya sağdaki **Yönetim** | Sağdaki 🏗️ |
| Personel yönetimi | `K` | Sağdaki 👥 |
| Düzenleme modu | `B`; içinde `T` döndürür, `Esc` iptal eder, `Delete` dekoru satar | Sağdaki 🛋️ |
| Görevler & başarımlar | `G` | Sağdaki 🎯 |
| Ses | `M` veya 🔊 | 🔊 |

## Oyun döngüsü

### Klinik akış

- **Aktif Vaka Akış Şeması** (sol üst): Seçili hastanın tedavi zincirini adım adım gösterir. Tamamlanan adımlar yeşil tikle işaretlenir, aktif adım parlar ve ne yapılacağını söyler.
- **Yön çizgisi ve hedef vurgusu:** Gidilecek yeri gösterir:
  - istasyonun üstünde zıplayan ikon ve zemin halkası
  - yerde kesikli yol çizgisi (başka kat için asansöre yönlendirir)
  - hedef ekran dışındaysa kenarda bir ok
- **22 çok katmanlı poliklinik vakası:** Doğru sorular gizli ipuçlarını açar, tahliller görsel bir raporla incelenir ve sonunda 3 stratejik karardan biri seçilir. Yeni vakaların konuları:
  - uyku apnesi, hipertiroidi, kontrolsüz tansiyon, çölyak
  - laktoz intoleransı, yaşlıda deliryum, kafeine bağlı çarpıntı, gut
- **15 acil senaryosu:** Siren çalar; ambulans caddeden gelir, ambulans yoluna döner ve acil kapısına yanaşır. Paramedik hastayı tekerlekli sandalyeyle triyaja getirip yaşamsal bulguları teslim eder. Yeni senaryolar:
  - KOAH alevlenmesi, zatürre, sepsis, mide-bağırsak kanaması, inme, elektrik çarpması
  - karbonmonoksit zehirlenmesi (oksimetrenin yanıltıcı olabileceğini öğretir)

### Ödüller ve nöbet

- **Sabır barları ve kombo:** Hastaların sabrı zamanla yeşilden kırmızıya düşer. Bekletmeden peş peşe doğru tedavi 2x ve 3x kombo kazandırır.
- **Nöbet döngüsü:** Gündüz ve gece nöbetleri sırayla gelir. Her nöbet sonunda **Nöbet Özeti** açılır ve şunları gösterir:
  - maaş bordrosu, hastane puanı ve temizlik
  - geliştirme mağazası

### Hastane yönetimi

- **Personel yönetimi:** Her çalışanın yetenek (1-5★), seviye/deneyim, enerji, moral, maaş ve bir özelliği vardır (Hızlı, Güler Yüzlü, Çalışkan, Tecrübeli, Öğrenmeye Açık, Titiz, Huysuz). Verimlilik muayene, tahlil, kayıt ve eczane sürelerini doğrudan etkiler.
  - Eğitim, zam ve prim verilebilir.
  - İş başvurularından hemşire, nöbetçi doktor, temizlik görevlisi ve teknisyen alınabilir.
  - Maaşlar her nöbet sonunda ödenir.
- **Ekipman yükseltme:** 8 kategori vardır, her biri 3 modelde (ör. *Temel Hasta Monitörü → 12 Kanallı EKG Monitörü → Telemetrik İzlem Sistemi*). Yükseltilen cihazın görünümü de değişir.
  - Cihazlar kullandıkça yıpranır; %50'nin altında işler yavaşlar.
  - Bakımı teknisyen kendiliğinden yapar ya da cihazın yanında "Bakım Yap" seçilir.
- **Düzenleme modu:** Eşya ve cihazlar taşınıp döndürülebilir. Konforu artıran 14 dekor satın alınabilir: akvaryum, bilgilendirme TV'si, kanepe, kahve makinesi, bitkiler vb.
  - Kapı önleri ve hasta güzergâhları her zaman açık kalır.
  - Bir alanı kapatan ya da yolu çok uzatan yerleşime izin verilmez.
- **Hasta ihtiyaçları ve temizlik:**
  - Bekleyen hastalar otomat, su sebili ya da kahve makinesine gider.
  - Yere çöp düşebilir; yakında çöp kutusu varsa düşmez.
  - Kirli hastanede sabır daha hızlı azalır.
- **Hastane puanı (0-5★):** İtibar, güvenlik, temizlik, konfor, personel morali ve ekipman durumundan hesaplanır. Gelir ve hasta akışını etkiler.
- **Ücret politikası:** Uygun, Standart ya da Premium.
- **Rastgele olaylar:** grip salgını, sıcak hava dalgası, zincirleme trafik kazası, Sağlık Bakanlığı denetimi, hayırsever bağışı.
- **Günlük görevler ve başarımlar:** Her gün 3 yeni görev gelir; hepsini tamamlamak seri bonusu verir. 20 kalıcı başarım vardır.
- **Hastaneyi büyütme:** Asansörle erişilen 3 yeni kat açılabilir:
  - Cerrahi & Ameliyathane
  - Yatan Hasta & Pediatri
  - Radyoloji & İleri Tanı (en üst görüntüleme modelinde BT tarayıcı kurulur)

## Canlı dünya

- **Trafik:** Ana caddede iki şeritli trafik akar. Araçlar mesafe korur, yaya geçidinde durur ve ambulansa yol verir.
- **Yayalar:** Kaldırımlarda yürüyenler, koşucular, köpek gezdirenler ve otobüs bekleyenler dolaşır.
- **Kampüs:**
  - süs havuzu, bayraklar, giriş saçağı, ACİL tabelası
  - saksılar, bisiklet parkı, piknik masaları
  - Başhekim yaklaşınca havalanan güvercinler
  - ara sıra geçen kuş sürüleri
- **Hava ve ışık:**
  - Bazı nöbetler yağmurlu geçer; yayalar şemsiye açar, ağaçlar rüzgârda daha çok salınır.
  - Gece nöbetinde sokak lambaları ve araç farları yanar.
- **Karakterler:**
  - göz kırpma, nefes alma, ruh hâline göre yüz ifadesi
  - rol kıyafetleri: önlük, forma, reflektörlü paramedik üniforması, temizlik önlüğü, hasta önlüğü
  - saç modelleri, başörtüsü, sakal, gözlük, baston
  - elde pano, tablet ya da paspas

## Tür karşılaştırması

Bu karşılaştırma, başarılı hastane simülasyonlarında (ör. Two Point Hospital, Theme Hospital) öne çıkan temel oynanış döngülerini Vita Hospital ile karşılaştırır. Bu oyunların hiçbir içeriği, karakteri ya da görseli kullanılmamıştır.

| Temel döngü | Türdeki yaygın karşılığı | Vita Hospital'daki karşılığı |
|---|---|---|
| Personel derinliği | Özellikli personel, maaş, eğitim, yorgunluk | Yetenek, seviye, 7 özellik, enerji, moral, eğitim, zam/prim, bordro, dinlenme odası |
| Hasta memnuniyeti | Bekleme, ihtiyaçlar, konfor eşyaları | Sabır barı, otomat/su/kahve ihtiyacı, konfor puanı veren dekorlar |
| Temizlik | Çöp, temizlik görevlisi | Yere düşen çöp, çöp kutusu etkisi, otomatik temizlik görevlisi |
| Makine bakımı | Arıza, teknisyen | Yıpranma, yavaşlama, teknisyen ya da elle bakım |
| Ekipman ilerlemesi | Makine yükseltmeleri | 8 kategori × 3 model, görünür seviye farkı |
| Yerleşim ve özelleştirme | Oda ve eşya yerleşimi | Taşı/döndür/sat, yol güvenliği ve bağlantı denetimi |
| Hastane değerlendirmesi | Yıldız, hedefler, denetim | 0-5★ puan, Bakanlık denetimi, günlük görevler, başarımlar |
| Ekonomi | Fiyatlandırma, gelir/gider | Ücret politikası, maaşlar, bakım giderleri, pasif servis geliri |
| Olaylar | Salgınlar, acil durumlar | Grip salgını, sıcak hava, zincirleme kaza, denetim, bağış |
| Vaka çeşitliliği | Çok sayıda hastalık | 22 poliklinik + 15 acil senaryosu, eğitsel geri bildirim |

**Vita Hospital'a özgü yönler:**
- gerçek klinik düşünmeye dayalı sorgulama
- kırmızı bayrak eğitimi
- tahlil yorumlama
- eczanede doğru ilaç bilgilendirmesi

## Dosyalar

```
index.html, style.css
js/assets.js     Açılış hazırlayıcı + modüller arası olay yolu (VH.on / VH.emit)
js/audio.js      Web Audio ile sentezlenen ses efektleri
js/art.js        Prosedürel 2.5D izometrik çizim kiti (eşya, cihaz, kampüs)
js/art_extra.js  Ambulans, süs havuzu, saçak, bayraklar, dekor kataloğu
js/people.js     Ayrıntılı karakter çizimi (yüz ifadeleri, kıyafetler, aksesuarlar)
js/map.js        İzometrik motor, kamera, katlar, prosedürel zemin/duvar, dış dünya
js/entities.js   Karakterler, A* yol bulma, hasta/personel yapay zekâsı, ihtiyaçlar
js/cases.js      Poliklinik vakaları ve 6 adımlı vaka döngüsü
js/content.js    Ek vakalar, acil senaryoları ve eczane bilgilendirmeleri
js/hospital.js   Acil servis ve ambulans rotası, eczane, kombo, nöbet, yönetim paneli
js/staff.js      Personel yönetimi: yetenek, seviye, enerji, moral, maaş, iş başvuruları
js/equipment.js  Ekipman modelleri, yıpranma, bakım ve görsel seviye farkı
js/build.js      Düzenleme modu: taşıma, döndürme, dekor, bağlantı denetimi, konfor
js/progress.js   Hastane puanı, temizlik, ücret politikası, olaylar, görevler, başarımlar
js/world.js      Trafik, yayalar, güvercinler, kuşlar, yağmur, far ışıkları
js/guide.js      Akış şeması, hedef vurgusu, zemin yön çizgisi
js/save.js       Doğrulamalı localStorage kaydı
js/ui.js         HUD, yönetim menüsü, paneller, joystick, diyaloglar
js/main.js       Açılış ve oyun döngüsü
```

Test parametreleri:
- `?nosave` kaydı kapatır.
- `?nointro` açılış hikâyesini atlar.
- `?touch` mobil kontrolleri zorlar.
- `?selftest` çizim kiti raporunu sayfaya yazar.

## Tıbbi içerik hakkında

Vaka ve acil senaryoları, genel kabul görmüş temel klinik bilgilere dayanır: uyarı işaretleri, ilk yaklaşım ve doğru yönlendirme. Değerler eğitim amaçlı sadeleştirilmiştir. Bu içerik bir hekim değerlendirmesinin yerini tutmaz.

## Lisans

Kod ve grafiklerin tamamı bu proje için özgün olarak yazılmıştır. Üçüncü taraf görsel, ses ya da kütüphane kullanılmaz.

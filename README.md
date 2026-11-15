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
| Kamera | Sürükle, tekerlek, `Q` / `R` ile 90° döndürme, `F` ile takip | Sürükle, iki parmakla yakınlaştırma |
| Başhekimlik bilgisayarı (VitaOS) | Masaya yaklaşıp `E`, ya da masadayken `P` | Masada eylem düğmesi |
| Salt okunur özet (uzaktan) | `P` / `K` / `G` (masada değilken) | ⚙️ Ayarlar → Özet |
| Düzenleme modu | `B`; içinde `T` döndürür, `Esc` iptal eder, `Delete` dekoru satar | VitaOS → Düzenleme Modu |
| Ayarlar | `+` / `-`, `M` | ⚙️ Ayarlar: Ses, Yakınlaştır/Uzaklaştır, Kaydet, Başhekim Odasına Git, Özet |

Sağ üstte yalnızca tek bir **⚙️ Ayarlar** düğmesi vardır. Yönetim uygulamaları Başhekimlik odasındaki bilgisayardadır.

Bildirimler üst barın hemen altında tek satırlık, kayan bir şeritte gösterilir:
- Başka kattaki olaylar kat rozetiyle görünür.
- Şeride dokununca sıradakine geçilir.
- Geçmiş bildirimler bilgisayardaki bildirim merkezinde saklanır.

Mobilde akış şeması tek satırlık bir şeride küçülür (dokununca açılır).

## VitaOS · Başhekimlik bilgisayarı

Masaya oturunca tam ekran bir masaüstü açılır. Masaüstünde:
- Kodla çizilmiş özgün simgeler
- Sürüklenebilir pencereler (küçült / büyüt / kapat)
- Görev çubuğu: Başlat menüsü, açık uygulama sekmeleri, bildirim merkezi (🔔), saat ve tarih

Uygulamalar:
- **MedKariyer.com:** Sekmeli ve adres çubuklu bir tarayıcı penceresi.
  - İlan yayınlama (nöbet başına 2 yenileme)
  - Kadro açıkları
  - Adayların özgeçmiş kartları: uzmanlık puanı, okul, deneyim yılı, maaş beklentisi
  - "İşe Al" (nöbet başına 3 kota)
- **MedDepo ERP:** Canlı stok çubukları ve koli sepeti. Siparişler canlı kargo takibiyle izlenir: Sipariş Onaylandı → Araç Yola Çıktı → Yükleme Peronuna Ulaştı → Teslim Edildi.
- **BiyoMed Teknik:** Tüm cihaz gruplarının yıpranma yüzdeleri, arızalar, yedek parça ve teknik servis siparişi, servis talep takibi.
- **Yönetim Paneli:**
  - Finans: gelir-gider bilançosu ve grafik
  - Canlı güvenlik kameraları (4 kamera)
  - Birim doluluk oranları
  - Kat açılış onayları
  - Acil kredi
  - Genel ayarlar
- **Diğerleri:** Personel, Hastane Gelişimi, Ekipman Yükseltme, Görevler & Başarımlar, Başhekim Karnesi, Düzenleme Modu.

**Uzaktan erişim kuralı:** Koridordayken yalnızca salt okunur özet açılır. İşe alım, stok siparişi ve parça talebi için bilgisayara oturmak gerekir.

**İflas koruması:**
- Bütçe eksiye düşerse kat, cihaz, personel ve sipariş alımları kilitlenir ve uyarı gösterilir.
- Acil kredi: ₺20.000 hemen hesaba geçer; geri ödemesi 5 nöbet × ₺4.800.

## Genişletilmiş kampüs ve yerleşke içi otopark

- **Kampüs sınırı:** Korkuluk, hastanenin güneyindeki park bahçesini ve doğudaki otoparkı içine alacak şekilde genişletildi. Başhekim yürüyüş yolları, banklar, ağaçlar ve çiçeklikler arasında gezebilir; korkuluk dışına çıkamaz.
- **Sivil otopark:** Hasta araçları caddeden gelir, bariyerden geçip park çizgilerine park eder. Sürücüler bazen hasta olarak inip bahçeden ana girişe yürür.
- **Ambulans alanı:** Ambulans, acil kapısı önündeki kırmızı-beyaz şeritli yanaşma alanına park eder. İki paramedik hastayı sedyeyle içeri taşır.
- **Yükleme peronu:** Lojistik ve teknik servis aracı yerleşke içindeki yükleme peronuna yanaşır. Kurye kolileri eczane deposuna taşır. Teknisyen arızalı cihazı kıvılcımlı onarım animasyonuyla tamir eder.
- **Güvenlik:** Nizamiyede devriye gezen bir güvenlik görevlisi var.

## Aşamalı otomasyon ve çok katlı hastane

- **Başlangıç:** Yeni oyunda resepsiyon görevlisi, eczacı ve 2. muayene doktoru yoktur. Hasta kaydını resepsiyon bankosunda ("📋 Hastayı Kaydet"), ilaç teslimini eczanede siz yaparsınız. Yetişemezseniz hastalar sabrını yitirip gider.
- **Otomasyon:** İş İlanları portalından çekirdek kadroyu, uzmanları, hemşireleri, teknisyenleri ve temizlik görevlilerini aldıkça rutin işler kendiliğinden yürür. Acil Tıp Uzmanı triyajı, acil hemşiresi stabilizasyonu üstlenir. Böylece üst katlara ve yönetime odaklanabilirsiniz.
- **Başhekimlik bilgisayarı (Yönetim Terminali):** Şu uygulamaları içerir:
  - Özet (uyarı merkezi), Stok & Lojistik, Bakım & Parça, İş İlanları
  - Personel, Ekipman, Servisler, Karne

  Sipariş ve işe alım yalnızca bilgisayar başında yapılır; menüdeki "Başhekimlik Odasına Git" yön çizgisi çizer.
- **İş İlanları:** Her nöbet en fazla 2 ilan yenileme ve 3 işe alım hakkı vardır.
- **Canlı ilaç stoku:** Eczanede 5 ilaç grubu her teslimde azalır; kritik seviyede eczacı haber verir. Sipariş verilince:
  1. Lojistik kamyonu caddeden gelir.
  2. Araç bariyeri açılır.
  3. Kamyon lojistik kapısına yanaşır.
  4. Kurye kolileri eczaneye taşır.
- **Cihaz arızaları:** Yıpranan cihaz arızalanabilir; arızalı cihaz işlemleri ciddi yavaşlatır. Terminalden yedek parça sipariş edilir, parça gelince teknisyen (ya da siz) onarır.
- **Kat açma zorluğu:** Bütçe eksideyken kat, personel, ekipman ve sipariş satın alımı kilitlidir. Her katın yüksek bir maliyeti ile "minimum itibar + çözülmüş vaka sayısı" şartı vardır.
- **1. Kat · Cerrahi:** Acilde stabilize edilen travma, akut apandisit ve kalça kırığı hastaları ameliyathaneye taşınır. Ameliyatı etkileşimli mini oyunlarla bizzat yapabilirsiniz:
  1. Cerrahi Güvenlik Kontrol Listesi (hazırlık)
  2. Anestezi dengesi: "− Doz / + Doz" basılı tutularak nabız ve oksijen ibresi yeşil güvenli bölgede tutulur.
  3. Kesi: kesikli çizgi taşırmadan takip edilir.
  4. Dikiş: karşılıklı dikiş noktaları sırayla sürüklenerek birleştirilir.

  Başarı yüzdesi ameliyat gelirini ve itibarı belirler. 45 sn içinde gelmezseniz cerrah üstlenir. Ardından hasta uyandırma odasına, sonra servise geçer.
- **2. Kat · Yatan Hasta & Pediatri:** Yatırılan hastaların serum, ilaç ve ateş takibini zamanında yaparsınız (servis hemşiresi gecikince üstlenir). Pediatri odasındaki oyuncaklar çocukların moralini yükseltir.
- **3. Kat · Radyoloji & İleri Tanı:** "Daha fazla tetkik" kararı verilen vakalar ve inme şüphesindeki acil hastalar burada görüntülenir (röntgen, ultrason, EKG, MR). Her çekimde:
  1. Güvenlik sorusu (MR'da implant kontrolü, röntgende radyasyon koruması)
  2. Odak/frekans kaydırıcısıyla bulanık görüntüyü netleştirme
  3. Kırık ya da lezyon bölgesini işaretleyerek tanı koyma

  Diyaliz seansları da bu katta izlenir.
- **B1 · Yemekhane & Kafeterya:** Başhekimin enerji barı zamanla ve koşarken azalır; düşükken hız ve tedavi yavaşlar. Yemekhane tezgâhından yemek, kafeteryadan kahve alınır.
- **Katlar arası bildirimler:** Başka kattayken acil, stok, arıza, ameliyat ya da servis olayları bildirim şeridinde kat rozetiyle gösterilir.
- **Oda odak kamerası:** Ameliyathane, Başhekimlik, eczane gibi odalara girince kamera yumuşakça yakınlaşır ve çevre odaları hafifçe karartır. Çıkınca genel açıya döner. Kat değişiminde yakınlaşma geçişi yapılır.
- **Bölümlendirilmiş iç mimari:** Muayene, laboratuvar, eczane, uyandırma ve radyoloji odaları alüminyum çerçeveli yarı saydam cam bölmelerle ayrılır. Zeminler birime özgüdür:
  - Başhekimlik ve dinlenme: halı
  - Ameliyathane: steril mavi-yeşil karo
  - Yemekhane: ahşap
  - Mutfak: seramik
- **Dinamik asansör tabelası:** Bulunulan katı (Z/1/2/3/B1) ve hedef katın yönünü (▲▼) gösterir.
- **Süreli kriz görevleri:** Her krizin bir süre hedefi, ödülü ve kaçırma cezası vardır:
  - Grip salgını: 6 taburcu
  - Zincirleme kaza: 2 kazazede
  - Sıcak hava dalgası: 3 sıvı alımı
- **Dış cephe evrimi:** Servis katları açıldıkça dış duvarlar cam giydirme, LED bant ve kornişle modernleşir. Kuzeydeki şantiye vinçli inşaattan helikopter pistli ek bloğa dönüşür.
- **Güvenli yerleşke:** Kampüs taş kaideli ferforje korkulukla çevrilidir. Ana girişte nizamiye ve yaya kapısı, ambulans/lojistik girişinde açılır-kapanır bariyer vardır. Dışarıda apartmanlar, çocuk parkı, yayalar ve trafik bulunur.
- **Vardiya sonu Başhekim Karnesi:** Hasta memnuniyeti, acil servis, klinik kalite, finans, temizlik ve personel A–F arası notlanır.
- **Habersiz Sağlık Müfettişi:** Koridorlarda not alarak dolaşır, ardından raporunu verir.

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
js/art_city.js   Korkuluk, nizamiye, bariyer, apartman, çocuk parkı, ek bina, yemekhane eşyaları, MR, kamyon
js/logistics.js  Eczane stoku, sipariş, lojistik kamyonu ve kurye, yedek parça teslimatı
js/terminal.js   Başhekimlik bilgisayarı (Yönetim Terminali), uyarı merkezi, Başhekim Karnesi
js/surgery.js    Ameliyathane akışı ve cerrahi mini oyunlar
js/floors.js     Yatan hasta takibi, radyoloji görüntüleme, diyaliz, yemekhane ve Başhekim enerjisi
js/os.js         VitaOS masaüstü: MedKariyer.com, MedDepo ERP, BiyoMed Teknik, Yönetim Paneli (finans, kameralar)
js/guide.js      Akış şeması, hedef vurgusu, zemin yön çizgisi
js/save.js       Doğrulamalı localStorage kaydı
js/ui.js         HUD, yönetim menüsü, paneller, joystick, diyaloglar
js/main.js       Açılış ve oyun döngüsü
```

Test parametreleri:
- `?nosave` kaydı kapatır.
- `?allstaff` yeni oyuna tam çekirdek kadroyla başlar (test için).
- `?nointro` açılış hikâyesini atlar.
- `?touch` mobil kontrolleri zorlar.
- `?selftest` çizim kiti raporunu sayfaya yazar.

## Tıbbi içerik hakkında

Vaka ve acil senaryoları, genel kabul görmüş temel klinik bilgilere dayanır: uyarı işaretleri, ilk yaklaşım ve doğru yönlendirme. Değerler eğitim amaçlı sadeleştirilmiştir. Bu içerik bir hekim değerlendirmesinin yerini tutmaz.

Bazı senaryolar PubMed'de yer alan kaynaklarla desteklenmiştir. İlgili sonuç ekranlarında DOI bağlantısıyla gösterilir:

- Uyku apnesi ve trafik kazası riski: J Clin Sleep Med 2009 ([PMID 20465027](https://pubmed.ncbi.nlm.nih.gov/20465027/))
- Çölyak hastalığı kılavuzları:
  - ESsCD 2019 ([10.1177/2050640619844125](https://doi.org/10.1177/2050640619844125))
  - ACG 2013 ([10.1038/ajg.2013.79](https://doi.org/10.1038/ajg.2013.79))
- Yaşlılarda idrar yolu enfeksiyonuna bağlı deliryum: Cureus 2022 ([10.7759/cureus.32321](https://doi.org/10.7759/cureus.32321))
- Karbonmonoksit zehirlenmesi: Crit Care Clin 2021 ([10.1016/j.ccc.2021.03.010](https://doi.org/10.1016/j.ccc.2021.03.010))
- Surviving Sepsis Campaign 2021 ([10.1097/CCM.0000000000005337](https://doi.org/10.1097/CCM.0000000000005337))
- İnmede hastane öncesi ve hastane içi gecikmeler: Australas Emerg Care 2019 ([10.1016/j.auec.2019.01.008](https://doi.org/10.1016/j.auec.2019.01.008))
- Akut apandisit, WSES Kudüs kılavuzu 2020 ([10.1186/s13017-020-00306-3](https://doi.org/10.1186/s13017-020-00306-3))
- Kalça kırığı cerrahisinin zamanlaması:
  - Injury 2021 ([10.1016/j.injury.2021.02.049](https://doi.org/10.1016/j.injury.2021.02.049))
  - Hip Int 2024 ([10.1177/11207000241248836](https://doi.org/10.1177/11207000241248836))
- DSÖ Cerrahi Güvenlik Kontrol Listesi: NEJM 2009 ([10.1056/NEJMsa0810119](https://doi.org/10.1056/NEJMsa0810119))
- Kalp cihazı olan hastada MR güvenliği: Eur Heart J 2022 ([10.1093/eurheartj/ehab469](https://doi.org/10.1093/eurheartj/ehab469))
- Varfarin ile besin ve takviye etkileşimleri: Br J Clin Pharmacol 2020 ([10.1111/bcp.14404](https://doi.org/10.1111/bcp.14404))
- Demirin gün aşırı tek doz alımı ve emilim: Lancet Haematol 2017 ([10.1016/S2352-3026(17)30182-5](https://doi.org/10.1016/S2352-3026(17)30182-5))
- İnhaler kullanım hataları: Chest 2016 ([10.1016/j.chest.2016.03.041](https://doi.org/10.1016/j.chest.2016.03.041))
- Uzun süreli PPI kullanımının yan etkileri: Chonnam Med J 2023 ([10.4068/cmj.2023.59.2.115](https://doi.org/10.4068/cmj.2023.59.2.115))
- D vitamininin bağırsaktan emilimi: Nutr Rev 2018 ([10.1093/nutrit/nux034](https://doi.org/10.1093/nutrit/nux034))
- Levotiroksin alım zamanı: Pediatr Endocrinol Diabetes Metab 2021 ([10.5114/pedm.2021.105635](https://doi.org/10.5114/pedm.2021.105635))
- Uzun süreli metformin ve B12 eksikliği: J Clin Endocrinol Metab 2016 ([10.1210/jc.2015-3754](https://doi.org/10.1210/jc.2015-3754))
- Çocuklarda ameliyat öncesi açlık, ESAIC 2022 ([10.1097/EJA.0000000000001599](https://doi.org/10.1097/EJA.0000000000001599))

## Lisans

Kod ve grafiklerin tamamı bu proje için özgün olarak yazılmıştır. Üçüncü taraf görsel, ses ya da kütüphane kullanılmaz.

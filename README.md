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

## Kat kesiti ve bina cephesi

- **Kesit görünüm:** Zemin kattayken yalnızca zemin katın tavanı açıktır. Asansörle 1., 2. veya 3. kata çıkınca alt katların iç mekânı çizilmez. Onların yerine binanın mavi-beyaz seramik ve cam giydirme cephesi kat kat aşağı uzanır, en altta kampüs zemini görünür. Böylece kaçıncı katta olduğunuz bir bakışta anlaşılır. Bodrum katta (B1) toprak kesiti çizilir.
- **Kilitli katlar:** İnşa edilmemiş katlar cephede gri tonlu ve kilit rozetli görünür. Asansörden **👁 Önizle** ile kilitli kata çıkılabilir. Kat monokrom görünür ve alt bölümde açılış şartları ✓/✗ ile listelenir. Önizleme modunda yalnızca asansör kullanılabilir. Kat inşa edildiği anda gri ton çekilir ve kat renklenir.
- **Kat şartları:** Asansörde ve Yönetim Paneli'nde her kilitli kat için üç şart ✓ (yeşil) veya ✗ (kırmızı) ile gösterilir: **Bütçe**, **İtibar Puanı** ve **Toplam Tamamlanan Vaka**. Vaka sayacı tüm oyun boyunca taburcu edilen ve acilde stabilize edilen her hastayı sayar ve kayda yazılır.
- **Asansör tabelası:** Asansörün üstündeki LED panel bulunulan katın tam adını gösterir: `Zemin Kat`, `1. Kat - Cerrahi`, `2. Kat - Yatan Hasta`, `3. Kat - Radyoloji`, `B1 - Yemekhane`.

## Oda mimarisi ve cihaz çizimleri

- **Otomatik kapılar:** Kapılar çift kanatlı, sürgülü, buzlu cam kapılardır. Biri yaklaşınca kanatlar dışa kayar. Kapı üstündeki birim tabelaları birimin adını gösterir: `1 · MUAYENE`, `ECZANE`, `LABORATUVAR`, `AMELİYATHANE`, `MR`, `ACİL GİRİŞ` vb.
- **MR ve radyoloji:** Silindirik gantri tüneli ve nabız gibi atan mavi LED halka vardır. Hasta sedyesi tarama sırasında tünele girip çıkar. Mavi camlı kontrol kabininde, çift monitörde MR kesitlerine bakan bir radyoloji uzmanı oturur. Duvarda radyasyon uyarı levhası bulunur.
- **Ameliyathane:** Segmentli ameliyat masası ve steril örtü bulunur. Tavandan sarkan üç kollu LED lamba masaya ışık hüzmesi düşürür. Ayrıca vaporizatörlü ve körüklü, dalga formu monitörlü anestezi cihazı, serum askısı, Mayo alet tepsisi ve sayaçlı el yıkama ünitesi vardır.
- **Laboratuvar:** Renkli tüplerle dönen santrifüj, sonuç ekranlı ve LED göstergeli analizör, numune konveyörü, mikroskop ve cam kapaklı numune dolabı (+4 °C) bulunur.
- **Eczane:** Bankonun üstünde ışıklı yeşil artı ve ECZANE tabelası vardır. Bankoda barkod okuyucu bulunur, arkada renkli ilaç kutularıyla dolu yüksek raflar durur.
- **Başhekimlik ve yemekhane:** Başhekimlikte yönetici masası, geniş monitör, döner koltuk, kitaplıklar, duvar sertifikaları ve saat bulunur. Yemekhanede benmari tezgâhından buhar yükselir.
- **Araçlar:** Sivil araçlar sedan ya da SUV olarak çizilir: tekerlek ve jant, ön/arka cam, dikmeler, yan aynalar, far, stop lambası ve tampon. Gece farlar yere ışık düşürür. Lojistik kamyonetinin kasasında kırmızı medikal artı vardır. Kurye kolileri birkaç seferde eczane deposuna taşır.
- **Kampüs:** Dalga animasyonlu süs havuzunda balıklar ve nilüferler vardır. Gece ana giriş tabelası parlar.

## Durum rozetleri ve ekonomi

- **Rozetler:**
  - Bekleyen hastanın başında mavi saat rozeti vardır; halka kalan sabrı gösterir.
  - Muayene, tetkik ve ameliyattaki hastanın başında yeşil artı ve parıltı görünür; halka işlem ilerlemesini gösterir.
  - Ödeme yapan hastanın başında altın ₺ ve yeşil memnuniyet rozeti çıkar.
  - Hastanın üstünden **+₺** ve **+★** yazıları yükselir.
- **Personel animasyonları:** Temizlik görevlisinin peşinden paspas arabası gelir. Temizlik sırasında ıslak zemin uyarısı açılır. Teknisyenin başında anahtar simgesi ve onarım ilerleme çubuğu görünür.
- **Ekonomi dengesi:**
  - Personel maaşları yaklaşık %40 düşürüldü; eski kayıtlar da otomatik olarak uyarlanır.
  - Taburcu geliri ₺190'dan ₺330'a çıktı.
  - Muayene süresi 7–11 sn'den 5–8 sn'ye, tahlil süresi 5–8 sn'den 4–6 sn'ye indi.
  - Sonuç: kasa her nöbette büyür ve yeni katlar için birikim yapılabilir.
- **Tek satırlık bildirim şeridi:** Acil uyarısı, kriz görevi ve kombo barı HUD yerine üst bilgi çubuğunun altındaki şeride taşındı. Mesajlar şeridin solunda, kalıcı haplar sağında durur; artık hiçbiri üst üste binmez.

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

## Prestij sistemleri ve yeni mekanikler (v9)

- **Elmas (💎):** Kariyer hedefleri, hava ambulansı kurtarmaları, gizemli vakalar ve Şehir Sağlık Ligi ödülleriyle kazanılır. HUD'da 💎 olarak görünür. İtibar artık 🏅 simgesiyle gösterilir.
- **VitaOS · Prestij & Kariyer:**
  - Kademeli kariyer hedefleri, ör. "10 kritik ambulans vakasını kurtar", "Ameliyathanede 5 operasyon", "Radyolojide 8 doğru tanı".
  - Prestij Mağazası:
    - VIP uzman kadro (muayene ve tahlil %15 hızlı)
    - Lüks konfor dekorasyonu
    - Altın cihaz teması
    - Anında lojistik teslimatı
    - Helikopter pisti
    - Otonom temizlik robotları ve sensörlü el dezenfektanı istasyonları
    - B1 Espresso Barı ve Masaj Koltukları
- **Helikopter pisti ve hava ambulansı:** Bahçeye inşa edilir (₺60.000 + 25 💎). Hava ambulansı pervane ve siren animasyonuyla iner ve 90 sn'lik "Altın Saat" VIP travma vakası getirir. Defibrilatör ve damar yolu mini oyunları peş peşe 50+ puanla tamamlanırsa: +₺6.000 (gece ×1,5), İtibar +5, +15 💎.
- **Gizemli vaka:** Belirsiz semptomlarla gelen hastanın başında mor "?" işareti görünür.
  - Tahlil mini oyunundan sonra Teşhis Panosu açılır: tahlil tablosu ve görüntüleme bulgusu.
  - 3 olası tanıdan doğrusu seçilirse 3x ödül, İtibar +6 ve +5 💎.
  - 6 senaryo: hipotiroidi, B12 eksikliği, çölyak, primer hiperparatiroidi, hipertiroidi, derin ven trombozu.
- **Personel Akademisi:** Doktor ve hemşirelere Travma Cerrahisi, Hızlı Triyaj ve İleri Radyoloji kursları verilir. Eğitimli personelin önlüğüne altın uzmanlık rozeti takılır ve işlem hızı %15 artar.
- **Şehir Sağlık Ligi:** 3 rakip hastaneyle puan sıralaması yapılır; her 3 nöbette bir lig haftası kapanır. 1. sıra "Yılın Hastanesi" unvanı, ₺10.000 belediye teşviki ve 10 💎 kazandırır.
- **Günlük görevler:** 15 görev tipinden her gün 4 görev sunulur: servis bakımı, akademi, radyoloji, ameliyat, mini oyun serisi, kombo, cihaz bakımı, sıfır kaçışlı nöbet vb.
- **Teftişler:** Denetim olaylarında süreli hijyen görevleri vardır. Dezenfektan istasyonları ve temizlik robotları hijyen puanını artırır.
- **Gün döngüsü:** Gündüz nöbetinin sonunda gün batımı (turuncu atmosfer), ardından akşam olur; gece nöbeti sonunda şafak söker. Gece gelen acil vakalar **%50 Gece Nöbeti Bonusu** verir.

## Yeni etkileşimler ve düzeltmeler (v9)

- **Ameliyat masası:** Masada hasta varsa gerçek ameliyat, yoksa "Eğitim Ameliyatı" mini oyunu açılır (nöbette ilk başarıda +₺300, İtibar +1). Anestezi aşamasında ibre yeşil bölgede toplam 3 sn tutulur.
- **Radyoloji:** MR cihazı, MR kontrol konsolu, röntgen, ultrason ve EKG tıklanınca bekleyen hasta varsa gerçek çekim, yoksa kalibrasyon taraması açılır. EKG'de akan ritimdeki anormal atımlar zamanında yakalanır.
- **2. kat servis bakımı:** Serum değişimi (damla hızı), ilaç saati (kiloya göre doz) ve ateş-tansiyon yorumu 3–5 sn'lik mini oyunlardır. Üst şeritteki servis uyarısına dokununca hastaya yol tarif edilir.
- **Acil sedyesi:** Bay'deki hastaya yaklaşıp etkileşince doğru cihazla bağlantı ve oksijen/serum ya da defibrilatör mini oyunu doğrudan açılır.
- **Kaynakça:** Oyunun hiçbir ekranında kaynak, referans ya da PubMed yazısı gösterilmez.
- **Eczane danışmanlığı:** Her ilaç için tam cümleli bir soru ve üç gerçekçi seçenek vardır; yanlış seçenekler sık görülen yanlış inanışlardır.
- **Arayüz ve görsel düzeltmeler:**
  - Asansör tabelası kapının tam üstünde sabit durur.
  - Nöbet karnesi kazanılan gerçek itibarı gösterir; itibar 100 tavanındayken kazanılanlar da sayılır.
  - B1 menü panosu tezgâhın önüne taşındı.
  - Küçültülmüş Akış Şeması'na dokununca ayrıntı açılır.
- **Ekipman seviye görselleri:**
  - Sv.2/Sv.3 sedye: hidrolik kolon, korkuluk, yoğun bakım monitörü, serum askısı ve kontrol paneli.
  - Analizör: çift ekran; Sv.3'te cam kabinli otomatik hat, tüp rayı ve LED'ler.
  - Muayene odası Sv.3: monitör, dijital tanı seti ve paravan.
  - Eczane Sv.3: camlı ilaç dağıtım robotu.
- **Ambulans:** Asfalta vuran dönen kırmızı-mavi siren hüzmeleri eklendi.

## Ünite mini oyunları (v8)

Her biri 5–10 saniye sürer. Açıkken simülasyon duraklar; ✕ ile atlanırsa normal akış sürer, bonus verilmez.

- **Acil · Oksijen / Serum bağlama:** Hastaya oksijen, ventilatör veya serum bağlarken açılır.
  - Hortum ya da serum ucunu hastanın yanıp sönen portuna sürükleyin.
  - Akış vanasını (L/dk veya damla/dk) ayarlayıp ibreyi yeşil bölgede toplam 2,5 sn tutun.
  - 60 puan ve üstü: stabilizasyon belirgin hızlanır ve süreye +4 sn eklenir.
- **Acil · Defibrilatör:**
  - ŞARJ düğmesini basılı tutarak 200 J'a kadar doldurun.
  - Akan EKG'de R tepesi yeşil hedef çizgisindeyken ŞOK'a basın (3 deneme).
- **Biyo-Laboratuvar · Santrifüj + tahlil okuma:** Vaka tahlili ilk kez incelenirken açılır.
  - Tüpleri karşılıklı yuvalara yerleştirin; dengesiz yerleştirme reddedilir.
  - Rotoru çalıştırın, hız ibresi yeşildeyken durdurun.
  - Dijital raporda referans dışı değerleri işaretleyin.
  - 80 puan ve üstü: +₺150, İtibar +1.
- **Eczane · Hızlı reçete:** Reçetedeki 2–3 ürünü raftan ilaç poşetine sürükleyin (ya da dokunun) ve teslim edin.
  - 70 puan ve üstü: +₺120 ve sabır +15.
  - Ardından doğru kullanım bilgilendirmesi yapılır.
- **Ameliyathane ve MR:** Anestezi, kesi, dikiş ile odak + lezyon işaretleme mini oyunları aynı kart stilinde sürüyor.
- **Test parametresi:** `?nomini` mini oyunları kapatır; eski akış testleri bunu kullanır.

## Araç ve cihaz yenilemeleri (v8)

- **Eğimli yüzey primitifi:** Çizim kitine serbest 3B yüzey (`quad3`) eklendi; yüzeyler normaline göre otomatik gölgelenir. Araçlar eğik ön cam ve kaput, daralan kabin ve gerçek tavanla çizilir. Lastikler gövdenin altından ve çamurluktan görünür, jantlıdır.
- **Ambulans:** Eğimli kaput, mavi-koyu camlar, yan aynalar, kırmızı ve mavi şeritler, arka çift kapı, yan yüzde kırmızı hilal + artı amblemi, tavanda yanıp sönen kırmızı-mavi ışık barı (ışık yansımasıyla).
- **Lojistik kargo kamyoneti:** Yüksek kapalı kasa, "MedDepo · Tıbbi Lojistik" logosu, arka kapılar, stop ve sinyal lambaları, turkuaz kabin.
- **Sivil araçlar:** Sedan ve SUV (SUV'de tavan rayı ve üç yan cam).
- **Otobüs:** Kutu görünümlü şehir otobüsü, eğik ön cam ve pencere bandıyla yeniden çizildi.
- **Oksijen ünitesi:** İki tüp, ibresi oynayan manometre, yüzen bilyeli akış ölçer, kabarcıklı şeffaf nemlendirici hazne ve hasta hortumu.
- **Serum askısı:** Tekerlekli beş ayak, etiketli dolu serum torbası, düşen damlalı damla odacığı ve roller klemp.

## Arayüz düzeltmeleri (v8)

- **Vaka Akış Şeması:** Panel sol 12 px'e sabitlendi ve ekran içinde kalır. Sekmeler ayrı satıra iner, adım kutuları sarılır, uzun metinler kırpılmaz. Acil adımları kısaldı: `Karşılama → Triyaj → Ünite → Taburcu`.
- **Acil hastası:** Konuşma balonu süre sayacının (ve stabilizasyon halkasının) üstüne taşındı; artık üst üste binmiyor.
- **Eczane kuyruğu:** Banko önünden başlayıp kapı yolunu boş bırakan 12 ayrı bekleme noktası var. Noktalar dolarsa sıra sanal noktalarla devam eder; hastalar üst üste binmez.

## Performans

- **Zemin önbelleği:** Karo dokuları ve zemine yatık sabit nesneler 512 izo-piksellik parçalar hâlinde offscreen canvas'lara bir kez çizilir. Her karede yalnızca görünen parçalar `drawImage` ile basılır.
- **Sprite önbelleği:** Animasyonsuz nesneler ve kapı olmayan duvar parçaları ilk görüldüklerinde kendi küçük canvas'larına çizilir. Animasyonlu ya da duruma bağlı türler (kaynakta zaman, gece veya canlı durum okuyanlar) her karede canlı çizilir.
- **Önbellek ölçeği ve sıfırlama:** Önbellek yakınlaştırma × piksel oranına göre kademeli ölçeklenir. Kat, rotasyon, yerleşim veya ekipman seviyesi değişince sıfırlanır.
- **Etkisi:** Ölçülen tuval çağrısı uzak görünümde 30.072'den 8.331'e, yakın görünümde 11.540'tan 3.241'e indi.
- **Görüş alanı kırpması:** Ekranın %15 dışında kalan nesne, karakter ve araçlar çizilmez. Cihaz piksel oranı en fazla 1,75'tir.
- **Pasif katlar:** Görünmeyen katlardaki karakterler ve partiküller çizilmez; tedavi, kasa ve stok hesapları arka planda sürer.
- **Detay seviyesi (LOD):** Yakınlaştırma 0,75'in altındayken gölge bulanıklığı, partiküller, rozetler ve masa üstü mikro eşyalar gizlenir.
- **Otomatik yakınlaşma:** Uzaklaştırılmış haritada yürümeye başlayınca kamera yaklaşık 0,35 sn içinde oynanış yakınlığına (1,05) döner.
- **Test parametresi:** `?nocache` önbellekleri kapatır.

## Vaka Akış Şeması ve otomasyon

- **Boşta görünüm:** Aktif hasta yokken panel tek satıra iner: `Aktif Vaka: 0 · Tüm Birimler Akıcı`.
- **Hasta sekmeleri:** Hasta geldiğinde öncelik renkli sekmeler açılır: kırmızı = acil, sarı = ★ vaka veya sabrı azalan hasta, yeşil = normal akış.
- **Yolculuk şeması:** Seçili hastanın 4 adımı gösterilir: `Triyaj & Kayıt → Doktor Muayenesi → Kan Tahlili / MR → Eczane / Ameliyat`. Aktif adıma tıklanınca kamera hastaya ya da odaya kayar ve turkuaz işaret halkası belirir.
- **Acil ekip otomasyonu:** Acil Tıp Uzmanı veya Acil Hemşiresi ya da MedKariyer'den alınan bir hemşire/doktor varsa, ambulans yanaştığında ekipten biri dışarı çıkıp hastayı karşılar. Triyajı (3–5 sn) ve stabilizasyonu ekip yapar. Başhekim üst katta ya da bilgisayardayken hasta dışarıda beklemez.
- **Oda içi etkileşim izolasyonu:** Oyuncu ile hedef arasında duvar (cam bölmeler dahil) varsa etkileşim düğmesi çıkmaz. Aynı oda, açık kemer ve kapı aralığından erişim serbesttir.
- **Kilitli kat bariyeri:** İnşa edilmemiş katta asansör çıkışında sarı-siyah şeritli "İnşaat Alanı · Kapalı Kat" bariyeri vardır. Oyuncu lobiden çıkamaz ama kamerayı sürükleyerek odaları inceleyebilir.

## Görsel düzenlemeler (v7)

- **Muayene odaları:** Oda etiketleri kapı tabelalarıyla birebir eşleşir: `1 - Muayene Odası` ↔ `1 - MUAYENE`, `2 - Muayene Odası` ↔ `2 - MUAYENE`. Çakışan oda numaraları kaldırıldı.
- **Tek tabela kuralı:** Her odanın yalnızca bir kapı tabelası vardır; asansöre yakın kapı atlanır ve oda-oda iç kapılarına tabela konmaz. Böylece B1'deki yinelenen YEMEKHANE tabelaları ve asansör tabelası çakışması giderildi.
- **Asansör tabelası:** `Zemin Kat · Asansör`, `1. Kat · Cerrahi`, `2. Kat · Yatan Hasta`, `3. Kat · Radyoloji`, `B1 · Yemekhane`.
- **Cihazlar:**
  - Servis yatakları: yastık, mavi-beyaz nevresim, korkuluk, canlı ritimli başucu monitörü ve serum askısı.
  - EKG: üç kanallı canlı dalga ve kâğıt çıktısı.
  - Eczane rafları: cam kapaklı.
- **Rozetler:** Muayene yapan personelin başında da yeşil artı rozeti görünür.
- **Dokunmatik cihazlar:** Klavye ipucu çubuğu gizlenir. Sol altta joystick, sağda bağlama duyarlı etkileşim düğmeleri ve **🖥️ VitaOS** hızlı erişim düğmesi bulunur.

### Görsel varlık araştırması (itch.io)

itch.io'daki ücretsiz izometrik hastane ve araç paketleri lisans açısından incelendi:

- Hastane paketleri CC0 değil; ayrıca projeden daha önce telif temizliğiyle çıkarılmış paket ailesindendir.
- Araç tarafındaki tek CC0 içerik, tek bir piksel-sanat sedandır ve oyunun vektörel stiline uymaz.

Bu yüzden hiçbir dosya kopyalanmadı. Oranlar, ışık-gölge ve ayrıntı düzeyi referans alınarak bütün çizimler koddan (Canvas) özgün olarak üretildi.

### Görsel varlık politikası

- **Serbest lisanslı varlıklar:** CC0 / Public Domain ya da ticari kullanıma ve yayına tamamen açık sprite, PNG ve SVG dosyaları `assets/` klasörüne alınabilir. Her dosya için kaynak ve lisans bu README'ye yazılır.
- **Lisansı kısıtlı tasarımlar:** Dosya kopyalanmaz. Yalnızca stil referansı alınır (palet, oranlar, ışık-gölge düzeyi) ve özgün bir çizim üretilir. Belirli bir eserin birebir kopyası yapılmaz.
- **İncelenen CC0 paketler (Kenney):** Isometric Vehicles ve Furniture Kit (OpenGameArt aynası) indirilip incelendi, ancak oyuna alınmadı:
  - Araç sprite'ları ~32 px; oyundaki boyuta 5–6 kat büyütülünce bulanıklaşıyor.
  - Mobilyalar ev tipi; hastane ekipmanı içermiyor.
- **Bunun yerine:** Kenney render'larının 3D görünümü referans alınarak çizim kitine "render kalitesi" katmanı eklendi. Önbelleğe alınan her nesnede yüzey ışık geçişi, zemine yakın ortam kapanması, üst kenar parlaması ve yumuşak temas gölgesi kullanılır. Hareket eden araçlar görünüm anahtarlı paylaşılan sprite'larla aynı kalitede çizilir. Karakterlerde siluet konturu, kenar ışığı, saç parlaması ve iki katmanlı gölge bulunur.
- **Durum:** Projede şu an harici dosya bulunmuyor; tüm grafikler koddan üretiliyor.

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
js/art_med.js    Ayrıntılı tıbbi cihazlar (MR + kontrol kabini, ameliyathane, laboratuvar, eczane, başhekimlik), süs havuzu
js/art_vehicles.js Hacimli araç modelleri (sedan/SUV, ambulans, lojistik kamyoneti, otobüs)
js/minigames.js  Ünite mini oyunları (oksijen/serum, defibrilatör, santrifüj + tahlil, hızlı reçete, servis bakımı)
js/vip.js        Prestij sistemleri (elmas, mağaza, helikopter pisti, gizemli vaka, akademi, lig, kariyer, robotlar)
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

Bazı senaryolar PubMed'de yer alan kaynaklarla desteklenmiştir. Kaynaklar yalnızca içerik hazırlığında kullanılır; oyunun içinde kaynakça gösterilmez:

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
- Cerrahi el antisepsisi, Cochrane 2016 ([10.1002/14651858.CD004288.pub3](https://doi.org/10.1002/14651858.CD004288.pub3))
- MR ve vücutta kalmış ferromanyetik cisimler: J Magn Reson Imaging 2026 ([10.1002/jmri.70199](https://doi.org/10.1002/jmri.70199))

## Lisans

Kod ve grafiklerin tamamı bu proje için özgün olarak yazılmıştır. Üçüncü taraf görsel, ses ya da kütüphane kullanılmaz.

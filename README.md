# Vita Hospital

2.5D izometrik hastane yönetimi, acil servis ve klinik dedektiflik oyunu. Tarayıcıda çalışır, kurulum ya da derleme gerektirmez.

> **Önemli:** Vita Hospital bir eğitim oyunudur. Gerçek tıbbi teşhis veya tedavi önerisi sunmaz. Klinik düşünmeyi, doğru soru sormayı ve sağlık okuryazarlığını öğretir. Oyundaki referans aralıkları ve acil senaryolar sadeleştirilmiş örneklerdir.

## Tamamen özgün grafikler

Oyunda **hiçbir harici görsel dosyası yoktur**. Zemin dokuları, duvarlar, 80'i aşkın eşya ve cihaz türü, karakterler, ambulans ve kampüs (yollar, otopark, ağaçlar, banklar, lambalar, tabela) HTML5 Canvas üzerinde kodla çizilir.

Çizim kiti (`js/art.js`) her nesneyi kutu, silindir, küre ve yüzey süslerinden kurar. Nesneler dünya koordinatında tanımlandığı için 4 kamera açısında da doğru yüzleri görünür.

## Nasıl oynanır

| İşlem | Masaüstü | Mobil |
|---|---|---|
| Yürüme | `WASD` / ok tuşları (`Shift` ile koşma) | Sol alttaki joystick |
| Etkileşim | `E` / `Enter` veya karaktere/cihaza tıklama | Sağ alttaki dinamik eylem düğmesi |
| Kamera | Sürükle, tekerlek, `Q` / `R` ile 90° döndürme, `F` ile takip | Sürükle, iki parmakla yakınlaştırma, düğmeler |
| Yönetim paneli | `P` veya 🏗️ | 🏗️ |
| Ses | `M` veya 🔊 | 🔊 |

### Oyun döngüsü

- **Aktif Vaka Akış Şeması** (sol üst): Seçili hastanın tedavi zinciri kutucuklar ve oklarla gösterilir. Tamamlanan adımlar yeşil tikle işaretlenir, aktif adım parlar ve net bir talimat yazar.
  - Acil vaka: Ambulans Karşılama ➔ Triyaj & Tetkik ➔ İlgili Ünite Müdahalesi ➔ Eczane İlaç Teslimi & Taburcu
  - Poliklinik vakası: Geliş ➔ Kayıt ➔ Muayene & Sorgulama ➔ Laboratuvar ➔ Klinik Karar ➔ Sonuç
- **Yön çizgisi ve hedef vurgusu:** Gidilecek istasyonun üstünde zıplayan bir ikon ve zemin halkası belirir. Başhekimden oraya doğru, yere kesikli bir yol çizilir. Hedef başka kattaysa çizgi asansöre yönlendirir; hedef ekran dışındaysa kenarda bir ok çıkar.
- **Acil servis:** Siren çalar ve ambulans gelir. Yaşamsal bulgulara bakıp doğru üniteyi seçin (Sedye + Monitör, Oksijen ya da Serum). Ardından cihazın yanında stabilize edin, son olarak eczanede ilaç bilgilendirmesini yapıp taburcu edin.
- **Gizli bilgi sorgulama:** 14 çok katmanlı klinik vaka vardır. Doğru sorular gizli ipuçlarını açar; tahliller görsel bir raporla incelenir; sonunda 3 stratejik karardan biri seçilir.
- **Sabır / stabilite barları:** Hastaların üstündeki bar zamanla yeşilden sarıya, sonra kırmızıya döner. Çok bekleyen hasta hastaneyi terk eder.
- **Kombo zinciri:** Hastaları bekletmeden peş peşe doğru tedavi edince 2x ve 3x kombo kazanılır; bütçe ve itibar ödülleri katlanır.
- **Nöbet (vardiya) döngüsü:** Gündüz ve gece nöbetleri dönüşümlü ilerler; gece nöbetinde sokak lambaları yanar. Her nöbet sonunda bir **Nöbet Özeti** kartı açılır. Bu kartın geliştirme mağazasından koşu hızı, tedavi hızı, hastane kapasitesi ve yeni servis katları yükseltilebilir.
- **Hastaneyi büyütme:** Cihaz yükseltmeleri, personel alımı ve asansörle erişilen 3 yeni kat açılabilir: Cerrahi & Ameliyathane, Yatan Hasta & Pediatri, Radyoloji & İleri Tanı.
- **Kayıt:** İlerleme tarayıcıda (`localStorage`) otomatik saklanır ve yüklenirken doğrulanır.

## Dosyalar

```
index.html, style.css
js/assets.js    Açılış hazırlayıcı (harici görsel yok)
js/audio.js     Web Audio ile sentezlenen ses efektleri
js/art.js       Prosedürel 2.5D izometrik çizim kiti (eşya, cihaz, kampüs)
js/map.js       İzometrik motor, kamera, katlar, prosedürel zemin/duvar, dış dünya
js/entities.js  Karakterler, yürüyüş, A* yol bulma, hasta/personel yapay zekâsı, sabır
js/cases.js     14 klinik vaka ve 6 adımlı vaka döngüsü
js/hospital.js  Acil servis, eczane, kombo, nöbet, yönetim paneli, katlar
js/guide.js     Akış şeması, hedef vurgusu, zemin yön çizgisi
js/save.js      Doğrulamalı localStorage kaydı
js/ui.js        HUD, paneller, joystick, diyaloglar
js/main.js      Açılış ve oyun döngüsü
```

Test parametreleri: `?nosave` kaydı kapatır, `?nointro` açılış hikâyesini atlar, `?touch` mobil kontrolleri zorlar, `?selftest` çizim kiti raporunu sayfaya yazar.

## Lisans

Kod ve grafiklerin tamamı bu proje için özgün olarak yazılmıştır; üçüncü taraf görsel, ses ya da kütüphane kullanılmaz.

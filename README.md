# Vita Hospital

2.5D izometrik hastane yönetimi, acil servis ve klinik dedektiflik oyunu. Tarayıcıda çalışır; GitHub Pages ile yayınlanır, derleme adımı gerekmez.

> **Önemli:** Vita Hospital bir eğitim oyunudur. Gerçek tıbbi teşhis veya tedavi önerisi sunmaz. Amacı klinik düşünmeyi, doğru soru sormayı ve sağlık okuryazarlığını öğretmektir.

## Çalıştırma

`index.html` dosyasını tarayıcıda açın ya da yerel bir sunucu başlatın:

```bash
npx serve .
# veya
python -m http.server 8000
```

Görsel yükleme öz-testi için adrese `?selftest` ekleyin. Sayfada `VH_SELFTEST {...}` satırı çıkar ve tüm PNG'lerin yüklenip yüklenmediği burada raporlanır.

## Klasör yapısı

```
index.html, style.css
js/asset-manifest.js   assets/ altındaki tüm PNG'lerin listesi
js/assets.js           Asset Preloader (yükleme + kırık yol raporu)
js/map.js              İzometrik harita motoru ve kamera
js/entities.js         Başhekim, personel ve hasta karakterleri
js/cases.js            Klinik vaka senaryoları
js/ui.js               HUD, paneller, mobil kontroller
js/main.js             Açılış ve oyun döngüsü
assets/core/           Modern Hospital 2D Props Pack (Tiles)
assets/lab/            ThirdAngle Hospital Surgery & Lab Starter
assets/ward/           ThirdAngle Hospital Starter
```

## Yol haritası

1. Depo, görseller ve iskelet ✔
2. İzometrik harita motoru, kamera, 7 başlangıç bölümü ✔
3. Başhekim kontrolü, NPC yapay zekâsı, mobil ve masaüstü kontroller
4. Hikâye, gizli bilgi sorgulama, 6 adımlı vaka sistemi (12+ vaka)
5. Acil servis zaman yönetimi, eczane, hastane büyütme
6. Ses efektleri, kayıt sistemi, son kalite kontrolü

## Görsel lisansları

- **ThirdAngle** (Hospital Starter, Surgery & Lab Starter): oyunlarda kullanılabilir. Asset paketi olarak yeniden dağıtılamaz. Atıf: "ThirdAngle".
- **Modern Hospital 2D Props Pack** (nacl1234): oyun içinde gömülü kullanılabilir. Orijinal dosyalar tek başına indirilebilir şekilde paylaşılamaz.

## Kamera kontrolleri

| İşlem | Masaüstü | Mobil |
|---|---|---|
| Kaydırma | Fare ile sürükle | Tek parmakla sürükle |
| Yakınlaştırma | Tekerlek, `+` / `-` | İki parmak (pinch), ＋ / － düğmeleri |
| 90° döndürme | `Q` / `R`, ⟲ ⟳ düğmeleri | ⟲ ⟳ düğmeleri |
| Başhekimi takip | `F`, ◎ düğmesi | ◎ düğmesi |
| Oda etiketleri | `L`, Aa düğmesi | Aa düğmesi |

Test parametreleri: `?rot=0-3&zoom=0.55&x=17&y=12&follow=0&labels=0&selftest`

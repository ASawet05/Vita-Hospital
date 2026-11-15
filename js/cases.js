// Vita Hospital — Hikâye, gizli bilgi sorgulama ve 6 adımlı klinik vaka sistemi
//
// ÖNEMLİ: Bu oyun eğitim amaçlıdır. Gerçek hayatta tıbbi teşhis koyma ya da tedavi
// önerme iddiası taşımaz. Amaç klinik düşünmeyi, doğru soru sormayı ve sağlık
// okuryazarlığını öğretmektir. Referans aralıkları laboratuvara göre değişebilir;
// burada yalnızca oyun içi örnek değerler kullanılmıştır.
//
// Vaka döngüsü: 1 Geliş → 2 Kayıt → 3 Muayene & Sorgulama → 4 Laboratuvar Analizi
//               → 5 Klinik Karar → 6 Sonuç ve İtibar
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities;
  const UI = () => VH.ui;

  // ================================================================ Senaryo verileri
  // Q(kategori, soru, cevap, ipucu?, seçenekler) — key: kritik ipucu, flag: kırmızı bayrak,
  // req: önce açılması gereken sorunun kimliği (çok katmanlı sorgulama)
  const Q = (cat, q, a, clue, o) => Object.assign({ cat, q, a, clue: clue || null }, o || {});
  const L = (name, value, unit, lo, hi) => ({ name, value, unit, lo, hi });

  const CASES = [
    {
      id: 'c01', title: 'Yorgun Yazılımcı', name: 'Deniz Aydın', age: 28, sex: 'K',
      complaint: 'Sürekli yorgunluk, baş dönmesi ve uyku bozukluğu',
      arrival: 'Merhaba… Aylardır hep yorgunum.',
      intro: 'Son birkaç aydır hiç dinlenmiş uyanmıyorum. Hızlı kalkınca başım dönüyor, gece de uyku tutmuyor.',
      hint: 'Bence beslenme düzenini ve gün içinde ne içtiğini sorgulamalısınız. Uyku saatleri ve gün ışığı da önemli olabilir.',
      questions: [
        Q('Beslenme', 'Gün içinde öğünleriniz nasıl, kahvaltı yapıyor musunuz?', 'Sabahları hiç vaktim olmuyor. Öğlene kadar sadece kahve içiyorum, bazen öğle yemeğini de atlıyorum.', 'Kahvaltıyı ve sık sık öğünleri atlıyor', { key: 1, id: 'meal' }),
        Q('Beslenme', 'Günde kaç bardak çay ya da kahve içiyorsunuz?', 'Saymadım ama… 8-10 bardak çay, 3-4 de kahve. Çayı yemekle birlikte içmeyi severim.', 'Günde 8-10 çay + 3-4 kahve; çayı yemekle içiyor', { key: 1 }),
        Q('Beslenme', 'Öğle ve akşam neler yiyorsunuz? Et, baklagil, yeşillik var mı?', 'Genelde makarna, tost, hazır yemek. Kırmızı et pek sevmem, baklagil de nadiren.', 'Demir kaynakları az, tek tip beslenme', { key: 1, req: 'meal' }),
        Q('Uyku', 'Kaçta yatıp kaçta kalkıyorsunuz?', 'Gece 2-3 gibi yatıyorum, 8\'de kalkıyorum. Yatakta da telefona bakıyorum.', 'Günde 5-6 saat uyku, yatakta ekran kullanımı', { key: 1 }),
        Q('Yaşam', 'Gün içinde dışarı çıkıp güneş görüyor musunuz?', 'Evden çalışıyorum. Bazen bir hafta hiç dışarı çıkmadığım oluyor.', 'Evden çalışıyor, gün ışığına çok az çıkıyor', { key: 1 }),
        Q('Kırmızı bayrak', 'Bayılma, göğüs ağrısı ya da çarpıntı oldu mu?', 'Hayır, bayılmadım. Sadece hızlı kalkınca gözüm kararıyor.', 'Bayılma/göğüs ağrısı yok', {}),
        Q('Belirti', 'Adet kanamanızın miktarı nasıl?', 'Son aylarda epey bol oluyor aslında.', 'Bol adet kanaması tarif ediyor', { key: 1 }),
      ],
      labs: [L('Hemoglobin', 11.4, 'g/dL', 12, 16), L('Ferritin', 9, 'ng/mL', 15, 150), L('B12 Vitamini', 380, 'pg/mL', 200, 900), L('D Vitamini (25-OH)', 14, 'ng/mL', 30, 100), L('Magnezyum', 1.8, 'mg/dL', 1.7, 2.4), L('Folat', 7.5, 'ng/mL', 4, 20)],
      grades: { complete: 'best', tests: 'acceptable', refer: 'acceptable' },
      referTo: 'Dahiliye', testsWhat: 'Demir paneli ve tiroid testleri',
      lesson: 'Belirtiler alışkanlıklarla açıklanabiliyor ve acil bir kırmızı bayrak yok. Bu durumda beslenme, kafein zamanlaması, uyku ve gün ışığını kapsayan bir plan ile hekim takibi en dengeli yaklaşım. Çayın yemekle birlikte içilmesi demir emilimini azaltabilir.',
      plan: ['Kahvaltıyı atlamadan düzenli 3 öğün', 'Çay/kahveyi yemeklerden en az 1 saat sonra içmek, günlük miktarı azaltmak', 'Demir kaynağı besinler: kırmızı et, baklagil, yeşil yapraklı sebze + C vitamini', 'Uyku: her gün aynı saatte yatış, yatakta ekran yok, 7-8 saat', 'Gün ışığında günlük 20-30 dk yürüyüş', 'Takip: 6-8 hafta sonra aile hekimiyle tahlil tekrarı'],
    },
    {
      id: 'c02', title: 'Takviyesiz Vegan', name: 'Ece Kılıç', age: 22, sex: 'K',
      complaint: 'Ellerde-ayaklarda karıncalanma, unutkanlık, halsizlik',
      arrival: 'Ellerim sürekli karıncalanıyor…',
      intro: 'Bir süredir ellerim ve ayaklarım karıncalanıyor. Derslerde hiçbir şey aklımda kalmıyor.',
      hint: 'Beslenme tarzını mutlaka sorun; özellikle hayvansal ürünler ve takviyeler. Karıncalanmanın seyri ve denge sorunları da önemli.',
      questions: [
        Q('Beslenme', 'Nasıl besleniyorsunuz? Et, süt, yumurta tüketiyor musunuz?', '3 yıldır veganım, hayvansal hiçbir şey yemiyorum.', '3 yıldır vegan beslenme', { key: 1, id: 'veg' }),
        Q('İlaç/Takviye', 'Herhangi bir vitamin takviyesi kullanıyor musunuz?', 'Hayır. Bitkisel beslenince gerek olmadığını bir videoda izlemiştim.', 'B12 takviyesi kullanmıyor', { key: 1, req: 'veg' }),
        Q('Belirti', 'Karıncalanma ne zamandır var? Yürürken dengesizlik oluyor mu?', 'Birkaç aydır. Son haftalarda merdiven inerken sendeliyorum.', 'Aylardır süren uyuşma + yeni başlayan denge sorunu (nörolojik bulgu)', { key: 1, flag: 1 }),
        Q('Belirti', 'Dilinizde yanma ya da ağızda yara oluyor mu?', 'Evet! Dilim kıpkırmızı ve yanıyor, ne olduğunu anlamadım.', 'Dilde yanma ve kızarıklık', { key: 1 }),
        Q('Yaşam', 'Günde ne kadar kahve ya da enerji içeceği tüketiyorsunuz?', 'Sınav dönemi… günde 2 enerji içeceği.', 'Günde 2 enerji içeceği', {}),
        Q('Aile', 'Ailede kansızlık ya da mide hastalığı olan var mı?', 'Bildiğim kadarıyla yok.', 'Aile öyküsü yok', {}),
      ],
      labs: [L('Hemoglobin', 12.1, 'g/dL', 12, 16), L('MCV', 104, 'fL', 80, 100), L('B12 Vitamini', 145, 'pg/mL', 200, 900), L('Folat', 14, 'ng/mL', 4, 20), L('Ferritin', 35, 'ng/mL', 15, 150), L('D Vitamini (25-OH)', 24, 'ng/mL', 30, 100)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Dahiliye / Nöroloji', testsWhat: 'Homosistein ve metilmalonik asit',
      lesson: 'Düşük B12 ile birlikte denge bozukluğu gibi nörolojik bulgular varsa yalnızca beslenme önerisi yetmez. Hekim değerlendirmesi ve tedavisi gecikmemelidir. Vegan beslenenlerde B12 takviyesi bir hekim ya da diyetisyenle planlanmalıdır.',
      plan: ['Hayvansal ürün içermeyen beslenmede B12 kaynağı planlamak (hekim/diyetisyen ile)', 'Enerji içeceklerini azaltmak', 'Düzenli öğün ve uyku', 'Nörolojik belirtiler için hekim takibi'],
    },
    {
      id: 'c03', title: 'Gece Vardiyası', name: 'Gül Öztürk', age: 35, sex: 'K',
      complaint: 'Kas krampları, çarpıntı ve uykusuzluk',
      arrival: 'Kalbim bazen deli gibi çarpıyor…',
      intro: 'Bacaklarıma sık sık kramp giriyor, bazen kalbim hızlı hızlı çarpıyor. Zaten doğru dürüst de uyuyamıyorum.',
      hint: 'Çarpıntı varsa önce kırmızı bayrakları sorun: bayılma, göğüs ağrısı. Sonra içecekler, bitkisel çaylar ve sıvı alımı.',
      questions: [
        Q('Yaşam', 'Çalışma düzeniniz nasıl?', 'Hemşireyim, ayda 12 gece nöbeti tutuyorum. Gündüz de uyuyamıyorum.', 'Düzensiz gece vardiyası, gündüz uykusu bozuk', { key: 1 }),
        Q('Beslenme', 'Uyanık kalmak için ne içiyorsunuz?', 'Günde 3 enerji içeceği. Bir de kilo vermek için "zayıflama çayı" içiyorum.', 'Günde 3 enerji içeceği + zayıflama çayı', { key: 1, id: 'drinks' }),
        Q('İlaç/Takviye', 'Zayıflama çayının içinde ne var? İdrar ya da dışkılama sıklığınız arttı mı?', 'İçinde sinameki varmış galiba… Sürekli tuvalete koşuyorum.', 'Müshil/idrar söktürücü etkili çay: sıvı ve elektrolit kaybı', { key: 1, req: 'drinks' }),
        Q('Beslenme', 'Günde ne kadar su içiyorsunuz?', 'Nöbette unutuyorum… 2-3 bardak ya var ya yok.', 'Çok az su tüketimi', { key: 1 }),
        Q('Kırmızı bayrak', 'Çarpıntı sırasında bayılma, göğüs ağrısı ya da nefes darlığı oluyor mu?', 'Bir kere gözüm karardı, hemen oturmak zorunda kaldım.', 'Çarpıntı sırasında göz kararması (kırmızı bayrak)', { key: 1, flag: 1 }),
        Q('Aile', 'Ailede genç yaşta kalp hastalığı olan var mı?', 'Hayır, yok.', 'Ailede erken kalp hastalığı yok', {}),
      ],
      labs: [L('Potasyum', 3.2, 'mmol/L', 3.5, 5.1), L('Magnezyum', 1.4, 'mg/dL', 1.7, 2.4), L('Sodyum', 137, 'mmol/L', 135, 145), L('D Vitamini (25-OH)', 18, 'ng/mL', 30, 100), L('Hemoglobin', 13.1, 'g/dL', 12, 16), L('TSH', 1.9, 'mIU/L', 0.4, 4.0)],
      grades: { tests: 'best', refer: 'acceptable', complete: 'risky' },
      referTo: 'Kardiyoloji', testsWhat: 'EKG + elektrolitlerin hemen tekrarı ve izlem',
      lesson: 'Düşük potasyum ve magnezyumla birlikte çarpıntı ve göz kararması varsa önce güvenlik gelir: EKG ve elektrolit değerlendirmesi hemen yapılmalıdır. Bitkisel "zayıflama çayları" ciddi sıvı ve mineral kaybına yol açabilir.',
      plan: ['Zayıflama çayını ve enerji içeceklerini bırakmak', 'Nöbette su şişesiyle düzenli sıvı', 'Nöbet sonrası karartılmış odada uyku rutini', 'Elektrolitler için hekim takibi'],
    },
    {
      id: 'c04', title: 'Düşen Nermin Teyze', name: 'Nermin Çakır', age: 74, sex: 'K',
      complaint: 'Halsizlik, kemik ağrıları, son 3 ayda iki kez düşme',
      arrival: 'Yavaş yavaş geliyorum evladım…',
      intro: 'Kemiklerim sızlıyor evladım. Üç ayda iki kere düştüm, Allah\'tan bir yerim kırılmadı.',
      hint: 'Yaşlı hastada düşmelerde ilaçları ve evden çıkma durumunu sorun. Beslenme ve aile öyküsü de kemik sağlığı için kritik.',
      questions: [
        Q('Yaşam', 'Ne sıklıkla dışarı çıkabiliyorsunuz?', 'Dizlerim yüzünden aylardır apartmandan çıkmadım.', 'Aylardır evden çıkmıyor, güneş görmüyor', { key: 1 }),
        Q('Beslenme', 'Gün içinde neler yiyorsunuz?', 'Tek başıma yaşıyorum, kim uğraşacak… Çay, ekmek, biraz peynir.', 'Yetersiz beslenme: çay-ekmek ağırlıklı', { key: 1, id: 'diet' }),
        Q('Beslenme', 'Süt, yoğurt gibi ürünleri tüketebiliyor musunuz?', 'Süt bana dokunuyor, hiç içmem.', 'Süt ürünlerinden kaçınıyor (kalsiyum alımı düşük)', { key: 1, req: 'diet' }),
        Q('İlaç/Takviye', 'Düzenli kullandığınız ilaçlar var mı?', 'Tansiyon ilacım var, bir de uyuyamadığım için uyku hapı alıyorum.', 'Uyku hapı kullanımı (düşme riskini artırabilir)', { key: 1 }),
        Q('Aile', 'Ailenizde kemik erimesi ya da kalça kırığı olan var mı?', 'Rahmetli annem kalçasını kırmıştı.', 'Annede kalça kırığı öyküsü', { key: 1 }),
        Q('Kırmızı bayrak', 'Düşerken bayılma ya da bilinç kaybı oldu mu?', 'Yok, ayağım halıya takıldı. Başım dönmedi.', 'Düşmelerde bilinç kaybı yok', {}),
      ],
      labs: [L('D Vitamini (25-OH)', 9, 'ng/mL', 30, 100), L('Kalsiyum', 8.3, 'mg/dL', 8.5, 10.5), L('Albümin', 3.2, 'g/dL', 3.5, 5.0), L('Hemoglobin', 12.4, 'g/dL', 12, 16), L('B12 Vitamini', 290, 'pg/mL', 200, 900), L('Kreatinin', 1.0, 'mg/dL', 0.6, 1.2)],
      grades: { tests: 'best', refer: 'acceptable', complete: 'risky' },
      referTo: 'Geriatri / Fizik Tedavi', testsWhat: 'Kemik yoğunluğu ölçümü (DEXA) ve düşme riski değerlendirmesi',
      lesson: 'Tekrarlayan düşmeler, çok düşük D vitamini ve kalça kırığı öyküsü kemik erimesi riskini düşündürür. Önce kemik yoğunluğu ve düşme riski netleştirilmeli. Uyku hapları ve evdeki halılar da hekimle birlikte gözden geçirilmeli.',
      plan: ['Protein ve kalsiyum içeren düzenli öğünler (laktozsuz seçenekler)', 'Evde düşme önlemleri: halı sabitleme, gece lambası', 'Uyku ilacının hekimle gözden geçirilmesi', 'Komşu/akraba desteği ve güneşli saatlerde kısa yürüyüş'],
    },
    {
      id: 'c05', title: 'Ultra Maratoncu', name: 'Kaan Erdem', age: 31, sex: 'E',
      complaint: 'Performans düşüşü, çabuk nefes nefese kalma, solukluk',
      arrival: 'Eskiden 30 km koşardım, şimdi 5 km\'de bitiyorum.',
      intro: 'Antrenmanlarda eskisi gibi değilim. Çabuk nefes nefese kalıyorum, arkadaşlar yüzümün solgun olduğunu söylüyor.',
      hint: 'Sporcularda ağrı kesici kullanımını mutlaka sorun ve devamında mide-bağırsak belirtilerini sorgulayın. Bu bir kırmızı bayrak olabilir.',
      questions: [
        Q('Yaşam', 'Haftada ne kadar antrenman yapıyorsunuz?', 'Haftada 100 km koşuyorum, ultra maratona hazırlanıyorum.', 'Çok yoğun dayanıklılık antrenmanı', { key: 1 }),
        Q('Beslenme', 'Kırmızı et, baklagil, yeşil yapraklı sebze tüketiyor musunuz?', 'Hafif kalmak için kırmızı eti tamamen bıraktım.', 'Kırmızı et yemiyor, demir alımı düşük', { key: 1 }),
        Q('İlaç/Takviye', 'Ağrı kesici kullanıyor musunuz?', 'Dizlerim ağrıdığı için neredeyse her gün ibuprofen alıyorum.', 'Neredeyse her gün ağrı kesici (NSAİİ) kullanımı', { key: 1, id: 'nsaid' }),
        Q('Kırmızı bayrak', 'Mide ağrısı oldu mu? Dışkınızın rengi değişti mi?', 'Midem yanıyor… Söylemesi utanç verici ama son haftalarda dışkım simsiyah.', 'Siyah dışkı! (olası mide-bağırsak kanaması, kırmızı bayrak)', { key: 1, flag: 1, req: 'nsaid' }),
        Q('Uyku', 'Uyku düzeniniz nasıl?', 'İyi uyurum, 8 saat.', 'Uyku düzeni iyi', {}),
      ],
      labs: [L('Hemoglobin', 10.9, 'g/dL', 13.5, 17.5), L('Ferritin', 8, 'ng/mL', 30, 400), L('MCV', 74, 'fL', 80, 100), L('B12 Vitamini', 410, 'pg/mL', 200, 900), L('D Vitamini (25-OH)', 34, 'ng/mL', 30, 100), L('CRP', 2, 'mg/L', 0, 5)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Gastroenteroloji (öncelikli)', testsWhat: 'Gaitada gizli kan ve tam kan sayımı tekrarı',
      lesson: 'Düzenli ağrı kesici kullanımıyla birlikte siyah dışkı, mide-bağırsak kanamasını düşündüren bir kırmızı bayraktır. Kansızlık "sporcu anemisi" diye geçiştirilmemeli, hasta hemen uzmana yönlendirilmelidir.',
      plan: ['Ağrı kesiciyi hekime danışmadan kullanmamak', 'Demir kaynağı besinleri artırmak', 'Antrenman yükünü hekim önerisine göre azaltmak'],
    },
    {
      id: 'c06', title: 'Yeni Anne', name: 'Büşra Şahin', age: 30, sex: 'K',
      complaint: 'Doğum sonrası aşırı yorgunluk, saç dökülmesi, odaklanamama',
      arrival: 'Bebeği komşuya bıraktım, hızlıca bakılsam…',
      intro: 'Doğum yapalı 4 ay oldu. Saçlarım avuç avuç dökülüyor, sürekli yorgunum, hiçbir şeye odaklanamıyorum.',
      hint: 'Uyku, beslenme ve destek sistemini sorun. Duygu durumunu nazikçe sorgulamayı unutmayın, bu dönemde çok önemli.',
      questions: [
        Q('Yaşam', 'Bebeğiniz kaç aylık, emziriyor musunuz?', '4 aylık, sadece anne sütü veriyorum.', '4 aylık bebeği emziriyor (besin ihtiyacı artmış)', { key: 1 }),
        Q('Uyku', 'Gece kaç kez uyanıyorsunuz?', '5-6 kez. Gündüz de uyuyamıyorum.', 'Gece 5-6 kez uyanıyor, uykusuz', { key: 1 }),
        Q('Beslenme', 'Kendinize düzenli yemek hazırlayabiliyor musunuz?', 'Ayakta bir şeyler atıştırıyorum. Doğum sonrası vitaminleri de bıraktım.', 'Düzensiz beslenme, doğum sonrası takviyeleri bırakmış', { key: 1 }),
        Q('Yaşam', 'Evde size yardım eden biri var mı?', 'Eşim çok çalışıyor, ailem başka şehirde.', 'Sosyal destek yok', { key: 1, id: 'support' }),
        Q('Kırmızı bayrak', 'Son iki haftada kendinizi nasıl hissediyorsunuz? Keyif aldığınız şeyler oluyor mu?', '(Gözleri doluyor) Hiçbir şeyden keyif almıyorum… Bazen çok kötü düşünceler geliyor, sonra kendimi suçluyorum.', 'Belirgin mutsuzluk, keyif kaybı ve suçluluk (doğum sonrası depresyon belirtisi, kırmızı bayrak)', { key: 1, flag: 1, req: 'support' }),
      ],
      labs: [L('Ferritin', 12, 'ng/mL', 15, 150), L('Hemoglobin', 11.6, 'g/dL', 12, 16), L('D Vitamini (25-OH)', 16, 'ng/mL', 30, 100), L('Folat', 3.6, 'ng/mL', 4, 20), L('TSH', 2.1, 'mIU/L', 0.4, 4.0), L('B12 Vitamini', 260, 'pg/mL', 200, 900)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Kadın Doğum + Ruh Sağlığı (Psikiyatri)', testsWhat: 'Tiroid antikorları ve tam kan tekrarı',
      lesson: 'Doğum sonrası yorgunluk yalnızca uykusuzluk ya da vitamin eksikliği değildir. Keyif kaybı, suçluluk ve kötü düşünceler profesyonel destek gerektirir. Tahlillerdeki eksiklikler de hekim takibinde ele alınmalıdır.',
      plan: ['Gece beslenmelerinde eşle nöbetleşe uyku planı', 'Kolay hazırlanan besleyici öğünler', 'Doğum sonrası takviyelerin hekimle yeniden planlanması', 'Destek ağı: aile, komşu, emzirme danışmanı'],
    },
    {
      id: 'c07', title: 'Fast-food Lisesi', name: 'Arda Polat', age: 17, sex: 'E',
      complaint: 'Sık hastalanma, yaraların geç iyileşmesi, sivilce, tat almada azalma',
      arrival: 'Annem zorla gönderdi, bir şeyim yok bence.',
      intro: 'Sürekli nezle oluyorum. Dizimdeki yara bir aydır kapanmadı. Yemeklerin tadını da eskisi gibi alamıyorum.',
      hint: 'Gençlerde günlük beslenmeyi ayrıntılı sorun: atıştırmalıklar, içecekler. Spor ve uyku da önemli.',
      questions: [
        Q('Beslenme', 'Günlük beslenmeni anlatır mısın?', 'Okul çıkışı hamburger, akşam da genelde dışarıdan söylüyoruz.', 'Günde 2 kez fast-food', { key: 1, id: 'ff' }),
        Q('Beslenme', 'Sebze, meyve, baklagil ne sıklıkla yiyorsun?', 'Sebze hiç sevmem, meyveyi de nadiren yerim.', 'Sebze, meyve ve baklagil neredeyse hiç yok', { key: 1, req: 'ff' }),
        Q('Beslenme', 'Gün içinde ne içiyorsun?', 'Kola. Günde 1 litre falan.', 'Günde 1 litre şekerli gazlı içecek', { key: 1 }),
        Q('Yaşam', 'Spor yapıyor musun?', 'Basketbol oynuyorum, çok terlerim.', 'Yoğun spor ve terleme (mineral kaybı)', { key: 1 }),
        Q('Uyku', 'Kaç saat uyuyorsun?', 'Oyun oynuyorum, 1\'de yatıp 7\'de kalkıyorum.', 'Günde 6 saat uyku, gece ekran', { key: 1 }),
        Q('Kırmızı bayrak', 'Ateş, kilo kaybı ya da gece terlemesi oluyor mu?', 'Yok, kilom aynı.', 'Ateş/kilo kaybı yok', {}),
      ],
      labs: [L('Çinko', 52, 'µg/dL', 70, 120), L('D Vitamini (25-OH)', 19, 'ng/mL', 30, 100), L('Hemoglobin', 14.6, 'g/dL', 13, 17), L('Ferritin', 48, 'ng/mL', 30, 400), L('Açlık Glukozu', 88, 'mg/dL', 70, 99), L('B12 Vitamini', 350, 'pg/mL', 200, 900)],
      grades: { complete: 'best', tests: 'acceptable', refer: 'acceptable' },
      referTo: 'Diyetisyen', testsWhat: 'Bağışıklık paneli',
      lesson: 'Tablo dengesiz beslenme, şekerli içecek ve uyku eksikliğiyle uyumlu ve kırmızı bayrak yok. Aileyi de içine alan uygulanabilir bir beslenme-uyku planı ve takip en etkili adım.',
      plan: ['Aileyle birlikte haftalık ev yemeği planı', 'Kola yerine su/ayran; hedef azaltma', 'Her gün en az 2 porsiyon sebze + 2 meyve, haftada 2 baklagil', 'Antrenman sonrası sıvı ve besin', 'Gece 23:00 sonrası ekran yok', 'Takip: 2-3 ay sonra kontrol'],
    },
    {
      id: 'c08', title: 'Susayan Yönetici', name: 'Serkan Koç', age: 46, sex: 'E',
      complaint: 'Sürekli susama, sık idrara çıkma, yorgunluk, bulanık görme',
      arrival: 'Toplantı arası kaçtım, çabuk olsun lütfen.',
      intro: 'Ağzım hep kuru, sürekli su içiyorum, tuvaletten çıkamıyorum. Akşamları gözlerim de bulanıklaşıyor.',
      hint: 'İçecek tüketimi, kilo değişimi ve aile öyküsünü sorun. Açıklanamayan kilo kaybı bir kırmızı bayrak.',
      questions: [
        Q('Beslenme', 'Günde ne kadar ve ne içiyorsunuz?', 'Ağzım kuruduğu için kola içiyorum, günde 1,5 litre.', 'Günde 1,5 litre kola', { key: 1 }),
        Q('Belirti', 'Gece idrara kalkıyor musunuz?', '3-4 kez kalkıyorum.', 'Gece 3-4 kez idrara çıkma', { key: 1 }),
        Q('Kırmızı bayrak', 'Son bir yılda kilonuz değişti mi?', '10 kilo almıştım, son ayda nedensiz 4 kilo verdim.', 'Kilo artışı sonrası açıklanamayan kilo kaybı (kırmızı bayrak)', { key: 1, flag: 1 }),
        Q('Aile', 'Ailenizde şeker hastalığı var mı?', 'Babam diyabetti, ayağından ameliyat oldu.', 'Babada diyabet öyküsü', { key: 1 }),
        Q('Yaşam', 'Gün içinde hareket ediyor musunuz?', 'Masa başındayım, akşam TV karşısında atıştırırım.', 'Hareketsiz yaşam, gece atıştırma', { key: 1 }),
      ],
      labs: [L('Açlık Glukozu', 168, 'mg/dL', 70, 99), L('HbA1c', 7.4, '%', 4.0, 5.6), L('Trigliserid', 260, 'mg/dL', 0, 150), L('Kreatinin', 0.9, 'mg/dL', 0.6, 1.2), L('D Vitamini (25-OH)', 22, 'ng/mL', 30, 100), L('B12 Vitamini', 300, 'pg/mL', 200, 900)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Dahiliye / Endokrinoloji', testsWhat: 'Tekrar açlık glukozu ve idrar tahlili',
      lesson: 'Belirtiler ve yüksek kan şekeri değerleri hekim değerlendirmesi ve tedavi planı gerektirir. Yaşam tarzı değişikliği çok önemlidir ama tek başına bırakılmamalıdır. Açıklanamayan kilo kaybı dikkat çeken bir işarettir.',
      plan: ['Şekerli içecekleri tamamen bırakmak', 'Günlük 30 dk yürüyüş', 'Gece atıştırmasını kesmek', 'Hekim önerisiyle diyetisyen desteği'],
    },
    {
      id: 'c09', title: 'Sınav Stresi', name: 'Melis Arslan', age: 24, sex: 'K',
      complaint: 'Baş ağrısı, göz seğirmesi, uykuya dalamama',
      arrival: 'Başım çatlıyor, kitaplarımı da getirdim…',
      intro: 'Akşamları başım zonkluyor, gözüm seğiriyor. Yatınca da uyku tutmuyor.',
      hint: 'Baş ağrısında önce kırmızı bayrakları sorun. Sonra kafein, ekran, su ve öğün düzenine bakın.',
      questions: [
        Q('Beslenme', 'Günde kaç fincan kahve içiyorsunuz?', 'Sınava hazırlanıyorum, 6 fincan kadar.', 'Günde 6 fincan kahve', { key: 1 }),
        Q('Uyku', 'Yatmadan önce ne yapıyorsunuz?', 'Gece 3\'e kadar telefonda test çözüyorum.', 'Gece geç saate kadar ekran', { key: 1 }),
        Q('Beslenme', 'Su tüketiminiz nasıl?', 'Bir iki bardak, hep unutuyorum.', 'Çok az su', { key: 1 }),
        Q('Beslenme', 'Öğünleriniz düzenli mi?', 'Kahvaltı yapmıyorum, akşam bir kerede yiyorum.', 'Kahvaltı yok, düzensiz öğün', { key: 1 }),
        Q('Kırmızı bayrak', 'Baş ağrınız ani ve çok şiddetli mi? Görme kaybı ya da kusma oluyor mu?', 'Hayır, gün sonunda başlayan sıkıştırıcı bir ağrı. Kusma yok.', 'Baş ağrısında kırmızı bayrak yok (gerilim tipi tarif)', { key: 1 }),
      ],
      labs: [L('Magnezyum', 1.65, 'mg/dL', 1.7, 2.4), L('D Vitamini (25-OH)', 26, 'ng/mL', 30, 100), L('Hemoglobin', 13.2, 'g/dL', 12, 16), L('Ferritin', 40, 'ng/mL', 15, 150), L('B12 Vitamini', 420, 'pg/mL', 200, 900), L('TSH', 1.6, 'mIU/L', 0.4, 4.0)],
      grades: { complete: 'best', tests: 'acceptable', refer: 'acceptable' },
      referTo: 'Nöroloji', testsWhat: 'Göz muayenesi ve görüntüleme',
      lesson: 'Kırmızı bayrak olmadığı doğru sorularla gösterildiğinde, kafein, ekran, su ve öğün düzenine yönelik bir plan en etkili ve güvenli adımdır. Gereksiz tetkik hem kaynak israfı hem de kaygı demektir.',
      plan: ['Kahveyi günde 2 fincana indirmek, 15:00\'ten sonra kafein yok', 'Yatmadan 1 saat önce ekranı kapatmak', 'Günde 8-10 bardak su', 'Kahvaltı + düzenli 3 öğün', '50 dk çalışma / 10 dk mola', 'Takip: ağrı günlüğü ve 4 hafta sonra kontrol'],
    },
    {
      id: 'c10', title: 'Üşüyen Öğretmen', name: 'Aslı Çelik', age: 39, sex: 'K',
      complaint: 'Kilo alma, üşüme, kabızlık, saç kuruluğu',
      arrival: 'Yazın bile üşüyorum, inanır mısınız?',
      intro: 'Az yememe rağmen kilo alıyorum, hep üşüyorum. Saçlarım kurudu, kabızlık da başladı.',
      hint: 'Aile öyküsünü ve kullandığı takviyeleri mutlaka sorun. Bazı takviyeler tahlil sonuçlarını etkileyebilir.',
      questions: [
        Q('Belirti', 'Başkaları rahatken siz üşüyor musunuz?', 'Yazın bile hırka giyiyorum.', 'Belirgin soğuk intoleransı', { key: 1 }),
        Q('Aile', 'Ailede tiroid hastalığı var mı?', 'Annemde Haşimato var.', 'Annede Haşimato tiroiditi', { key: 1 }),
        Q('Belirti', 'Adet düzeninizde değişiklik var mı?', 'Son aylarda düzensiz ve uzun sürüyor.', 'Adet düzensizliği', { key: 1 }),
        Q('Beslenme', 'Kilo için diyet yapıyor musunuz?', 'Az yememe rağmen kilo alıyorum.', 'Az yemesine rağmen kilo artışı', { key: 1 }),
        Q('İlaç/Takviye', 'Kullandığınız ilaç ya da takviye var mı?', 'Saçlarım için yüksek dozda biotin içeren vitamin kullanıyorum.', 'Yüksek doz biotin (bazı tiroid testlerini etkileyebilir)', { key: 1 }),
      ],
      labs: [L('TSH', 9.8, 'mIU/L', 0.4, 4.0), L('Serbest T4', 0.75, 'ng/dL', 0.9, 1.7), L('Kolesterol', 245, 'mg/dL', 0, 200), L('Hemoglobin', 12.3, 'g/dL', 12, 16), L('Ferritin', 22, 'ng/mL', 15, 150), L('D Vitamini (25-OH)', 21, 'ng/mL', 30, 100)],
      grades: { tests: 'best', refer: 'acceptable', complete: 'risky' },
      referTo: 'Endokrinoloji', testsWhat: 'Biotin bırakıldıktan sonra TSH-sT4 tekrarı ve tiroid antikorları',
      lesson: 'Tablo tiroidle ilgili olabilir ama yüksek doz biotin bazı laboratuvar testlerini bozabilir. Takviyeyi hekim önerisiyle bırakıp testleri antikorlarla birlikte tekrarlamak doğru sonucu verir. Uzmana yönlendirme de makul bir adım.',
      plan: ['Takviyeleri hekime danışarak düzenlemek', 'Lifli beslenme ve yeterli su', 'Düzenli hareket', 'Tahlil tekrarı ve hekim takibi'],
    },
    {
      id: 'c11', title: 'On Yıllık Mide İlacı', name: 'Hakan Yurt', age: 52, sex: 'E',
      complaint: 'Mide yanması, şişkinlik, halsizlik, ayaklarda kramp',
      arrival: 'Mide ilacımı da yanımda getirdim.',
      intro: 'Midem hep yanıyor, şişkinlik bitmiyor. Son zamanlarda bacaklarıma kramp giriyor, çok da halsizim.',
      hint: 'Uzun süreli ilaç kullanımını sorgulayın, eczaneden alınanlar dahil. Yutma güçlüğü ya da kilo kaybı varsa bu bir kırmızı bayrak.',
      questions: [
        Q('İlaç/Takviye', 'Mide için ilaç kullanıyor musunuz?', '10 yıldır her sabah mide koruyucu alıyorum, eczaneden kendim alıyorum.', '10 yıldır reçetesiz, uzun süreli mide ilacı (PPI) kullanımı', { key: 1, id: 'ppi' }),
        Q('İlaç/Takviye', 'Bu ilacı bırakmayı ya da doktora danışmayı denediniz mi?', 'Bırakınca yanma artıyor, o yüzden hiç bırakmadım, doktora da gitmedim.', 'İlaç hekim kontrolü olmadan sürüyor', { key: 1, req: 'ppi' }),
        Q('Beslenme', 'Akşam yemeğini saat kaçta yiyorsunuz?', 'İşten geç geliyorum, 22:00\'de yiyip yatıyorum.', 'Geç ve ağır akşam yemeği', { key: 1 }),
        Q('Yaşam', 'Sigara ya da alkol kullanıyor musunuz?', 'Günde bir paket sigara içiyorum.', 'Günde 1 paket sigara', { key: 1 }),
        Q('Kırmızı bayrak', 'Yutma güçlüğü, kilo kaybı ya da kanlı kusma oldu mu?', 'Son aylarda lokmalar boğazımda takılıyor gibi.', 'Yutma güçlüğü (kırmızı bayrak)', { key: 1, flag: 1 }),
      ],
      labs: [L('B12 Vitamini', 185, 'pg/mL', 200, 900), L('Magnezyum', 1.5, 'mg/dL', 1.7, 2.4), L('Hemoglobin', 13.0, 'g/dL', 13.5, 17.5), L('Ferritin', 60, 'ng/mL', 30, 400), L('Kalsiyum', 8.9, 'mg/dL', 8.5, 10.5), L('D Vitamini (25-OH)', 25, 'ng/mL', 30, 100)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Gastroenteroloji', testsWhat: 'Mide-bağırsak değerlendirmesi öncesi ek kan testleri',
      lesson: 'Yıllardır hekim kontrolü olmadan kullanılan mide ilaçları bazı vitamin ve mineral düzeylerini etkileyebilir. Ayrıca yutma güçlüğü uzman değerlendirmesi gerektiren bir uyarı işaretidir.',
      plan: ['Akşam yemeğini yatmadan en az 3 saat önce bitirmek', 'Sigarayı bırakma desteği', 'İlaç kullanımını hekimle düzenlemek'],
    },
    {
      id: 'c12', title: 'Şok Diyet', name: 'Ceren Aksoy', age: 26, sex: 'K',
      complaint: 'Saç dökülmesi, tırnak kırılması, üşüme, halsizlik',
      arrival: 'Saçlarım dökülüyor, bir vitamin yazar mısınız?',
      intro: 'Saçlarım dökülüyor, tırnaklarım kırılıyor, sürekli üşüyorum. Bir vitamin önerseniz yeter.',
      hint: 'Diyet ve egzersizi ayrıntılı sorun. Adet düzeni ve kilo kaybının hızı çok şey anlatır.',
      questions: [
        Q('Beslenme', 'Diyet yapıyor musunuz?', '3 aydır internetten bulduğum günde 800 kalorilik bir diyet yapıyorum.', '3 aydır günde ~800 kcal şok diyet', { key: 1, id: 'diet' }),
        Q('Beslenme', 'Et, yumurta, baklagil gibi protein kaynaklarını tüketiyor musunuz?', 'Kalorisi yüksek diye pek yemiyorum. Yeşillik ve yoğurt.', 'Protein alımı çok düşük', { key: 1, req: 'diet' }),
        Q('Yaşam', 'Egzersiz düzeniniz nasıl?', 'Her gün 2 saat kardiyo.', 'Düşük kaloriye rağmen günde 2 saat kardiyo', { key: 1 }),
        Q('Kırmızı bayrak', 'Adetleriniz düzenli mi?', 'İki aydır hiç olmadım.', '2 aydır adet görmüyor (ciddi enerji yetersizliği işareti)', { key: 1, flag: 1 }),
        Q('Belirti', 'Ne kadar kilo verdiniz? Kendinizi nasıl görüyorsunuz?', '9 kilo! Ama aynaya bakınca hâlâ yetmez diyorum.', '3 ayda 9 kg kayıp ve beden algısı sorunu', { key: 1 }),
      ],
      labs: [L('Ferritin', 14, 'ng/mL', 15, 150), L('Çinko', 64, 'µg/dL', 70, 120), L('D Vitamini (25-OH)', 22, 'ng/mL', 30, 100), L('Albümin', 3.6, 'g/dL', 3.5, 5.0), L('Hemoglobin', 12.2, 'g/dL', 12, 16), L('TSH', 1.4, 'mIU/L', 0.4, 4.0)],
      grades: { refer: 'best', complete: 'acceptable', tests: 'acceptable' },
      referTo: 'Kadın Doğum + Diyetisyen + Psikolojik destek', testsWhat: 'Hormon paneli',
      lesson: 'Hasta "bir vitamin" istese de tablo; aşırı kısıtlama, adet kesilmesi ve beden algısı sorunuyla birlikte ekip yaklaşımı gerektiriyor. Tek başına takviye sorunu çözmez.',
      plan: ['Şok diyeti bırakıp yeterli enerji ve proteinli plan', 'Egzersizi azaltmak, dinlenme günleri', 'Diyetisyen takibi', 'Beden algısı için psikolojik destek'],
    },
    {
      id: 'c13', title: 'Solgun Efe', name: 'Efe Kurt', age: 9, sex: 'E',
      complaint: 'Solukluk, çabuk yorulma, derslerde dikkat dağınıklığı',
      arrival: '(Annesi) Öğretmeni dikkat sorunu var dedi…',
      intro: '(Annesi anlatıyor) Efe çok solgun, merdivende hemen yoruluyor. Öğretmeni derste dalıp gittiğini söylüyor.',
      hint: 'Çocuklarda ne kadar süt içtiğini ve seçici yeme alışkanlıklarını sorun. Garip yeme istekleri de ipucu olabilir.',
      questions: [
        Q('Beslenme', 'Efe günde ne kadar süt içiyor?', '(Annesi) Çok seviyor, günde 1 litreden fazla.', 'Günde 1 litreden fazla süt (iştahı kapatabilir, demir emilimini azaltabilir)', { key: 1 }),
        Q('Beslenme', 'Kahvaltı yapıyor mu?', '(Annesi) Servis erken geliyor, kahvaltısız çıkıyor.', 'Kahvaltısız okula gidiyor', { key: 1 }),
        Q('Beslenme', 'Et, yumurta, baklagil yiyor mu?', '(Annesi) Çok seçici, sadece makarna ve süt istiyor.', 'Seçici yeme, demir kaynakları yok', { key: 1, id: 'picky' }),
        Q('Belirti', 'Toprak, buz gibi yenmeyen şeyleri yeme isteği var mı?', '(Annesi) Buz çiğnemeye bayılıyor!', 'Buz çiğneme isteği (pika; demir eksikliğinde görülebilir)', { key: 1, req: 'picky' }),
        Q('Uyku', 'Kaçta uyuyor?', '(Annesi) Tableti bırakmıyor, 23:30 gibi.', 'Geç uyku ve ekran', { key: 1 }),
      ],
      labs: [L('Hemoglobin', 10.4, 'g/dL', 11.5, 15.5), L('Ferritin', 7, 'ng/mL', 15, 150), L('MCV', 71, 'fL', 77, 95), L('D Vitamini (25-OH)', 18, 'ng/mL', 30, 100), L('B12 Vitamini', 450, 'pg/mL', 200, 900), L('Çinko', 75, 'µg/dL', 70, 120)],
      grades: { refer: 'best', complete: 'acceptable', tests: 'acceptable' },
      referTo: 'Çocuk Sağlığı ve Hastalıkları (Pediatri)', testsWhat: 'Tam kan tekrarı ve periferik yayma',
      lesson: 'Çocuklarda kansızlık bulguları varsa tedavi ve takip çocuk hekimiyle planlanmalıdır. Aileye süt miktarı, kahvaltı ve uyku konusunda verilecek bilgiler de en az tedavi kadar önemlidir.',
      plan: ['Günlük süt miktarını hekim önerisine göre sınırlamak', 'Okul öncesi hızlı kahvaltı', 'Demir kaynağı besinleri çocuk dostu tariflerle sunmak', '21:30\'da ekran kapanışı'],
    },
    {
      id: 'c14', title: 'Yorgun Kurye', name: 'Okan Bulut', age: 33, sex: 'E',
      complaint: 'Yorgunluk, kas ağrıları, sık baş ağrısı',
      arrival: 'Paketim var, hızlıca bakarsanız…',
      intro: 'Akşama doğru bitiyorum. Kaslarım ağrıyor, başım da sık sık ağrıyor.',
      hint: 'İş günü nasıl geçiyor, ona odaklanın: öğünler, su, uyku ve güneş. Baş ağrısında kırmızı bayrakları da sorun.',
      questions: [
        Q('Yaşam', 'Gününüz nasıl geçiyor?', 'Günde 10-11 saat motorla paket taşıyorum.', 'Günde 10-11 saat motor kuryeliği', { key: 1 }),
        Q('Beslenme', 'Öğle yemeği yiyebiliyor musunuz?', 'Durmak para kaybı. Simit ve enerji içeceğiyle idare ediyorum.', 'Öğün yerine simit + enerji içeceği', { key: 1 }),
        Q('Beslenme', 'Gün içinde ne kadar su içiyorsunuz?', 'Tuvalet derdi olmasın diye bilerek az içiyorum.', 'Bilerek az su içiyor', { key: 1 }),
        Q('Uyku', 'Kaç saat uyuyorsunuz?', 'Gece geç dönüyorum, 5 saat ancak.', 'Günde 5 saat uyku', { key: 1 }),
        Q('Yaşam', 'Güneş görüyor musunuz?', 'Mont, kask, eldiven… Güneş tenime değmiyor, vardiyam da genelde akşam.', 'Akşam vardiyası ve kapalı giyim: güneşlenme yetersiz', { key: 1 }),
        Q('Kırmızı bayrak', 'Baş ağrısıyla birlikte bulantı, görme bozukluğu olduysa ya da kafanızı çarptıysanız söyler misiniz?', 'Yok, kaza da yapmadım çok şükür.', 'Baş ağrısında kırmızı bayrak yok', {}),
      ],
      labs: [L('D Vitamini (25-OH)', 17, 'ng/mL', 30, 100), L('B12 Vitamini', 230, 'pg/mL', 200, 900), L('Hemoglobin', 14.8, 'g/dL', 13.5, 17.5), L('Ferritin', 85, 'ng/mL', 30, 400), L('Magnezyum', 1.75, 'mg/dL', 1.7, 2.4), L('Kreatinin', 1.15, 'mg/dL', 0.6, 1.2)],
      grades: { complete: 'best', tests: 'acceptable', refer: 'acceptable' },
      referTo: 'Dahiliye', testsWhat: 'Kas enzimleri',
      lesson: 'Belirtiler uzun çalışma saatleri, öğün atlama, susuz kalma ve uykusuzlukla açıklanıyor. Kırmızı bayrak yok. Pratik bir iş günü planı ve takip en doğru adım.',
      plan: ['Mola başına 1 hazır sağlıklı atıştırmalık (kuruyemiş, peynirli sandviç)', 'Motorda su şişesi: her molada birkaç yudum', 'Enerji içeceği yerine su/ayran', 'En az 7 saat uyku hedefi', 'Gündüz kısa güneşlenme molaları', 'Takip: 8 hafta sonra kontrol'],
    },
  ];

  const GENERIC = [
    Q('Diğer', 'Evcil hayvanınız var mı?', 'Bir kedim var, çok tatlıdır.'),
    Q('Diğer', 'Hobileriniz neler?', 'Dizi izlemeyi seviyorum.'),
    Q('Diğer', 'Hangi şehirde doğdunuz?', 'Trabzon\'da.'),
    Q('Diğer', 'En son ne zaman tatile çıktınız?', 'Hatırlamıyorum bile!'),
    Q('Diğer', 'Hastaneye nasıl geldiniz?', 'Otobüsle geldim.'),
  ];

  const OPTIONS = {
    tests:    { n: 1, icon: '🧪', title: 'Daha fazla tetkik iste', desc: (c) => `Ek tetkik ile tabloyu netleştir: ${c.testsWhat}.` },
    refer:    { n: 2, icon: '👨‍⚕️', title: 'İlgili uzmana yönlendir', desc: (c) => `Uzman hekim değerlendirmesi: ${c.referTo}.` },
    complete: { n: 3, icon: '📝', title: 'Eksik bilgileri tamamla', desc: () => 'Beslenme, uyku ve yaşam tarzı planı + takip oluştur.' },
  };
  const GRADE_TEXT = {
    best: { label: 'En güvenli ve doğru yaklaşım', color: '#46a758' },
    acceptable: { label: 'Kabul edilebilir yaklaşım', color: '#edae49' },
    risky: { label: 'Riskli yaklaşım', color: '#e5484d' },
  };
  const REWARD = {
    best:       { rep: 8, safety: 4, budget: 3000 },
    acceptable: { rep: 3, safety: 1, budget: 1500 },
    risky:      { rep: -6, safety: -8, budget: 300 },
  };
  const REWARD_HASTY = {
    best:       { rep: 3, safety: 0, budget: 1500 },
    acceptable: { rep: 0, safety: -2, budget: 800 },
    risky:      { rep: -10, safety: -12, budget: 0 },
  };
  const LAB_COST = 250;

  // ================================================================ Durum
  const state = {
    budget: 20000, reputation: 50, safety: 80,
    upgrades: {}, hires: {}, services: {},
    solved: [],          // [{id, title, name, grade, choice, score, keyFound, keyTotal, labs, hasty, t}]
    order: [], idx: 0,
  };
  let active = null;
  let nextCaseIn = 6;
  let introShown = false;

  const clamp = (v) => Math.max(0, Math.min(100, v));
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function nextCaseDef() {
    if (!state.order.length || state.idx >= state.order.length) {
      // Önce çözülmemiş vakalar, hepsi bitince yeniden karıştır
      const solvedIds = new Set(state.solved.map((s) => s.id));
      const fresh = CASES.filter((c) => !solvedIds.has(c.id)).map((c) => c.id);
      state.order = shuffle(fresh.length ? fresh : CASES.map((c) => c.id));
      state.idx = 0;
    }
    const id = state.order[state.idx++];
    return CASES.find((c) => c.id === id);
  }

  function startCase() {
    const c = nextCaseDef();
    const extras = shuffle(GENERIC.slice()).slice(0, 2);
    const questions = c.questions.concat(extras).map((q, i) => Object.assign({ idx: i }, q));
    const keyTotal = c.questions.filter((q) => q.key).length;
    active = {
      c, questions, keyTotal,
      step: 1, asked: new Set(), clues: [], log: [],
      patience: keyTotal + 3 + (state.upgrades.comfort ? 2 : 0),
      patienceMax: keyTotal + 3 + (state.upgrades.comfort ? 2 : 0),
      labsOrdered: false, labsReady: false, labsReviewed: false,
      inExam: false, consulted: false, patient: null,
    };
    active.patient = E().spawnCasePatient(c);
    UI().toast(`🚑 Yeni vaka: ${c.name}, ${c.age} yaş. Şikâyet: ${c.complaint}`, 4200);
  }

  // ---------------------------------------------------------------- Varlık kancaları
  function onRegistered(p) {
    if (!active || active.patient !== p) return;
    active.step = 2;
    UI().toast(`📋 ${p.name} kayıt oldu (${p.ticket}). Muayene sırası bekleniyor.`, 3200);
  }
  function onExamStart(p) {
    if (!active || active.patient !== p) return;
    active.inExam = true;
    if (active.step < 3) {
      active.step = 3;
      UI().toast(`🩺 ${p.name} ${p.examRef.name} odasında. Gidip sorgulayın!`, 3600);
    }
  }
  function onLabDone(p) {
    if (!active || active.patient !== p) return;
    active.labsReady = true;
    active.inExam = false; // odaya dönüyor; varınca onExamStart tekrar çağrılır
    UI().toast('🧪 Tahlil sonuçları hazır: laboratuvardaki analizörü inceleyin.', 4000);
  }

  // ================================================================ Arayüz yardımcıları
  const el = (...a) => UI().el(...a);

  function patienceDots(n, max) {
    return '●'.repeat(Math.max(0, n)) + '○'.repeat(Math.max(0, max - n));
  }

  function clueList(clues) {
    const ul = el('ul', { className: 'clue-list' });
    if (!clues.length) ul.appendChild(el('li', { className: 'muted' }, 'Henüz ipucu yok. Doğru soruları sorun.'));
    clues.forEach((q) => ul.appendChild(el('li', { className: q.flag ? 'flag' : q.key ? 'key' : '' }, (q.flag ? '🚩 ' : q.key ? '🔎 ' : '• ') + q.clue)));
    return ul;
  }

  function keyFound() { return active.clues.filter((q) => q.key).length; }

  // ---------------------------------------------------------------- 3) Muayene & Sorgulama
  function openExam(lastAnswer, newClue) {
    const a = active, c = a.c, p = a.patient;
    const node = el('div', { className: 'exam' });

    const quote = el('div', { className: 'quote' });
    quote.appendChild(el('span', { className: 'who' }, p.name.split(' ')[0] + ':'));
    quote.appendChild(el('span', {}, ' "' + (lastAnswer || c.intro) + '"'));
    node.appendChild(quote);
    if (newClue) node.appendChild(el('div', { className: 'new-clue' + (newClue.flag ? ' flag' : '') }, (newClue.flag ? '🚩 Kırmızı bayrak: ' : '🔎 Yeni ipucu: ') + newClue.clue));

    const meta = el('div', { className: 'exam-meta' });
    meta.appendChild(el('span', {}, `Sabır: ${patienceDots(a.patience, a.patienceMax)}`));
    meta.appendChild(el('span', {}, `Kritik ipucu: ${keyFound()}/${a.keyTotal}`));
    meta.appendChild(el('span', {}, a.labsReviewed ? 'Tahlil: incelendi ✓' : a.labsReady ? 'Tahlil: hazır (laboratuvar)' : a.labsOrdered ? 'Tahlil: bekleniyor' : 'Tahlil: istenmedi'));
    node.appendChild(meta);

    node.appendChild(el('div', { className: 'sec-title' }, 'Sorular'));
    const qs = el('div', { className: 'q-list' });
    const avail = a.questions.filter((q) => !a.asked.has(q.idx) && (!q.req || a.questions.some((x) => x.id === q.req && a.asked.has(x.idx))));
    if (a.patience <= 0) qs.appendChild(el('div', { className: 'muted' }, `${p.name.split(' ')[0]} yoruldu, daha fazla soruya cevap vermek istemiyor.`));
    else if (!avail.length) qs.appendChild(el('div', { className: 'muted' }, 'Sorulacak başka soru kalmadı.'));
    else avail.forEach((q) => {
      const b = el('button', { type: 'button', className: 'q-btn' });
      b.appendChild(el('span', { className: 'q-cat cat-' + q.cat.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ]/g, '') }, q.cat));
      b.appendChild(el('span', {}, q.q));
      b.addEventListener('click', () => ask(q));
      qs.appendChild(b);
    });
    node.appendChild(qs);

    node.appendChild(el('div', { className: 'sec-title' }, 'Vaka defteri'));
    node.appendChild(clueList(a.clues));
    node.appendChild(el('div', { className: 'disclaimer' }, 'Eğitim amaçlı simülasyondur; gerçek tanı veya tedavi önerisi değildir.'));

    const actions = [];
    if (!a.labsOrdered) actions.push({ label: `🧪 Kan Tahlili İste (−${money(LAB_COST)})`, fn: orderLabs });
    actions.push({ label: '⚖️ Klinik Karar Ver', fn: openDecision });
    actions.push({ label: 'Kapat', ghost: true });
    UI().openDialog({
      icon: '🩺', title: `${p.name}, ${p.age} yaş`, wide: true,
      subtitle: `Adım 3/6 · Muayene & Sorgulama · ${c.complaint}`,
      node, actions,
    });
  }

  function ask(q) {
    const a = active;
    if (a.patience <= 0) return;
    a.asked.add(q.idx);
    a.patience--;
    a.log.push(q);
    let newClue = null;
    if (q.clue) { a.clues.push(q); newClue = q; }
    E().say(a.patient, q.a.length > 70 ? q.a.slice(0, 67) + '…' : q.a, 3000);
    openExam(q.a, newClue);
  }

  function orderLabs() {
    const a = active;
    if (a.labsOrdered) return;
    a.labsOrdered = true;
    a.step = Math.max(a.step, 4);
    state.budget -= LAB_COST;
    a.inExam = false;
    UI().closeDialog();
    E().sendToLab(a.patient);
    UI().toast('🧪 Kan tahlili istendi. Hasta kan alma birimine yönlendirildi.', 3200);
  }

  // ---------------------------------------------------------------- 4) Laboratuvar analizi
  function openLabReport() {
    const a = active, c = a.c;
    a.labsReviewed = true;
    a.step = Math.max(a.step, 4);
    const node = el('div', { className: 'lab' });
    node.appendChild(el('div', { className: 'lab-head' }, `Hasta: ${c.name} · ${c.age} yaş · Örnek: Venöz kan`));
    // Gelişmiş Mikroskop yükseltmesi: gözden kaçan bir kritik ipucunu açığa çıkarır (vaka başına bir kez)
    if (state.upgrades.microscope && !a.microscopeUsed) {
      a.microscopeUsed = true;
      const hidden = a.questions.find((q) => q.key && !q.flag && !a.clues.includes(q));
      if (hidden) {
        a.clues.push(hidden);
        a.asked.add(hidden.idx);
        node.appendChild(el('div', { className: 'new-clue' }, '🔬 Gelişmiş analiz yeni bir ipucu buldu: ' + hidden.clue));
      }
    }
    const table = el('div', { className: 'lab-table' });
    c.labs.forEach((l) => {
      const low = l.value < l.lo, high = l.value > l.hi;
      const row = el('div', { className: 'lab-row' + (low || high ? ' out' : '') });
      row.appendChild(el('div', { className: 'lab-name' }, l.name));
      row.appendChild(el('div', { className: 'lab-val' }, `${l.value.toLocaleString('tr-TR')} ${l.unit}`));
      // aralık çubuğu
      const span = l.hi - l.lo;
      const min = Math.max(0, l.lo - span * 0.6), max = l.hi + span * 0.6;
      const pos = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
      const bar = el('div', { className: 'lab-bar' });
      const band = el('div', { className: 'lab-band' });
      band.style.left = pos(l.lo) + '%';
      band.style.width = (pos(l.hi) - pos(l.lo)) + '%';
      const mark = el('div', { className: 'lab-mark' + (low || high ? ' bad' : '') });
      mark.style.left = pos(l.value) + '%';
      bar.appendChild(band); bar.appendChild(mark);
      row.appendChild(bar);
      row.appendChild(el('div', { className: 'lab-ref' }, `Ref: ${l.lo.toLocaleString('tr-TR')}–${l.hi.toLocaleString('tr-TR')}`));
      row.appendChild(el('div', { className: 'lab-flag ' + (low ? 'low' : high ? 'high' : 'ok') }, low ? '↓ Düşük' : high ? '↑ Yüksek' : 'Normal'));
      table.appendChild(row);
    });
    node.appendChild(table);
    const out = c.labs.filter((l) => l.value < l.lo || l.value > l.hi).length;
    node.appendChild(el('div', { className: 'lab-sum' }, `${out} değer referans aralığı dışında. Sonuçlar tek başına tanı koydurmaz; hikâye ve muayene ile birlikte yorumlanır.`));
    UI().openDialog({
      icon: '🧪', title: 'Laboratuvar Sonuç Raporu', subtitle: 'Adım 4/6 · Laboratuvar Analizi', wide: true, node,
      actions: [{ label: 'İncelendi' }],
    });
  }

  // ---------------------------------------------------------------- 5) Klinik karar
  function isHasty() {
    return keyFound() < Math.ceil(active.keyTotal * 0.6) || !active.labsReviewed;
  }

  function openDecision() {
    const a = active, c = a.c;
    a.step = Math.max(a.step, 5);
    const node = el('div', { className: 'decision' });
    const sum = el('div', { className: 'exam-meta' });
    sum.appendChild(el('span', {}, `Kritik ipucu: ${keyFound()}/${a.keyTotal}`));
    sum.appendChild(el('span', {}, `Kırmızı bayrak: ${a.clues.filter((q) => q.flag).length}`));
    sum.appendChild(el('span', {}, a.labsReviewed ? 'Tahlil incelendi ✓' : 'Tahlil incelenmedi ✗'));
    node.appendChild(sum);
    if (isHasty()) node.appendChild(el('div', { className: 'warn' }, '⚠ Yeterli bilgi toplamadan karar vermek üzeresiniz. Aceleci kararlar Hasta Güvenliği puanını düşürür.'));
    Object.keys(OPTIONS).forEach((k) => {
      const o = OPTIONS[k];
      const b = el('button', { type: 'button', className: 'opt-btn' });
      b.appendChild(el('span', { className: 'opt-n' }, `[${o.n}]`));
      const t = el('span', { className: 'opt-body' });
      t.appendChild(el('strong', {}, `${o.icon} ${o.title}`));
      t.appendChild(el('span', { className: 'opt-desc' }, o.desc(c)));
      b.appendChild(t);
      b.addEventListener('click', () => decide(k));
      node.appendChild(b);
    });
    UI().openDialog({
      icon: '⚖️', title: 'Klinik Karar', subtitle: `Adım 5/6 · ${c.name}, ${c.age} yaş`, wide: true, node,
      actions: [{ label: '← Sorgulamaya dön', fn: () => openExam(), ghost: true }],
    });
  }

  // ---------------------------------------------------------------- 6) Sonuç ve itibar
  function decide(choice) {
    const a = active, c = a.c;
    const grade = c.grades[choice];
    const hasty = isHasty();
    const r = (hasty ? REWARD_HASTY : REWARD)[grade];
    const kf = keyFound();
    const missedFlag = c.questions.some((q) => q.flag) && !a.clues.some((q) => q.flag);
    let safety = r.safety;
    if (missedFlag && grade !== 'best') safety -= 4;
    state.reputation = clamp(state.reputation + r.rep);
    state.safety = clamp(state.safety + safety);
    // Açılan servislerin ek katkıları (Aşama 5)
    const bonusNotes = [];
    let bonus = 0;
    if (choice === 'tests' && state.services.radiology && grade !== 'risky') { bonus += 1000; bonusNotes.push('📡 Tetkikler Radyoloji katında yapıldı: +₺1.000'); }
    if (c.age < 13 && state.services.ward && grade === 'best') { bonus += 1000; bonusNotes.push('🧸 Pediatri servisi çocuğu hemen devraldı: +₺1.000'); }
    state.budget += r.budget + bonus;
    const score = Math.max(0, Math.min(100, Math.round(
      ({ best: 60, acceptable: 35, risky: 5 })[grade] + 30 * kf / a.keyTotal + (a.labsReviewed ? 10 : 0) - (hasty ? 15 : 0))));
    state.solved.push({ id: c.id, title: c.title, name: c.name, age: c.age, grade, choice, score, keyFound: kf, keyTotal: a.keyTotal, labs: a.labsReviewed, hasty, t: Date.now() });
    a.step = 6;

    const node = el('div', { className: 'result' });
    const g = GRADE_TEXT[grade];
    const badge = el('div', { className: 'grade' }, (grade === 'best' ? '✅ ' : grade === 'acceptable' ? '🟡 ' : '⛔ ') + g.label);
    badge.style.borderColor = g.color;
    node.appendChild(badge);
    node.appendChild(el('div', { className: 'chosen' }, `Kararınız: [${OPTIONS[choice].n}] ${OPTIONS[choice].title}`));
    if (hasty) node.appendChild(el('div', { className: 'warn' }, grade === 'best'
      ? '⚠ Doğru yönde bir karar, ama yeterli bilgi toplanmadan verildi. Ödül azaltıldı.'
      : '⚠ Eksik bilgiyle aceleci karar verildi. Hasta güvenliği risk altına girdi.'));
    if (missedFlag) node.appendChild(el('div', { className: 'warn' }, '🚩 Bu vakada bir kırmızı bayrak vardı ama sorgulamada ortaya çıkmadı.'));

    const deltas = el('div', { className: 'deltas' });
    const d = (label, v, fmt) => {
      const s = el('span', { className: 'delta ' + (v > 0 ? 'up' : v < 0 ? 'down' : '') }, `${label} ${v > 0 ? '+' : ''}${fmt ? fmt(v) : v}`);
      deltas.appendChild(s);
    };
    d('İtibar', r.rep); d('Hasta Güvenliği', safety); d('Bütçe', r.budget + bonus, (v) => money(v));
    deltas.appendChild(el('span', { className: 'delta' }, `Vaka puanı: ${score}/100`));
    node.appendChild(deltas);
    bonusNotes.forEach((t) => node.appendChild(el('div', { className: 'new-clue' }, t)));

    node.appendChild(el('div', { className: 'sec-title' }, 'Eğitsel değerlendirme'));
    node.appendChild(el('p', { className: 'lesson' }, c.lesson));
    const best = Object.keys(c.grades).find((k) => c.grades[k] === 'best');
    if (choice !== best) node.appendChild(el('p', { className: 'lesson' }, `En güvenli yaklaşım: [${OPTIONS[best].n}] ${OPTIONS[best].title} (${OPTIONS[best].desc(c)})`));
    node.appendChild(el('div', { className: 'sec-title' }, choice === 'complete' ? 'Oluşturulan takip planı' : 'Hastaya verilecek yaşam tarzı önerileri'));
    const ul = el('ul', { className: 'plan' });
    c.plan.forEach((p) => ul.appendChild(el('li', {}, p)));
    node.appendChild(ul);
    const missed = c.questions.filter((q) => q.key && !a.clues.includes(q));
    if (missed.length) {
      node.appendChild(el('div', { className: 'sec-title' }, 'Kaçırılan ipuçları'));
      node.appendChild(clueList(missed));
    }
    node.appendChild(el('div', { className: 'disclaimer' }, 'Bu oyun gerçek hayatta tıbbi teşhis koymaz. Sağlık sorunlarınız için mutlaka bir hekime başvurun.'));

    a.patient.caseChoice = choice;
    E().discharge(a.patient);
    E().say(a.patient, choice === 'refer' ? 'Uzmana gideceğim, teşekkürler.' : choice === 'tests' ? 'Tetkikleri yaptıracağım.' : 'Önerileri uygulayacağım, sağ olun!', 3000);
    active = null;
    nextCaseIn = 22;
    UI().openDialog({
      icon: grade === 'best' ? '🏆' : grade === 'acceptable' ? '📋' : '⚠️',
      title: `Vaka Sonucu: ${c.title}`, subtitle: 'Adım 6/6 · Sonuç ve İtibar', wide: true, node,
      actions: [{ label: 'Devam' }],
    });
  }

  // ---------------------------------------------------------------- Diğer pencereler
  function openCaseFile() {
    if (!active) {
      UI().openDialog({ icon: '📁', title: 'Vaka Dosyası', subtitle: 'Aktif vaka yok', text: `Yeni bir vaka hastası yakında gelecek. Çözülen vaka sayısı: ${state.solved.length}.` });
      return;
    }
    const a = active, c = a.c;
    const node = el('div', {});
    node.appendChild(el('div', { className: 'steps' }, ['Geliş', 'Kayıt', 'Muayene', 'Laboratuvar', 'Karar', 'Sonuç']
      .map((s, i) => (i + 1 < a.step ? '✓ ' : i + 1 === a.step ? '▶ ' : '· ') + s).join('   ')));
    node.appendChild(el('p', {}, `${c.name}, ${c.age} yaş. Şikâyet: ${c.complaint}.`));
    node.appendChild(el('p', { className: 'muted' }, 'Hedef: ' + objective()));
    node.appendChild(el('div', { className: 'sec-title' }, 'Vaka defteri'));
    node.appendChild(clueList(a.clues));
    UI().openDialog({ icon: '📁', title: `Vaka Dosyası: ${c.title}`, subtitle: `Adım ${a.step}/6`, wide: true, node });
  }

  function openArchive() {
    const node = el('div', {});
    if (!state.solved.length) node.appendChild(el('p', { className: 'muted' }, 'Arşivde henüz çözülmüş vaka yok.'));
    else {
      const avg = Math.round(state.solved.reduce((s, x) => s + x.score, 0) / state.solved.length);
      node.appendChild(el('p', {}, `Toplam ${state.solved.length} vaka · Ortalama puan ${avg}/100`));
      const list = el('div', { className: 'archive' });
      state.solved.slice().reverse().forEach((s) => {
        const row = el('div', { className: 'arch-row' });
        row.appendChild(el('span', { className: 'arch-grade g-' + s.grade }, s.grade === 'best' ? '✅' : s.grade === 'acceptable' ? '🟡' : '⛔'));
        row.appendChild(el('span', { className: 'arch-title' }, `${s.title}: ${s.name} (${s.age})`));
        row.appendChild(el('span', { className: 'arch-meta' }, `[${OPTIONS[s.choice].n}] · ipucu ${s.keyFound}/${s.keyTotal} · ${s.score} puan${s.hasty ? ' · aceleci' : ''}`));
        list.appendChild(row);
      });
      node.appendChild(list);
    }
    UI().openDialog({ icon: '🗂️', title: 'Vaka Arşivi', subtitle: `${CASES.length} senaryodan ${new Set(state.solved.map((s) => s.id)).size} tanesi çözüldü`, wide: true, node });
  }

  function openIntro() {
    introShown = true;
    const node = el('div', { className: 'intro' });
    node.appendChild(el('p', {}, 'Vita Hospital\'in yeni Başhekimisiniz. Dijital hastanemiz kapılarını yeni açtı ve şehrin dört bir yanından hastalar geliyor.'));
    node.appendChild(el('p', {}, 'Hastalar başta her şeyi anlatmaz. Doğru soruları sorarak gizli kalan yaşam tarzı, beslenme ve uyku ipuçlarını ortaya çıkarın, tahlilleri inceleyin ve en güvenli kararı verin.'));
    const ol = el('ol', { className: 'plan' });
    ['Geliş: ★ işaretli vaka hastası kapıdan girer', 'Kayıt: resepsiyonda şikâyeti ve yaşı kaydedilir', 'Muayene & Sorgulama: odaya gidip soru sorun (sabrı sınırlı!)', 'Laboratuvar: tahlil isteyin, sonuçları analizörde inceleyin', 'Klinik Karar: 3 stratejik seçenekten birini seçin', 'Sonuç: İtibar, Hasta Güvenliği ve Bütçe güncellenir']
      .forEach((s) => ol.appendChild(el('li', {}, s)));
    node.appendChild(ol);
    node.appendChild(el('div', { className: 'disclaimer' }, 'Bu oyun eğitim amaçlıdır; gerçek hayatta tıbbi teşhis koyma veya tedavi önerme iddiası taşımaz. Klinik düşünme ve sağlık okuryazarlığını öğretir.'));
    UI().openDialog({ icon: '✚', title: 'Hoş geldiniz, Başhekim!', subtitle: 'Vita Hospital · Klinik Dedektiflik', wide: true, node, actions: [{ label: 'Göreve başla' }] });
  }

  // ---------------------------------------------------------------- Etkileşim yönlendirme
  function handleInteract(t) {
    if (t.type === 'device' && t.ref.tag === 'archive_terminal') { openArchive(); return true; }
    if (t.type === 'device' && t.ref.tag === 'chief_desk') { openCaseFile(); return true; }
    if (!active) return false;
    const p = active.patient;
    if (t.type === 'patient' && t.ref === p) {
      if (active.inExam && p.state === 'exam') openExam();
      else UI().openDialog({
        icon: '★', title: `${p.name}, ${p.age} yaş`, subtitle: E().STATUS[p.state] || '',
        text: `Şikâyet: ${p.complaint}.\n\n"${active.c.intro}"\n\nHasta muayene odasına alındığında ayrıntılı sorgulama yapabilirsiniz.`,
      });
      return true;
    }
    const labDevice = t.type === 'device' && ['analyzer', 'centrifuge', 'microscope'].includes(t.ref.tag);
    const laborant = t.type === 'staff' && t.ref.id === 'laborant';
    if ((labDevice || laborant) && active.labsReady) { openLabReport(); return true; }
    if (t.type === 'staff' && (t.ref.id === 'doctor1' || t.ref.id === 'doctor2') && active.step >= 3) {
      active.consulted = true;
      E().faceToward(t.ref, E().player.x, E().player.y);
      UI().openDialog({ icon: '👩‍⚕️', title: t.ref.name, subtitle: `Konsültasyon · ${active.c.name}`, text: `"${active.c.hint}"\n\nUnutmayın Başhekimim: kırmızı bayraklar varsa beklemeden uzmana yönlendirmek gerekir.` });
      return true;
    }
    if ((t.type === 'staff' && t.ref.id === 'receptionist') || (t.type === 'device' && t.ref.tag === 'reception_desk')) {
      if (active.step >= 2) {
        UI().openDialog({ icon: '📋', title: 'Hasta Kayıt Bilgisi', subtitle: `${p.ticket || ''} · Adım 2/6 Kayıt`, text: `Ad: ${p.name}\nYaş: ${p.age}\nBaşvuru şikâyeti: ${p.complaint}\nDurum: ${E().STATUS[p.state] || ''}` });
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- Hedef metni
  function objective() {
    if (!active) return nextCaseIn > 0 ? 'Yeni vaka bekleniyor…' : 'Yeni vaka geliyor…';
    const a = active, p = a.patient;
    switch (p.state) {
      case 'queue': case 'registering': return a.step === 1 ? '1/6 Geliş: ★ hasta kapıdan girdi' : '2/6 Kayıt: resepsiyonda kayıt';
      case 'toSeat': case 'waiting': return '2/6 Kayıt tamam: muayene sırası bekleniyor';
      case 'toExam': return a.labsReady ? '4/6 Hasta odaya dönüyor; tahlili inceleyin' : '3/6 Hasta muayene odasına gidiyor';
      case 'labWait': case 'toLab': case 'lab': return '4/6 Kan alınıyor…';
      case 'exam':
        if (a.labsReady && !a.labsReviewed) return '4/6 Laboratuvarda tahlili inceleyin';
        if (a.labsReviewed) return `5/6 ${p.examRef ? p.examRef.name : 'Muayene'}: klinik kararı verin`;
        return `3/6 ${p.examRef ? p.examRef.name : 'Muayene'}: hastayı sorgulayın`;
      default: return `${a.step}/6`;
    }
  }

  VH.cases = {
    CASES, state, OPTIONS,
    get active() { return active; },
    init() {},
    start() { if (!introShown) openIntro(); },
    update(dt) {
      if (!active) {
        nextCaseIn -= dt;
        if (nextCaseIn <= 0) startCase();
      }
      UI().setObjective('📁 ' + objective(), openCaseFile);
    },
    onRegistered, onExamStart, onLabDone,
    handleInteract,
    openArchive, openCaseFile,
    // test yardımcıları
    _ask: (i) => ask(active.questions[i]),
    _decide: decide,
    _orderLabs: orderLabs,
    _openLabReport: openLabReport,
    _startCase: startCase,
  };
})();

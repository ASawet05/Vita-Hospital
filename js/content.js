// Vita Hospital — Ek klinik içerik: yeni poliklinik vakaları, acil senaryoları ve eczane bilgileri
//
// ÖNEMLİ: Eğitim amaçlıdır; gerçek teşhis/tedavi önerisi değildir. Değerler sadeleştirilmiş
// oyun içi örneklerdir; referans aralıkları laboratuvarlara göre değişebilir. Senaryolar
// genel kabul görmüş klinik bilgilere (uyarı işaretleri, temel yaklaşım) dayanır ve
// oyuncuya "kırmızı bayrakları sorgulama" ile "doğru yönlendirme"yi öğretmeyi amaçlar.
(function () {
  const VH = (window.VH = window.VH || {});
  const Q = (cat, q, a, clue, o) => Object.assign({ cat, q, a, clue: clue || null }, o || {});
  const L = (name, value, unit, lo, hi) => ({ name, value, unit, lo, hi });

  const CASES = [
    {
      id: 'c15', title: 'Horlayan Şoför', name: 'Recep Toprak', age: 49, sex: 'E',
      complaint: 'Gündüz aşırı uykululuk, sabah baş ağrısı, yüksek tansiyon',
      arrival: 'Eşim zorla gönderdi, ben iyiyim aslında…',
      intro: 'Gün boyu gözlerim kapanıyor. Sabahları başım zonklayarak uyanıyorum, tansiyonum da yüksek çıkıyormuş.',
      hint: 'Uyku sırasında neler olduğunu ve mesleğini sorun. Gündüz uyuklama, özellikle araç kullanırken, ciddi bir güvenlik sorunudur.',
      questions: [
        Q('Uyku', 'Eşiniz horlamanızdan şikâyet ediyor mu? Uykuda nefesiniz duruyor mu?', 'Odayı ayırdı… Çok horluyormuşum, bazen nefesim duruyormuş, sonra boğulur gibi uyanıyormuşum.', 'Yüksek sesli horlama + eşin fark ettiği solunum durmaları', { key: 1, id: 'snore' }),
        Q('Kırmızı bayrak', 'Mesleğiniz nedir? Gün içinde istemeden uyukladığınız oluyor mu?', 'Tır şoförüyüm. Geçen hafta direksiyonda bir an daldım, kornayla uyandım.', 'Direksiyonda uyuklama (kendisi ve trafik için kırmızı bayrak)', { key: 1, flag: 1 }),
        Q('Beslenme', 'Son yıllarda kilonuz nasıl değişti? Akşamları ne yiyorsunuz?', 'Beş yılda 20 kilo aldım. Gece yolda ağır yemek yiyorum.', 'Son 5 yılda 20 kg kilo artışı, gece ağır yemek', { key: 1 }),
        Q('Yaşam', 'Sigara ya da alkol kullanıyor musunuz?', 'Günde bir paket sigara. Akşamları uyumak için bir-iki kadeh de içerim.', 'Sigara + uyumak için akşam alkolü (horlamayı artırır)', { key: 1 }),
        Q('Belirti', 'Sabahları nasıl uyanıyorsunuz?', 'Ağzım kupkuru, başım ağrıyarak. Hiç dinlenmemiş gibi.', 'Sabah ağız kuruluğu ve baş ağrısı, dinlendirmeyen uyku', { key: 1, req: 'snore' }),
        Q('Aile', 'Ailede kalp hastalığı olan var mı?', 'Babam 60 yaşında kalp krizi geçirdi.', 'Babada 60 yaşında kalp krizi', {}),
      ],
      labs: [L('Açlık Glukozu', 112, 'mg/dL', 70, 99), L('HbA1c', 5.9, '%', 4, 5.6), L('LDL Kolesterol', 162, 'mg/dL', 0, 130), L('Hematokrit', 51, '%', 41, 50), L('Hemoglobin', 16.9, 'g/dL', 13.5, 17.5), L('TSH', 2.3, 'mIU/L', 0.4, 4.0)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Göğüs Hastalıkları (Uyku Laboratuvarı)', testsWhat: 'Uyku çalışması (polisomnografi) ve 24 saatlik tansiyon takibi',
      lesson: 'Yüksek sesli horlama, tanıklı solunum durmaları ve gündüz uyuklama uyku apnesini düşündürür. Direksiyonda uyuklama hem hasta hem de trafikteki diğer insanlar için ciddi bir risktir; uyku çalışmasıyla değerlendirme gecikmemelidir. Kilo vermek, akşam alkolünü ve sigarayı bırakmak da tedavinin önemli parçalarıdır.',
      plan: ['Değerlendirme tamamlanana kadar uykuluyken araç kullanmamak', 'Akşam alkolü ve ağır yemekten kaçınmak', 'Sigara bırakma desteği', 'Diyetisyen eşliğinde kilo verme', 'Sırt üstü yerine yan yatma'],
    },
    {
      id: 'c16', title: 'Titreyen Eller', name: 'Selin Ateş', age: 29, sex: 'K',
      complaint: 'Çarpıntı, kilo kaybı, el titremesi, sıcağa dayanamama',
      arrival: 'Kalbim sanki göğsümden çıkacak…',
      intro: 'Kalbim sürekli hızlı atıyor, ellerim titriyor. Çok yememe rağmen kilo veriyorum.',
      hint: 'Kilo, iştah, sıcak-soğuk toleransı ve göz değişikliklerini sorun. Kullanılan takviyeleri de mutlaka öğrenin.',
      questions: [
        Q('Belirti', 'Son aylarda kilonuz ve iştahınız nasıl değişti?', 'Her zamankinden çok yememe rağmen 3 ayda 6 kilo verdim.', 'İştah artmışken 3 ayda 6 kg kilo kaybı', { key: 1 }),
        Q('Belirti', 'Sıcağa ya da soğuğa tahammülünüz nasıl?', 'Herkes üşürken ben terliyorum, pencereyi açıyorum.', 'Sıcağa tahammülsüzlük, terleme', { key: 1 }),
        Q('Belirti', 'Gözlerinizde bir değişiklik fark ettiniz mi?', 'Arkadaşlarım gözlerimin daha iri baktığını söylüyor, bazen batıyor.', 'Gözlerde belirginleşme ve batma', { key: 1, id: 'eyes' }),
        Q('İlaç/Takviye', 'Zayıflama hapı, kafein ya da takviye kullanıyor musunuz?', 'Hayır, hiçbir şey kullanmıyorum. Kahveyi de bıraktım.', 'İlaç/takviye ya da fazla kafein yok', { key: 1 }),
        Q('Aile', 'Ailede tiroid hastalığı olan var mı?', 'Teyzemde guatr vardı, ameliyat oldu.', 'Teyzede tiroid hastalığı', { key: 1, req: 'eyes' }),
        Q('Uyku', 'Uykunuz nasıl?', 'Huzursuzum, uykum sık sık bölünüyor.', 'Huzursuzluk ve bölünen uyku', { key: 1 }),
        Q('Kırmızı bayrak', 'Çarpıntı sırasında göğüs ağrısı, bayılma ya da istirahatte nefes darlığı oluyor mu?', 'Bayılmadım; sadece merdivende nefesim çabuk daralıyor.', 'Bayılma / istirahatte nefes darlığı yok', {}),
      ],
      labs: [L('TSH', 0.02, 'mIU/L', 0.4, 4.0), L('Serbest T4', 3.1, 'ng/dL', 0.9, 1.7), L('Hemoglobin', 12.8, 'g/dL', 12, 16), L('Total Kolesterol', 124, 'mg/dL', 130, 200), L('Açlık Glukozu', 92, 'mg/dL', 70, 99), L('Kalsiyum', 9.9, 'mg/dL', 8.5, 10.5)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Endokrinoloji', testsWhat: 'Tiroid antikorları ve tiroid ultrasonu',
      lesson: 'Düşük TSH ile yüksek serbest T4, tiroid bezinin fazla çalıştığını gösterir. Kilo kaybı, çarpıntı, sıcağa tahammülsüzlük ve göz bulguları birlikte endokrinoloji değerlendirmesi gerektirir. Tedavi edilmeyen hipertiroidi kalp ritmini ve kemik sağlığını olumsuz etkileyebilir.',
      plan: ['Endokrinoloji randevusuna kadar kafeinli içeceklerden uzak durmak', 'Göz batması için hekime danışmak, güneş gözlüğü kullanmak', 'Yoğun egzersize hekim onayıyla başlamak', 'Yeterli kalorili, dengeli beslenme'],
    },
    {
      id: 'c17', title: 'Burnu Kanayan Kasap', name: 'Nihat Er', age: 61, sex: 'E',
      complaint: 'Sabah baş ağrısı, ara ara burun kanaması, ensede ağırlık',
      arrival: 'Yine burnum kanadı, işi bıraktım geldim.',
      intro: 'Sabahları ensem ağırlaşıyor, başım ağrıyor. Bu ay iki kez burnum kanadı.',
      hint: 'İlaçlarını düzenli kullanıp kullanmadığını, tuz alışkanlığını ve kullandığı ağrı kesici ya da spreyleri sorun.',
      questions: [
        Q('İlaç/Takviye', 'Tansiyon ilacı kullanıyor musunuz? Düzenli alıyor musunuz?', 'Doktor yazmıştı ama kendimi iyi hissedince bıraktım.', 'Tansiyon ilacını kendi kendine bırakmış', { key: 1, id: 'med' }),
        Q('Beslenme', 'Yemeğe tuz ekler misiniz? Turşu, salamura, işlenmiş et?', 'Tuzsuz yemek yenir mi! Her öğün turşu, sucuk, pastırma.', 'Çok tuzlu beslenme, işlenmiş et', { key: 1 }),
        Q('İlaç/Takviye', 'Ağrılarınız ya da nezle için ne kullanıyorsunuz?', 'Dizlerim için her gün ağrı kesici, bir de burun açıcı sprey.', 'Her gün ağrı kesici + burun açıcı sprey (tansiyonu yükseltebilir)', { key: 1, req: 'med' }),
        Q('Kırmızı bayrak', 'Görme bulanıklığı, göğüs ağrısı, konuşma bozukluğu ya da kolda güçsüzlük oldu mu?', 'Hayır, öyle bir şey olmadı.', 'Acil hedef organ belirtisi yok', { key: 1 }),
        Q('Yaşam', 'Gün içinde hareket ediyor musunuz?', 'Dükkândan eve arabayla gidip geliyorum, yürüyüş yok.', 'Hareketsiz yaşam', { key: 1 }),
        Q('Yaşam', 'Sigara kullanıyor musunuz?', 'Günde yarım paket.', 'Günde yarım paket sigara', { key: 1 }),
      ],
      labs: [L('Kreatinin', 1.3, 'mg/dL', 0.7, 1.2), L('İdrar Albümin/Kreatinin', 48, 'mg/g', 0, 30), L('LDL Kolesterol', 168, 'mg/dL', 0, 130), L('Açlık Glukozu', 104, 'mg/dL', 70, 99), L('Potasyum', 4.4, 'mmol/L', 3.5, 5.1), L('Sodyum', 141, 'mmol/L', 135, 145)],
      grades: { tests: 'best', refer: 'acceptable', complete: 'risky' },
      referTo: 'Dahiliye / Kardiyoloji', testsWhat: '24 saatlik ayaktan tansiyon takibi, EKG ve göz dibi muayenesi',
      lesson: 'Kendini iyi hissedince ilacı bırakmak yüksek tansiyonda en sık yapılan hatadır; tansiyon çoğu zaman belirti vermez. Fazla tuz, her gün ağrı kesici ve burun açıcı spreyler tansiyonu yükseltebilir. İdrarda albümin ve kreatinin artışı böbreklerin etkilendiğini düşündürür; hedef organ değerlendirmesi yapılıp tedavi hekimle yeniden düzenlenmelidir.',
      plan: ['Tansiyon ilacını hekime danışmadan bırakmamak', 'Tuzu azaltmak: turşu, salamura, işlenmiş et sınırlı', 'Ağrı kesici ve burun spreyini hekimle gözden geçirmek', 'Günde 30 dk tempolu yürüyüş', 'Sigara bırakma desteği', 'Evde tansiyon ölçüm günlüğü'],
    },
    {
      id: 'c18', title: 'Şişkin Öğrenci', name: 'Duru Kaplan', age: 20, sex: 'K',
      complaint: 'Şişkinlik, sık ishal, kilo kaybı, demir hapına rağmen kansızlık',
      arrival: 'Demir hapı içiyorum ama hâlâ halsizim…',
      intro: 'Altı aydır demir hapı içiyorum ama tahlillerim düzelmiyor. Karnım hep şiş, sık sık ishal oluyorum.',
      hint: 'Belirtilerin hangi yiyeceklerle arttığını, aile öyküsünü ve ciltte döküntü olup olmadığını sorun. Demire yanıt vermeyen kansızlık önemli bir ipucudur.',
      questions: [
        Q('Beslenme', 'Belirtiler hangi yiyeceklerden sonra artıyor?', 'Makarna, ekmek, börek… Yurtta zaten hep hamur işi var.', 'Belirtiler buğday ürünleriyle artıyor', { key: 1, id: 'gluten' }),
        Q('İlaç/Takviye', 'Demir takviyesini ne zamandır ve nasıl kullanıyorsunuz?', '6 aydır, aç karnına düzgünce içiyorum ama tahlilim hiç düzelmedi.', 'Doğru kullanılan demire rağmen düzelmeyen kansızlık', { key: 1 }),
        Q('Aile', 'Ailede çölyak ya da benzer bağırsak hastalığı olan var mı?', 'Kuzenimde çölyak var, glutensiz besleniyor.', 'Kuzende çölyak hastalığı', { key: 1, req: 'gluten' }),
        Q('Belirti', 'Ciltte kaşıntılı kabarcıklar ya da ağızda yara oluyor mu?', 'Dirseklerimde kaşıntılı küçük kabarcıklar çıkıyor.', 'Dirseklerde kaşıntılı kabarcıklı döküntü', { key: 1 }),
        Q('Kırmızı bayrak', 'Dışkıda kan, gece uyandıran karın ağrısı ya da ateş var mı?', 'Kan görmedim, ateşim de olmadı.', 'Dışkıda kan / ateş yok', {}),
        Q('Belirti', 'Son aylarda kilonuz nasıl değişti?', 'Dört ayda 4 kilo verdim, rejim yapmadan.', 'İstemsiz 4 kg kilo kaybı', { key: 1 }),
      ],
      labs: [L('Hemoglobin', 10.8, 'g/dL', 12, 16), L('Ferritin', 6, 'ng/mL', 15, 150), L('Doku Transglutaminaz IgA', 128, 'U/mL', 0, 10), L('Albümin', 3.4, 'g/dL', 3.5, 5.0), L('D Vitamini (25-OH)', 15, 'ng/mL', 30, 100), L('Folat', 3.1, 'ng/mL', 4, 20)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Gastroenteroloji', testsWhat: 'Toplam IgA düzeyi ve tam kan tekrarı',
      lesson: 'Demir tedavisine yanıt vermeyen kansızlık, şişkinlik, ishal, istemsiz kilo kaybı ve ailede çölyak öyküsü çölyak hastalığını düşündürür. Doku transglutaminaz antikorunun yüksek olması gastroenteroloji değerlendirmesi gerektirir. Tanı kesinleşmeden glutensiz diyete geçmek testleri yanıltabilir; diyet kararı uzmanla birlikte verilmelidir.',
      plan: ['Tanı kesinleşene kadar diyeti kendi başına değiştirmemek', 'Belirti günlüğü tutmak', 'Tanıdan sonra diyetisyen eşliğinde glutensiz beslenme', 'Demir ve vitamin eksiklerinin hekimle takibi'],
    },
    {
      id: 'c19', title: 'Sütle Barışmayan', name: 'Mert Güneş', age: 26, sex: 'E',
      complaint: 'Süt ürünlerinden sonra şişkinlik, gaz ve ishal',
      arrival: 'Sütlü kahve içince midem isyan ediyor.',
      intro: 'Sütlü bir şey yiyince karnım şişiyor, gaz yapıyor, bazen tuvalete koşuyorum.',
      hint: 'Belirtilerin neyle ilişkili olduğunu ve alarm belirtilerini sorun. Beslenmesinde son zamanlarda değişen bir şey var mı?',
      questions: [
        Q('Beslenme', 'Belirtiler neyi takip ediyor, ne kadar sonra başlıyor?', 'Sütlü kahve ya da sütlaçtan yarım saat sonra midem guruldamaya başlıyor.', 'Süt içtikten 30 dk sonra şişkinlik ve gaz', { key: 1, id: 'milk' }),
        Q('Beslenme', 'Yoğurt ve peynir de aynı etkiyi yapıyor mu?', 'Yoğurtta pek sorun olmuyor, eski kaşarda da.', 'Yoğurt ve olgun peynir iyi tolere ediliyor', { key: 1, req: 'milk' }),
        Q('Kırmızı bayrak', 'Kilo kaybı, dışkıda kan, gece uyandıran ishal ya da ateş var mı?', 'Hayır, kilom sabit, kan da görmedim.', 'Alarm belirtisi yok', { key: 1 }),
        Q('Aile', 'Ailenizde benzer şikâyeti olan var mı?', 'Babam da süt içemez.', 'Babada süt intoleransı', { key: 1 }),
        Q('Yaşam', 'Son zamanlarda beslenmenizde bir değişiklik oldu mu?', 'Spor salonuna başladım; günde 1 litre süt ve sütlü protein tozu içiyorum.', 'Son dönemde günde 1 litre süt + protein tozu', { key: 1 }),
      ],
      labs: [L('Hemoglobin', 15.1, 'g/dL', 13.5, 17.5), L('Ferritin', 90, 'ng/mL', 30, 400), L('Doku Transglutaminaz IgA', 2, 'U/mL', 0, 10), L('CRP', 1, 'mg/L', 0, 5), L('D Vitamini (25-OH)', 28, 'ng/mL', 30, 100), L('Kalsiyum', 9.2, 'mg/dL', 8.5, 10.5)],
      grades: { complete: 'best', tests: 'acceptable', refer: 'acceptable' },
      referTo: 'Gastroenteroloji', testsWhat: 'Laktoz nefes testi',
      lesson: 'Alarm belirtisi olmadan, yalnızca süt ve sütlü ürünlerden sonra ortaya çıkan şişkinlik ve gaz laktoz intoleransını düşündürür. Çölyak testinin normal olması ve kansızlık olmaması güven verir. Yoğurt, kefir ve olgun peynir genellikle daha iyi tolere edilir; kalsiyum alımı korunmalıdır.',
      plan: ['Sütü laktozsuz süt ile değiştirmek', 'Yoğurt, kefir ve olgun peynirle kalsiyumu korumak', 'Protein tozunun içeriğini kontrol etmek', 'Belirti günlüğü tutmak', 'Belirtiler değişirse hekime başvurmak'],
    },
    {
      id: 'c20', title: 'Kafası Karışan Dede', name: 'Hilmi Sarı', age: 82, sex: 'E',
      complaint: '(Kızı) İki gündür kafası karışık, geceleri huzursuz, az yiyip içiyor',
      arrival: '(Kızı) Babam bizi tanımakta zorlanıyor…',
      intro: '(Kızı anlatıyor) Babam iki gündür çok tuhaf. Saati, günü karıştırıyor, geceleri hiç uyumuyor.',
      hint: 'Yaşlı hastada ani başlayan bilinç değişikliği her zaman ciddiye alınır. Başlangıç zamanını, ateşi, idrar şikâyetlerini ve sıvı alımını sorun.',
      questions: [
        Q('Kırmızı bayrak', 'Bu değişiklik ne zaman başladı? Daha önce de böyle olmuş muydu?', '(Kızı) İki gün önce birden başladı. Normalde bulmaca çözer, bizi hep tanır.', 'Ani başlangıçlı bilinç değişikliği (deliryum, kırmızı bayrak)', { key: 1, flag: 1, id: 'acute' }),
        Q('Belirti', 'İdrar yaparken yanma, sık idrara çıkma ya da kötü koku var mı?', '(Kızı) Çok sık tuvalete gidiyor, idrarı koyu ve kokulu.', 'Sık idrara çıkma, koyu ve kötü kokulu idrar', { key: 1, req: 'acute' }),
        Q('Beslenme', 'Gün içinde ne kadar su içiyor?', '(Kızı) Gece tuvalete kalkmamak için suyu kısıyor, 2-3 bardak.', 'Çok az sıvı alımı (2-3 bardak)', { key: 1 }),
        Q('İlaç/Takviye', 'Yeni başlanan ya da dozu değişen bir ilacı var mı?', '(Kızı) Prostat ve tansiyon ilaçları var, yeni bir şey yok.', 'Yeni ilaç değişikliği yok', { key: 1 }),
        Q('Kırmızı bayrak', 'Ateş, titreme, düşme ya da başını çarpma oldu mu?', '(Kızı) Dün akşam çok üşüdü, titredi. Düşmedi.', 'Üşüme-titreme (ateş), düşme yok', { key: 1, flag: 1 }),
        Q('Aile', 'Ailede bunama öyküsü var mı?', '(Kızı) Bildiğimiz kadarıyla yok.', 'Ailede bunama yok', {}),
      ],
      labs: [L('Lökosit', 14.2, '×10³/µL', 4, 10), L('CRP', 86, 'mg/L', 0, 5), L('Sodyum', 148, 'mmol/L', 135, 145), L('Kreatinin', 1.6, 'mg/dL', 0.7, 1.2), L('Üre', 72, 'mg/dL', 17, 43), L('İdrarda Lökosit', 45, '/HPF', 0, 5)],
      grades: { refer: 'best', tests: 'acceptable', complete: 'risky' },
      referTo: 'Acil Dahiliye (aynı gün değerlendirme)', testsWhat: 'İdrar ve kan kültürü',
      lesson: 'Yaşlılarda birdenbire başlayan bilinç bulanıklığı (deliryum) acil bir uyarıdır ve "yaşlılık" diye geçiştirilmemelidir. Ateş-titreme, idrar şikâyetleri, yüksek iltihap değerleri ve sıvı kaybı ciddi bir enfeksiyonu düşündürür; hasta aynı gün hekim değerlendirmesine alınmalıdır.',
      plan: ['Aynı gün hekim değerlendirmesi', 'Hekim önerisine göre yeterli sıvı alımı', 'Gece ışığı ve tanıdık eşyalarla yönelim desteği', 'İlaç listesinin hekimle gözden geçirilmesi'],
    },
    {
      id: 'c21', title: 'Kafein Fırtınası', name: 'Ozan Demirci', age: 34, sex: 'E',
      complaint: 'Çarpıntı, huzursuzluk, ellerde titreme, uykusuzluk',
      arrival: 'Kalbim tekliyor gibi, korktum…',
      intro: 'Gün içinde kalbim pır pır ediyor, ellerim titriyor. Geceleri de uyuyamıyorum.',
      hint: 'Önce kırmızı bayrakları sorun: bayılma, göğüs ağrısı, eforla başlama, ailede ani ölüm. Sonra içecekler, takviyeler, uyku ve stres.',
      questions: [
        Q('Beslenme', 'Günde ne kadar kahve, çay ya da enerji içeceği tüketiyorsunuz?', 'Proje teslimi var; günde 6-7 espresso, öğleden sonra da bir enerji içeceği.', 'Günde 6-7 espresso + enerji içeceği', { key: 1, id: 'caf' }),
        Q('Uyku', 'Gece kaçta yatıyorsunuz, kaç saat uyuyorsunuz?', 'Saat 2\'den önce uyuyamıyorum, 4-5 saat uyuyorum.', 'Günde 4-5 saat uyku', { key: 1 }),
        Q('Kırmızı bayrak', 'Çarpıntıda bayılma, göğüs ağrısı ya da nefes darlığı oluyor mu? Eforla mı başlıyor?', 'Hayır, oturduğum yerde başlıyor, birkaç dakikada geçiyor.', 'Bayılma / göğüs ağrısı yok; istirahatte kısa süreli', { key: 1 }),
        Q('İlaç/Takviye', 'Takviye, ön antrenman tozu ya da burun spreyi kullanıyor musunuz?', 'Ön antrenman tozu kullanıyorum, içinde yüksek kafein varmış.', 'Yüksek kafeinli ön antrenman tozu', { key: 1, req: 'caf' }),
        Q('Yaşam', 'Son zamanlarda stresiniz nasıl?', 'İş yükü çok ağır, sürekli tetikteyim.', 'Yoğun iş stresi', { key: 1 }),
        Q('Aile', 'Ailede genç yaşta ani ölüm ya da ritim bozukluğu var mı?', 'Hayır, yok.', 'Ailede ani ölüm / ritim bozukluğu yok', { key: 1 }),
      ],
      labs: [L('TSH', 1.6, 'mIU/L', 0.4, 4.0), L('Potasyum', 4.1, 'mmol/L', 3.5, 5.1), L('Magnezyum', 2.0, 'mg/dL', 1.7, 2.4), L('Hemoglobin', 15.0, 'g/dL', 13.5, 17.5), L('Açlık Glukozu', 88, 'mg/dL', 70, 99), L('Ferritin', 110, 'ng/mL', 30, 400)],
      grades: { complete: 'best', tests: 'acceptable', refer: 'acceptable' },
      referTo: 'Kardiyoloji', testsWhat: 'EKG ve 24 saatlik ritim (Holter) kaydı',
      lesson: 'Kırmızı bayrakların olmaması ve tahlillerin normal çıkması güven verir. Yüksek kafein (espresso, enerji içeceği, ön antrenman tozları), uykusuzluk ve stres çarpıntının sık nedenlerindendir. Kafeini azaltmak ve uykuyu düzenlemek çoğu zaman belirgin rahatlama sağlar; şikâyet sürerse EKG ile değerlendirilir.',
      plan: ['Kafeini kademeli azaltmak, öğleden sonra hiç almamak', 'Ön antrenman tozu ve enerji içeceklerini bırakmak', 'Her gün aynı saatte yatış, en az 7 saat uyku', 'Nefes egzersizi ve kısa yürüyüş molaları', 'Bayılma ya da göğüs ağrısı olursa hemen başvurmak'],
    },
    {
      id: 'c22', title: 'Gece Uyandıran Başparmak', name: 'Cengiz Yalın', age: 55, sex: 'E',
      complaint: 'Ayak başparmağında gece başlayan şiddetli ağrı, kızarıklık ve şişlik',
      arrival: 'Çarşaf değse acıyor, zor yürüyorum…',
      intro: 'Gece bir anda başparmağım zonklamaya başladı. Kıpkırmızı, şiş; çarşaf değse bile acıyor.',
      hint: 'Beslenme ve içecekleri (sakatat, kırmızı et, alkol, şekerli içecek), kullandığı ilaçları ve önceki atakları sorun. Ateş varsa eklem enfeksiyonunu da düşünün.',
      questions: [
        Q('Beslenme', 'Atak öncesi ne yiyip içtiniz?', 'Dün düğündeydik; kavurma, ciğer, bol bira…', 'Atak öncesi sakatat, kırmızı et ve bira', { key: 1, id: 'feast' }),
        Q('İlaç/Takviye', 'Düzenli kullandığınız ilaçlar var mı?', 'Ödem için bir idrar söktürücü kullanıyorum.', 'İdrar söktürücü kullanımı (ürik asidi artırabilir)', { key: 1 }),
        Q('Belirti', 'Daha önce benzer atak oldu mu?', 'Geçen yıl da bir kez olmuştu, birkaç günde geçti.', 'Daha önce benzer atak öyküsü', { key: 1, req: 'feast' }),
        Q('Kırmızı bayrak', 'Ateşiniz, titremeniz ya da eklemin üzerinde yara var mı?', 'Ateşim yok, yara da yok.', 'Ateş / açık yara yok (eklem enfeksiyonu daha az olası)', { key: 1 }),
        Q('Beslenme', 'Günde ne kadar su ve şekerli içecek tüketiyorsunuz?', 'Su az içerim; gazlı içeceği çok severim.', 'Az su, çok şekerli/gazlı içecek', { key: 1 }),
        Q('Aile', 'Ailede gut ya da böbrek taşı olan var mı?', 'Babamda gut vardı.', 'Babada gut', {}),
      ],
      labs: [L('Ürik Asit', 9.4, 'mg/dL', 3.4, 7.0), L('CRP', 18, 'mg/L', 0, 5), L('Lökosit', 10.8, '×10³/µL', 4, 10), L('Kreatinin', 1.1, 'mg/dL', 0.7, 1.2), L('Açlık Glukozu', 108, 'mg/dL', 70, 99), L('Trigliserid', 240, 'mg/dL', 0, 150)],
      grades: { refer: 'best', complete: 'acceptable', tests: 'acceptable' },
      referTo: 'Romatoloji / Dahiliye', testsWhat: 'Eklem sıvısı incelemesi',
      lesson: 'Ayak başparmağında gece başlayan, kızarık ve çok ağrılı eklem; sakatat, kırmızı et ve alkol sonrası atak, idrar söktürücü kullanımı ve yüksek ürik asit gut atağını düşündürür. Atak tedavisi ve ilaçların yeniden düzenlenmesi hekim tarafından yapılmalıdır. Ateş eşlik ederse eklem enfeksiyonu ayırt edilmelidir.',
      plan: ['Atak tedavisini hekim önerisiyle almak', 'Bol su içmek, şekerli içecekleri azaltmak', 'Alkol ve sakatattan kaçınmak', 'İdrar söktürücü ilacın hekimle gözden geçirilmesi', 'Kilo ve kan yağlarının takibi'],
    },
  ];

  const ER = [
    { id: 'copd', name: 'Kemal Uysal', age: 71, sex: 'E', complaint: 'KOAH hastası; nefes darlığı artmış, dudaklarda morarma', vitals: { pulse: 112, bp: '145/85', spo2: 84, temp: 37.6, mind: 'Açık, yorgun' }, need: 'oxygen', time: 65,
      why: 'KOAH alevlenmesinde oksijen satürasyonu düşük: kontrollü oksijen desteği ve solunum izlemi gerekir (KOAH\'ta oksijen hedefi hekimce ayarlanır).' },
    { id: 'pneumonia', name: 'Saniye Tekin', age: 77, sex: 'K', complaint: 'Üç gündür ateş, balgamlı öksürük ve nefes darlığı', vitals: { pulse: 118, bp: '105/65', spo2: 89, temp: 39.1, mind: 'Açık, halsiz' }, need: 'oxygen', time: 70,
      why: 'Ateş, öksürük ve düşük satürasyon zatürreyi düşündürür: önce oksijen desteği, ardından hekim değerlendirmesi ve tedavi.' },
    { id: 'co', name: 'Yusuf Kara', age: 40, sex: 'E', complaint: 'Sobalı evde baş ağrısı, bulantı, baş dönmesi; evdeki herkeste benzer şikâyet', vitals: { pulse: 104, bp: '128/80', spo2: 98, temp: 36.7, mind: 'Açık, sersem' }, need: 'oxygen', time: 65,
      why: 'Karbonmonoksit zehirlenmesinde parmak ucu oksimetresi yanıltıcı biçimde normal görünebilir! Sobalı ortam ve evdekilerde benzer belirtiler varsa yüksek akımlı oksijen hemen başlanır.' },
    { id: 'sepsis', name: 'Gülten Aksu', age: 69, sex: 'K', complaint: 'Ateş, titreme, idrarda yanma; son saatlerde çok halsiz', vitals: { pulse: 128, bp: '84/50', spo2: 93, temp: 39.4, mind: 'Uykuya meyilli' }, need: 'iv', time: 60,
      why: 'Ateşle birlikte düşük tansiyon ve hızlı nabız ağır enfeksiyonu (sepsis) düşündürür: damar yolu ve sıvı desteği hızla başlanmalı; hekim değerlendirmesi zamana karşı yarıştır.' },
    { id: 'bleed', name: 'Yaşar Çınar', age: 63, sex: 'E', complaint: 'Kahve telvesi gibi kusma, siyah dışkı, baş dönmesi', vitals: { pulse: 122, bp: '88/56', spo2: 96, temp: 36.4, mind: 'Açık, soluk' }, need: 'iv', time: 60,
      why: 'Mide-bağırsak kanamasında kan kaybı tansiyonu düşürür: damar yolu ve sıvı desteği öncelikli, ardından acil endoskopi değerlendirmesi.' },
    { id: 'stroke', name: 'Nazmiye Öz', age: 74, sex: 'K', complaint: 'Yüzde kayma, sağ kolda güçsüzlük, konuşma bozukluğu (30 dk önce başladı)', vitals: { pulse: 92, bp: '178/96', spo2: 96, temp: 36.8, mind: 'Açık, konuşması bozuk' }, need: 'monitor', time: 60,
      why: 'Yüzde kayma, kolda güçsüzlük ve konuşma bozukluğu inme belirtisidir. Zaman beyindir: hasta monitörize edilip hemen nörolojik değerlendirme ve beyin görüntülemesine alınır.' },
    { id: 'electric', name: 'Barış Aslan', age: 31, sex: 'E', complaint: 'İş yerinde elektrik çarpması; elde yanık izi, çarpıntı', vitals: { pulse: 116, bp: '132/82', spo2: 98, temp: 36.6, mind: 'Açık, korkmuş' }, need: 'monitor', time: 70,
      why: 'Elektrik çarpmasında kalp ritmi bozulabilir; dıştaki yanık küçük görünse bile hasta monitörde izlenmeli ve EKG çekilmelidir.' },
  ];

  const RX = {
    laktoz: { name: 'Laktozsuz beslenme bilgilendirmesi', opts: [['Laktozsuz süt kullanın; yoğurt, kefir ve olgun peynirle kalsiyumunuzu koruyun.', true], ['Tüm süt ürünlerini ömür boyu tamamen kesin, kalsiyum önemli değil.', false], ['Belirtiler geçsin diye her gün ishal kesici alın.', false]] },
    kafein: { name: 'Çarpıntı ve kafein bilgilendirmesi', opts: [['Kafeini kademeli azaltın, öğleden sonra hiç almayın; bayılma veya göğüs ağrısı olursa hemen başvurun.', true], ['Çarpıntı olunca bir enerji içeceği daha için, toparlar.', false], ['Uyuyabilmek için alkol kullanın.', false]] },
    gut: { name: 'Gut atağı ilaç bilgilendirmesi (hekim reçetesiyle)', opts: [['İlacı hekimin yazdığı doz ve sürede kullanın; bol su için, alkol ve sakatattan kaçının.', true], ['Ağrı geçince ilacı bırakıp bol kırmızı et yiyebilirsiniz.', false], ['Ağrıyan eklemi sıcak suya sokun, ilaca gerek yok.', false]] },
    koah: { name: 'KOAH inhaler ve oksijen bilgilendirmesi', opts: [['İnhalerlerinizi her gün düzenli ve doğru teknikle kullanın; sigarayı bırakma desteği alın, aşılarınızı yaptırın.', true], ['Nefes darlığında evdeki oksijenin akışını kendiniz sonuna kadar açın.', false], ['Rahatladığınızda ilaçları bırakabilirsiniz.', false]] },
    antibiyotik: { name: 'Antibiyotik kullanım bilgilendirmesi (hekim reçetesiyle)', opts: [['Antibiyotiği saatinde ve hekimin söylediği süre boyunca kullanın; ateş yeniden yükselirse başvurun.', true], ['Ateş düşünce bırakın, kalanını sonraki hastalığa saklayın.', false], ['Etkisi artsın diye dozu ikiye katlayın.', false]] },
    karbon: { name: 'Karbonmonoksit güvenliği bilgilendirmesi', opts: [['Soba ve bacayı her yıl kontrol ettirin, yatmadan önce sobayı söndürün; karbonmonoksit dedektörü takın.', true], ['Baş ağrısı olursa odayı daha da sıcak tutun.', false], ['Geceleri sobanın havasını kısıp yanık bırakın.', false]] },
    inme: { name: 'İnme uyarı işaretleri bilgilendirmesi', opts: [['İlaçlarınızı aksatmayın; yüzde kayma, kolda güçsüzlük ya da konuşma bozukluğu olursa hemen 112\'yi arayın.', true], ['Belirti olursa birkaç saat dinlenip geçmesini bekleyin.', false], ['Tansiyon ilacını kendinizi nasıl hissettiğinize göre alın.', false]] },
  };

  // ---------------------------------------------------------------- PubMed kaynakları (DOI bağlantılı)
  const SOURCES = {
    osa: { t: 'Obstructive sleep apnea and risk of motor vehicle crash: systematic review and meta-analysis', j: 'J Clin Sleep Med', y: 2009, pmid: '20465027' },
    celiacESsCD: { t: 'European Society for the Study of Coeliac Disease (ESsCD) guideline for coeliac disease and other gluten-related disorders', j: 'United European Gastroenterol J', y: 2019, pmid: '31210940', doi: '10.1177/2050640619844125' },
    celiacACG: { t: 'ACG clinical guidelines: diagnosis and management of celiac disease', j: 'Am J Gastroenterol', y: 2013, pmid: '23609613', doi: '10.1038/ajg.2013.79' },
    deliriumUTI: { t: 'Urinary Tract Infection Induced Delirium in Elderly Patients: A Systematic Review', j: 'Cureus', y: 2022, pmid: '36632270', doi: '10.7759/cureus.32321' },
    coPoisoning: { t: 'Carbon Monoxide Poisoning', j: 'Crit Care Clin', y: 2021, pmid: '34053712', doi: '10.1016/j.ccc.2021.03.010' },
    sepsis: { t: 'Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021', j: 'Crit Care Med', y: 2021, pmid: '34605781', doi: '10.1097/CCM.0000000000005337' },
    stroke: { t: 'Prehospital and hospital delays for stroke patients treated with thrombolysis', j: 'Australas Emerg Care', y: 2019, pmid: '31042530', doi: '10.1016/j.auec.2019.01.008' },
    appendicitis: { t: 'Diagnosis and treatment of acute appendicitis: 2020 update of the WSES Jerusalem guidelines', j: 'World J Emerg Surg', y: 2020, pmid: '32295644', doi: '10.1186/s13017-020-00306-3' },
    hipfxInjury: { t: 'Hip fracture surgery performed out-of-hours: A systematic review and meta-analysis', j: 'Injury', y: 2021, pmid: '33648740', doi: '10.1016/j.injury.2021.02.049' },
    hipfx48: { t: 'Early surgery within 48 hours of admission for hip fracture did not improve 1-year mortality in Japan', j: 'Hip Int', y: 2024, pmid: '38770922', doi: '10.1177/11207000241248836' },
    surgicalChecklist: { t: 'A surgical safety checklist to reduce morbidity and mortality in a global population', j: 'N Engl J Med', y: 2009, pmid: '19144931', doi: '10.1056/NEJMsa0810119' },
    fasting: { t: 'Pre-operative fasting in children: A guideline from the European Society of Anaesthesiology and Intensive Care', j: 'Eur J Anaesthesiol', y: 2022, pmid: '34857683', doi: '10.1097/EJA.0000000000001599' },
    mriImplant: { t: 'Reconsidering safety and reducing barriers to MRI in patients with cardiac implantable electronic devices', j: 'Eur Heart J', y: 2022, pmid: '34472581', doi: '10.1093/eurheartj/ehab469' },
    warfarin: { t: 'Warfarin and food, herbal or dietary supplement interactions: A systematic review', j: 'Br J Clin Pharmacol', y: 2020, pmid: '32478963', doi: '10.1111/bcp.14404' },
    ironAlt: { t: 'Iron absorption from oral iron supplements given on consecutive versus alternate days and as single morning doses versus twice-daily split dosing in iron-depleted women', j: 'Lancet Haematol', y: 2017, pmid: '29032957', doi: '10.1016/S2352-3026(17)30182-5' },
    inhalerErrors: { t: 'Systematic Review of Errors in Inhaler Use: Has Patient Technique Improved Over Time?', j: 'Chest', y: 2016, pmid: '27060726', doi: '10.1016/j.chest.2016.03.041' },
    ppiLong: { t: 'Adverse Effects Associated with Long-Term Use of Proton Pump Inhibitors', j: 'Chonnam Med J', y: 2023, pmid: '37303818', doi: '10.4068/cmj.2023.59.2.115' },
    vitD: { t: 'Intestinal absorption of vitamin D: a systematic review', j: 'Nutr Rev', y: 2018, pmid: '29025082', doi: '10.1093/nutrit/nux034' },
    levoTiming: { t: 'Comparative efficacy of early morning versus bedtime administration of levothyroxine in children with hypothyroidism', j: 'Pediatr Endocrinol Diabetes Metab', y: 2021, pmid: '34008397', doi: '10.5114/pedm.2021.105635' },
    metforminB12: { t: 'Long-term Metformin Use and Vitamin B12 Deficiency in the Diabetes Prevention Program Outcomes Study', j: 'J Clin Endocrinol Metab', y: 2016, pmid: '26900641', doi: '10.1210/jc.2015-3754' },
    handAntisepsis: { t: 'Surgical hand antisepsis to reduce surgical site infection', j: 'Cochrane Database Syst Rev', y: 2016, pmid: '26799160', doi: '10.1002/14651858.CD004288.pub3' },
    mriFerro: { t: 'Magnetic Resonance Imaging of Patients With Retained Ballistic Projectiles: A Review of Ferromagnetism, Ammunition Composition, and Safety Protocols', j: 'J Magn Reson Imaging', y: 2026, pmid: '41517918', doi: '10.1002/jmri.70199' },
  };
  function sourcesNode(keys) {
    const box = document.createElement('div');
    box.className = 'sources';
    const h = document.createElement('div');
    h.className = 'src-title'; h.textContent = '📚 Kaynak (PubMed)';
    box.appendChild(h);
    (keys || []).forEach((k) => {
      const s = SOURCES[k];
      if (!s) return;
      const a = document.createElement('a');
      a.href = s.doi ? 'https://doi.org/' + s.doi : 'https://pubmed.ncbi.nlm.nih.gov/' + s.pmid + '/';
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = `${s.t}. ${s.j}, ${s.y}. ${s.doi ? 'DOI: ' + s.doi : 'PMID: ' + s.pmid}`;
      box.appendChild(a);
    });
    return box;
  }

  // Ameliyat gerektiren ve görüntüleme gerektiren acil senaryolar
  ER.push(
    { id: 'appendicitis', name: 'Deniz Kara', age: 24, sex: 'E', complaint: 'Göbek çevresinden başlayıp sağ alt karına kayan ağrı, bulantı, hafif ateş', vitals: { pulse: 104, bp: '122/78', spo2: 98, temp: 38.2, mind: 'Açık, ağrılı' }, need: 'iv', time: 75,
      why: 'Sağ alt karın ağrısı, bulantı ve ateş akut apandisiti düşündürür: damar yolu, sıvı ve ağrı kontrolünün ardından cerrahi değerlendirme gerekir.',
      surgery: { name: 'Apendektomi (laparoskopik)', lesson: 'Akut apandisit tanısında klinik bulgular, kan değerleri ve görüntüleme birlikte değerlendirilir; tedavi çoğunlukla cerrahidir. Ameliyat öncesi açlık süresinin sorgulanması ve güvenlik kontrol listesi komplikasyon riskini azaltır.' },
      sources: ['appendicitis', 'surgicalChecklist'] },
    { id: 'hipfx', name: 'Saadet Öz', age: 82, sex: 'K', complaint: 'Evde düşme sonrası sol kalçada ağrı, bacakta kısalma ve dışa dönme', vitals: { pulse: 98, bp: '145/80', spo2: 95, temp: 36.6, mind: 'Açık, ağrılı' }, need: 'monitor', time: 80,
      why: 'Yaşlı hastada düşme sonrası kalça kırığı: ağrı kontrolü, yaşamsal bulgu izlemi ve düşmeye yol açabilecek nedenlerin (ritim bozukluğu, ilaçlar) araştırılması gerekir.',
      surgery: { name: 'Kalça kırığı tespiti', lesson: 'Yaşlılarda kalça kırığı ciddi bir durumdur; ağrı kontrolü, deliryumun önlenmesi ve uygun ameliyat zamanlaması önemlidir. Araştırmalar ameliyat zamanlamasının sonuçlara etkisini farklı bulabilmektedir; karar hastanın genel durumuna göre verilir.' },
      sources: ['hipfxInjury', 'hipfx48'] },
  );
  const byId = (id) => H0().ER_TYPES.find((x) => x.id === id) || ER.find((x) => x.id === id);
  const H0 = () => VH.hospital;

  // ---------------------------------------------------------------- Kayıt
  VH.cases.CASES.push(...CASES);
  const H = VH.hospital;
  H.ER_TYPES.push(...ER);
  Object.assign(H.RX, RX);
  Object.assign(H.ER_RX, { copd: 'koah', pneumonia: 'antibiyotik', co: 'karbon', sepsis: 'antibiyotik', bleed: 'sevk', stroke: 'inme', electric: 'sevk' });
  Object.assign(H.CASE_RX, { c15: 'sevk', c16: 'sevk', c17: 'sevk', c18: 'sevk', c19: 'laktoz', c20: 'sevk', c21: 'kafein', c22: 'gut' });

  // Mevcut senaryolara cerrahi / görüntüleme bağlantısı ve kaynaklar
  Object.assign(byId('trauma'), { surgery: { name: 'Kırık tespiti (ortopedik cerrahi)', lesson: 'Uzun kemik kırığında kanama ve dolaşım izlenir; tespit ameliyatından önce ekipçe güvenlik kontrol listesi uygulanır. Kontrol listesi kullanımı ameliyat komplikasyonlarını azaltmıştır.' }, sources: ['surgicalChecklist'] });
  Object.assign(byId('stroke'), { imaging: 'mri', sources: ['stroke'], imagingFinding: 'Beyin görüntülemesinde kanama izlenmedi; bulgular akut iskemik inmeyle uyumlu. Nöroloji ekibi zamana duyarlı tedavi kararını değerlendiriyor: belirtilerin başlangıç saati kritik bilgidir.' });
  Object.assign(byId('co'), { sources: ['coPoisoning'] });
  Object.assign(byId('sepsis'), { sources: ['sepsis'] });
  const cs = (id) => VH.cases.CASES.find((c) => c.id === id);
  if (cs('c15')) cs('c15').sources = ['osa'];
  if (cs('c18')) cs('c18').sources = ['celiacESsCD', 'celiacACG'];
  if (cs('c20')) cs('c20').sources = ['deliriumUTI'];
  if (cs('c17')) cs('c17').imagingFinding = 'EKG\'de sol ventrikül hipertrofisini düşündüren bulgular; göz dibi muayenesinde damar değişiklikleri. Tansiyon tedavisinin yeniden düzenlenmesi gerekiyor.';
  if (cs('c21')) cs('c21').imagingFinding = '24 saatlik ritim kaydında tehlikeli bir ritim bozukluğu saptanmadı; kafeinle ilişkili ek atımlar izlendi.';
  if (cs('c04')) cs('c04').imagingFinding = 'Kemik yoğunluğu ölçümü düşük kemik kütlesiyle uyumlu; düşme önleme ve tedavi planı geriatri ile yapılmalı.';

  H.RX.antikoagulan = { name: 'Kan sulandırıcı (varfarin) bilgilendirmesi', sources: ['warfarin'], opts: [['Her gün aynı saatte alın, INR kontrollerine gidin; yeni ilaç, bitkisel ürün ya da takviyeye başlamadan hekime danışın, yeşil yapraklı sebze miktarını aniden değiştirmeyin.', true], ['Kanama olmadıkça bitkisel çay ve takviyelerin bir etkisi olmaz.', false], ['Unuttuğunuz dozu ertesi gün iki doz birden alarak telafi edin.', false]] };
  Object.assign(H.ER_RX, { arrhythmia: 'antikoagulan', appendicitis: 'antibiyotik', hipfx: 'agri' });
  // PubMed destekli eczane bilgilendirmeleri
  H.RX.metformin = { name: 'Metformin bilgilendirmesi (hekim reçetesiyle)', sources: ['metforminB12'], opts: [['Yemekle birlikte alın; mide şikâyeti olursa hekime söyleyin. Uzun süreli kullanımda B12 düzeyiniz düzenli kontrol edilmeli.', true], ['Kan şekeri iyi gelince ilacı kendi kendinize bırakın.', false], ['Aç karnına ve öğün atlayarak alın, daha etkili olur.', false]] };
  H.RX.ppi = { name: 'Mide koruyucu (PPI) bilgilendirmesi', sources: ['ppiLong'], opts: [['Hekiminizin belirlediği süre kadar kullanın; gerekçe olmadan yıllarca sürdürmeyin. Uzun kullanımda B12, magnezyum gibi eksiklikler açısından kontrol edilin.', true], ['Zararsızdır, ömür boyu her gün kullanabilirsiniz.', false], ['Her yemekten sonra iki tane birden alın.', false]] };
  H.RX.levotiroksin = { name: 'Tiroid hormonu (levotiroksin) bilgilendirmesi', sources: ['levoTiming'], opts: [['Her gün aynı şekilde ve aynı saatte alın (genellikle aç karnına); zamanlamayı hekiminizle belirleyin, kontrol tahlillerini aksatmayın.', true], ['Kendinizi iyi hissettiğiniz günler atlayabilirsiniz.', false], ['Demir ve kalsiyum takviyesiyle aynı anda yutun.', false]] };
  if (H.RX.demir) H.RX.demir.sources = ['ironAlt'];
  if (H.RX.dvit) H.RX.dvit.sources = ['vitD'];
  if (H.RX.inhaler) H.RX.inhaler.sources = ['inhalerErrors'];
  if (H.RX.koah) H.RX.koah.sources = ['inhalerErrors'];
  Object.assign(H.CASE_RX, { c08: 'metformin', c10: 'levotiroksin', c11: 'ppi' });

  VH.content = { cases: CASES.length, er: ER.length, rx: Object.keys(RX).length, SOURCES, sourcesNode };
})();

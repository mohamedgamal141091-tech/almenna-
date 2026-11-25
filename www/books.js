'use strict';
/* المنة 2.1.0 — كتب أسباب النزول والقراءات والإعراب ومعاني القرآن.
   ما له slug يُحمّل سورةً سورة من مستودع tafsir_api المفتوح (مثل كتب التفسير).
   وما له qp يُجلب آيةً آية من موقع قرآنبيديا ويُحفظ على الجهاز. */
(function (root) {
  const CATS = {
    asbab: 'أسباب النزول',
    qiraat: 'القراءات القرآنية',
    irab: 'إعراب القرآن',
    maani: 'معاني القرآن وغريبه',
  };
  const INTRO = {
    asbab: 'ما رُوي في سبب نزول الآية، منقولًا بنصه من كتب أسباب النزول. وليس لكل آية سبب نزول، فإذا لم يذكر الكتاب شيئًا عند الآية فهذا هو الغالب في القرآن.',
    qiraat: 'القراءات الواردة في كلمات الآية ومن قرأ بها، منقولة بنصها من كتب القراءات.',
    irab: 'إعراب كلمات الآية منقولًا بنصه من كتب إعراب القرآن.',
    maani: 'معاني الكلمات الغريبة في الآية، والمعنى الإجمالي لها، منقولة بنصها من كتب معاني القرآن وغريبه.',
  };
  const B = (o) => Object.assign({ kind: 'tafsir', author: '' }, o, o.slug ? { branch: 'main' } : {});
  const EXTRA = [
    // أسباب النزول
    B({ key: 'qp2919', qp: 2919, cat: 'asbab', title: 'أسباب نزول القرآن', short: 'الواحدي', author: 'الإمام أبو الحسن علي بن أحمد الواحدي النيسابوري (ت 468 هـ)' }),
    B({ key: 'qp460', qp: 460, cat: 'asbab', title: 'المحرر في أسباب نزول القرآن من خلال الكتب التسعة', short: 'المزيني', author: 'د. خالد بن سليمان المزيني' }),
    // القراءات
    B({ key: 'nashr', slug: 'al-nashr-li-ibn-al-jazari', cat: 'qiraat', title: 'النشر في القراءات العشر', short: 'ابن الجزري', author: 'الإمام شمس الدين محمد بن محمد ابن الجزري (ت 833 هـ)' }),
    B({ key: 'qiraatmaws', slug: 'al-qira-at-al-mawsoo-ah-al-qur-aniyyah', cat: 'qiraat', title: 'القراءات', short: 'الموسوعة القرآنية', author: 'من الموسوعة القرآنية' }),
    B({ key: 'durrmasun', slug: 'al-dur-al-masun-lil-samin-al-halabi', cat: 'qiraat', also: 'irab', title: 'الدر المصون في علوم الكتاب المكنون', short: 'السمين الحلبي', author: 'الإمام أحمد بن يوسف المعروف بالسمين الحلبي (ت 756 هـ)' }),
    // الإعراب
    B({ key: 'darwish', slug: 'i-rab-al-quran-li-al-darwish', cat: 'irab', title: 'إعراب القرآن وبيانه', short: 'الدرويش', author: 'محيي الدين الدرويش' }),
    B({ key: 'daas', slug: 'alrab-al-quran-li-da-as', cat: 'irab', title: 'إعراب القرآن الكريم', short: 'الدعاس', author: 'أحمد عبيد الدعاس وزميلاه' }),
    B({ key: 'irabmuyassar', slug: 'al-i-rab-al-muyassar', cat: 'irab', title: 'الإعراب الميسر', short: 'الإعراب الميسر' }),
    B({ key: 'jadwal', slug: 'al-jadwal-fi-i-rab-al-quran', cat: 'irab', title: 'الجدول في إعراب القرآن', short: 'محمود صافي', author: 'محمود بن عبد الرحيم صافي' }),
    B({ key: 'qp318', qp: 318, cat: 'irab', title: 'إعراب القرآن', short: 'النحاس', author: 'أبو جعفر أحمد بن محمد النحاس (ت 338 هـ)' }),
    B({ key: 'qp180', qp: 180, cat: 'irab', title: 'المجتبى من مشكل إعراب القرآن الكريم', short: 'الخراط', author: 'د. أحمد بن محمد الخراط' }),
    // معاني القرآن وغريبه
    B({ key: 'siraj', slug: 'asseraj-fi-bayan-gharib-alquran', cat: 'maani', title: 'السراج في بيان غريب القرآن', short: 'السراج', author: 'د. محمد بن عبد العزيز الخضيري' }),
    B({ key: 'muyassargharib', slug: 'al-muyassar-fi-al-gharib', cat: 'maani', title: 'الميسر في غريب القرآن', short: 'الميسر في الغريب' }),
    B({ key: 'tahlil', slug: 'tahlil-kalimat-al-qur-an', cat: 'maani', title: 'تحليل كلمات القرآن', short: 'تحليل الكلمات' }),
    B({ key: 'muyassar', slug: 'ar-tafsir-muyassar', cat: 'maani', title: 'التفسير الميسر (المعنى الإجمالي للآية)', short: 'التفسير الميسر', author: 'نخبة من العلماء، مجمع الملك فهد لطباعة المصحف الشريف' }),
    B({ key: 'qp351', qp: 351, cat: 'maani', title: 'معاني القرآن', short: 'الفراء', author: 'أبو زكريا يحيى بن زياد الفراء (ت 207 هـ)' }),
  ];
  const api = { CATS, INTRO, EXTRA };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BOOKS21 = api;
})(this);

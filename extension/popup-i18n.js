export const translations = {
  ar: {
    appName:'تاباتي',tagline:'سيب التبويب. هيتحفظ في نوشن.',running:'شغال',stopped:'متوقف',
    connected:'نوشن متصل',connectFirst:'اربط نوشن الأول',enable:'تشغيل',pause:'إيقاف مؤقت',
    autoSave:'الحفظ التلقائي',idleLabel:'بعد كام دقيقة؟',minutes:'دقيقة خمول',saveMinutes:'حفظ المدة',
    connectHeading:'ربط نوشن — مرة واحدة',connectHint:'اعمل تكامل خاص وشاركه مع قاعدة الأرشيف.',
    tokenLabel:'مفتاح التكامل',tokenPlaceholder:'الصق المفتاح هنا',connectButton:'اربط نوشن',
    integrationsLink:'إنشاء تكامل نوشن',archiveHeading:'الأرشيف',openNotion:'افتح نوشن',
    searchPlaceholder:'دور في آخر المحفوظات...',searchLabel:'بحث في آخر المحفوظات',
    rulesHeading:'الاستثناءات والتصنيفات',excludedLabel:'مواقع متتحفظش (موقع في كل سطر)',
    rulesLabel:'تصنيف مخصص (موقع=تصنيف)',rulesPlaceholder:'example.com=برمجة',
    categoriesHint:'التصنيفات: برمجة، ذكاء اصطناعي، دين، تصميم، شغل، أخرى',
    saveRules:'حفظ القواعد',disconnect:'فصل نوشن',empty:'مفيش روابط هنا لسه',
    saved:'اتحفظ',pending:n=>`فيه ${n} محاولة حفظ هتتكرر`,language:'English',switchLabel:'Switch to English',
    oldHeading:'التبويبات القديمة',oldWarning:'مش هنضم أي تبويب قديم تلقائيًا. عاين العدد الأول، وبعدين ضم ١٠ في كل مرة. كل تبويب يستنى مدة الخمول من جديد، ومش هيتقفل إلا بعد حفظ نوشن.',
    previewOld:'معاينة القديم',importOld:'ضم أول ١٠ تبويبات',oldCount:n=>`${n} تبويب ممكن يتضم (قبل فحص النماذج).`,
    oldImported:(n,r)=>`اتضم ${n} تبويب بأمان. متبقي للمعاينة ${r}. التبويبات المحمية هتفضل مفتوحة.`,
    oldDenied:'لازم توافق على صلاحية المواقع عشان نفحص التبويبات القديمة من غير إعادة تحميلها.',
  },
  en: {
    appName:'Tabati',tagline:'Keep the link. Free up your tabs.',running:'Running',stopped:'Paused',
    connected:'Notion connected',connectFirst:'Connect Notion first',enable:'Enable',pause:'Pause',
    autoSave:'Auto-archive',idleLabel:'Archive after how long?',minutes:'minutes idle',saveMinutes:'Save idle time',
    connectHeading:'Connect Notion — one time',connectHint:'Create a private integration and grant access to the archive.',
    tokenLabel:'Integration token',tokenPlaceholder:'Paste your token here',connectButton:'Connect Notion',
    integrationsLink:'Notion integrations',archiveHeading:'Your archive',openNotion:'Open Notion',
    searchPlaceholder:'Search recent archives...',searchLabel:'Search recent archives',
    rulesHeading:'Exclusions & categories',excludedLabel:'Never archive these domains (one per line)',
    rulesLabel:'Custom categories (domain=category)',rulesPlaceholder:'example.com=Programming',
    categoriesHint:'Categories: Programming, AI, Religion, Design, Work, Other',
    saveRules:'Save rules',disconnect:'Disconnect Notion',empty:'No archived links yet',
    saved:'Saved',pending:n=>`${n} archive attempts waiting to retry`,language:'العربية',switchLabel:'التبديل إلى العربية',
    oldHeading:'Existing tabs',oldWarning:'Existing tabs are never enrolled automatically. Preview first, then enroll 10 at a time. Each gets a fresh idle countdown; tabs close only after Notion confirms the save.',
    previewOld:'Preview existing tabs',importOld:'Enroll next 10',oldCount:n=>`${n} possible tabs (before unsaved-form checks).`,
    oldImported:(n,r)=>`Safely enrolled ${n}. ${r} remain for review. Protected tabs stay open.`,
    oldDenied:'Grant optional site access to inspect existing tabs without reloading them.',
  },
};

const englishCategories = {
  'برمجة':'Programming','ذكاء اصطناعي':'AI','دين':'Religion',
  'تصميم':'Design','شغل':'Work','أخرى':'Other',
};
export function categoryLabel(category, locale) {
  return locale === 'en' ? englishCategories[category] || category : category;
}
export function errorLabel(error, locale) {
  if (locale !== 'en') return error;
  const match = /^نوشن: خطأ (\d+)$/.exec(error || '');
  if (match) return `Notion error ${match[1]}`;
  return ({'فشل الاتصال بنوشن':'Could not reach Notion',
    'نوشن لم يؤكد الحفظ':'Notion did not confirm the save',
    'صلاحيات قاعدة الأرشيف ناقصة':'Archive database permissions are missing',
    'مفتاح نوشن غير صالح':'Invalid Notion token',
    'اربط نوشن الأول':'Connect Notion first',
    'المدة من ١ إلى ١٢٠ دقيقة':'Choose 1 to 120 minutes',
    'قائمة الاستثناءات غير صالحة':'Invalid exclusion list',
    'حصل خطأ':'Something went wrong'})[error] || error;
}

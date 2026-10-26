export const DATA_SOURCE_ID = 'af3460cb-e50f-4799-af0e-bc5a72169e52';
export const ARCHIVE_URL = 'https://app.notion.com/p/317f30f5a9cf4e3ea7a8ed034b91e3c1';
export const PROJECT_URL = 'https://app.notion.com/p/40573001a837813f9e18e4d7d81b7825';
export const DEFAULT_EXCLUDES = [
  'notion.so', 'notion.site', 'notion.com', 'chatgpt.com', 'openai.com',
  'mail.google.com', 'docs.google.com', 'drive.google.com',
  'calendar.google.com', 'accounts.google.com', 'admin.docmagdy.coderaai.com',
  'wahba.coderaai.com', 'outlook.cloud.microsoft', 'outlook.office.com',
  'outlook.office365.com', 'outlook.live.com', 'mail.yahoo.com',
  'mail.proton.me', 'icloud.com', 'accounts.microsoft.com', 'account.microsoft.com',
];
export const CATEGORIES = ['برمجة', 'ذكاء اصطناعي', 'دين', 'تصميم', 'شغل', 'أخرى'];
const ENGLISH_CATEGORIES = {programming:'برمجة',ai:'ذكاء اصطناعي',religion:'دين',design:'تصميم',work:'شغل',other:'أخرى'};

const authPath = /\/(?:login|log-in|signin|sign-in|signup|sign-up|auth|oauth|account|accounts|settings|profile|billing|checkout|payment|payments|wallet|inbox|compose|admin|cart|edit|customers?|orders?|invoices?|transactions?|payments?|dashboard|crm|inventory|pos|payroll|cases|verify)(?:\/|\?|$)/i;
const sensitiveParam = /(?:^|[&#?])(?:access_token|refresh_token|id_token|token|jwt|api_?key|secret|password|passwd|session|sessionid|sid|code|auth|authorization|signature|sig|private_key|client_secret|csrf|nonce|ticket)=/i;
const sensitiveSubdomain = /^(?:mail|accounts?|login|auth|admin|dashboard|portal|secure|banking)\./i;
const trackers = new Set(['fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid']);

export function domainMatches(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isSafeUrl(value, excludes = []) {
  if (typeof value !== 'string' || value.length > 1900) return false;
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    if (sensitiveSubdomain.test(host) || host.startsWith('wahba.')) return false;
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return false;
    if (/^(?:127\.|10\.|192\.168\.|0\.|169\.254\.)/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^\[?(?:::1|fc[0-9a-f:]+|fd[0-9a-f:]+|fe80:)/i.test(host)) return false;
    if (authPath.test(u.pathname) || sensitiveParam.test(`${u.search}${u.hash}`)) return false;
    if ([...DEFAULT_EXCLUDES, ...excludes].some(d => domainMatches(host, String(d).trim().toLowerCase().replace(/^\*\./, '')))) return false;
    return true;
  } catch { return false; }
}

export function canonicalUrl(value) {
  const u = new URL(value);
  for (const key of [...u.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || trackers.has(key.toLowerCase())) u.searchParams.delete(key);
  }
  return u.toString();
}

export function parseDomainRules(raw = '') {
  const out = {};
  for (const line of String(raw).split(/\r?\n/)) {
    const [domain, category, ...rest] = line.split('=').map(s => s.trim());
    const normalized = CATEGORIES.includes(category) ? category : ENGLISH_CATEGORIES[category?.toLowerCase()];
    if (rest.length || !domain || !normalized || !/^[\w.-]+\.[a-z]{2,}$/i.test(domain)) continue;
    out[domain.toLowerCase()] = normalized;
  }
  return out;
}

export function classify(url, title = '', rules = {}) {
  const {hostname, pathname} = new URL(url);
  const host = hostname.toLowerCase();
  const text = `${host} ${title}`.toLowerCase();
  const youtube = domainMatches(host, 'youtube.com') || host === 'youtu.be';
  const type = youtube ? 'يوتيوب' : /\/articles?\/|\/blog\/|\/posts?\/|\/wiki\//i.test(pathname) ? 'مقال' : 'موقع';
  let category = 'أخرى';
  const override = Object.entries(rules).find(([domain]) => domainMatches(host, domain.toLowerCase()));
  if (override && CATEGORIES.includes(override[1])) category = override[1];
  else if (/quran|islam|hadith|sunnah|تفسير|قرآن|حديث|الدين|الإسلام|القران/.test(text)) category = 'دين';
  else if (/github|stackoverflow|developer|javascript|typescript|python|react|code|برمجة|programming|coding/.test(text)) category = 'برمجة';
  else if (/artificial intelligence|\bai\b|gemini|openai|anthropic|deepseek|llm|ذكاء اصطناعي|نموذج/.test(text)) category = 'ذكاء اصطناعي';
  else if (/figma|behance|dribbble|canva|design|تصميم|مونتاج/.test(text)) category = 'تصميم';
  const tags = youtube ? ['مشاهدة لاحقًا'] : category === 'أخرى' ? ['بحث'] : ['تعليم'];
  return {type, category, tags};
}

export function canArchive(tab, record, now, minutes, excludes = [], dirty = false) {
  return Boolean(record && tab && Number.isInteger(tab.id) && !tab.active && !tab.pinned && !tab.audible && !tab.incognito && !dirty &&
    tab.url === record.url && typeof record.at === 'number' && now - record.at >= Math.max(1, minutes) * 60_000 &&
    isSafeUrl(tab.url, excludes));
}

export function notionPage(snapshot, labels, dataSourceId = DATA_SOURCE_ID) {
  return {
    parent: {type:'data_source_id', data_source_id:dataSourceId},
    properties: {
      'العنوان': {title:[{text:{content:String(snapshot.title || snapshot.url).slice(0, 2000)}}]},
      'الرابط': {url:snapshot.url},
      'النوع': {select:{name:labels.type}},
      'التصنيف': {select:{name:labels.category}},
      'الوسوم': {multi_select:labels.tags.map(name => ({name}))},
      'آخر استخدام': {date:{start:new Date(snapshot.at).toISOString()}},
    },
  };
}

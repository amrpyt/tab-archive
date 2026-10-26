import {ARCHIVE_URL, DATA_SOURCE_ID, DEFAULT_EXCLUDES, canonicalUrl, classify, isSafeUrl, canArchive, notionPage, parseDomainRules} from './core.js';

const KEY = 'tabArchiveV1';
const API = 'https://api.notion.com/v1';
const VERSION = '2025-09-03';
const defaults = () => ({
  config:{enabled:false, idleMinutes:5, token:'', excludes:[...DEFAULT_EXCLUDES], rules:''},
  tracked:{}, dirty:{}, pending:{}, recent:[], lastError:'',
});

export function createEngine({chrome, request = fetch, now = () => Date.now()}) {
  let queued = Promise.resolve();
  let scanning = false;

  async function read() {
    return (await chrome.storage.local.get(KEY))[KEY] || defaults();
  }
  function mutate(fn) {
    const task = queued.then(async () => {
      const state = await read();
      const result = fn(state);
      await chrome.storage.local.set({[KEY]:state});
      return result;
    });
    queued = task.catch(() => {});
    return task;
  }

  async function configure(update) {
    return mutate(s => {
      const cfg = s.config;
      if (update.token !== undefined) cfg.token = String(update.token).trim();
      if (update.idleMinutes !== undefined) {
        const number = Number(update.idleMinutes);
        if (!Number.isInteger(number) || number < 1 || number > 120) throw Error('المدة من ١ إلى ١٢٠ دقيقة');
        cfg.idleMinutes = number;
      }
      if (update.excludes !== undefined) {
        if (!Array.isArray(update.excludes) || update.excludes.length > 100) throw Error('قائمة الاستثناءات غير صالحة');
        cfg.excludes = [...new Set([...DEFAULT_EXCLUDES,...update.excludes.map(x=>String(x).trim().toLowerCase())
          .filter(x => /^(?:\*\.)?[a-z0-9.-]+\.[a-z]{2,}$/i.test(x))])];
      }
      if (update.rules !== undefined) cfg.rules = String(update.rules).slice(0, 5000);
      if (update.enabled !== undefined) {
        if (update.enabled && !cfg.token) throw Error('اربط نوشن الأول');
        cfg.enabled = Boolean(update.enabled);
      }
      return true;
    });
  }

  async function notion(token, path, body) {
    let response;
    try {
      response = await request(`${API}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers:{Authorization:`Bearer ${token}`, 'Notion-Version':VERSION, 'Content-Type':'application/json'},
        ...(body === undefined ? {} : {body:JSON.stringify(body)}),
      });
    } catch { throw Error('فشل الاتصال بنوشن'); }
    if (!response.ok) {
      const error = Error(`نوشن: خطأ ${response.status}`);
      const retry = Number(response.headers?.get('Retry-After'));
      error.retryMs = response.status === 429 && Number.isFinite(retry) && retry > 0 ? retry * 1000 : 60_000;
      throw error;
    }
    return response.json();
  }

  async function connect(token) {
    if (!/^((secret_|ntn_)[^\s]{8,})$/.test(String(token).trim())) throw Error('مفتاح نوشن غير صالح');
    const ds = await notion(String(token).trim(), `/data_sources/${DATA_SOURCE_ID}`);
    if (!ds.properties?.['العنوان'] || !ds.properties?.['الرابط']) throw Error('صلاحيات قاعدة الأرشيف ناقصة');
    await configure({token, enabled:false});
    return true;
  }

  async function status() {
    const s = await read();
    return {
      enabled:s.config.enabled, hasToken:Boolean(s.config.token), idleMinutes:s.config.idleMinutes,
      excludes:s.config.excludes, rules:s.config.rules, recent:s.recent.slice(0,30),
      pending:Object.keys(s.pending).length, lastError:s.lastError, archiveUrl:ARCHIVE_URL,
    };
  }

  async function observe(tab) {
    if (tab?.id === undefined) return;
    return mutate(s => {
      if (s.restoreProtectUntil > now()) return; // Restored Chrome tabs need an explicit activation.
      delete s.dirty[tab.id];
      delete s.pending[tab.id];
      if (isSafeUrl(tab.url, [])) s.tracked[tab.id] = {url:tab.url, at:now()};
      else if (!tab.url) s.tracked[tab.id] = {url:null, at:now()}; // New background tab, URL not set yet.
      else delete s.tracked[tab.id];
    });
  }
  async function update(tab) {
    if (tab?.id === undefined) return;
    return mutate(s => {
      if (!s.tracked[tab.id]) return; // Existing Chrome backlog never enrolls from background refresh.
      delete s.dirty[tab.id];
      delete s.pending[tab.id];
      s.tracked[tab.id] = {url:isSafeUrl(tab.url, []) ? tab.url : null, at:now()};
    });
  }
  async function activate(tab) {
    if (tab?.id === undefined) return;
    return mutate(s => {
      delete s.pending[tab.id];
      if (isSafeUrl(tab.url, [])) s.tracked[tab.id] = {url:tab.url, at:now()};
      else delete s.tracked[tab.id];
      // Do NOT reset dirty: user can return to an unsaved form and leave again.
    });
  }
  async function markDirty(tabId) {
    return mutate(s => {s.dirty[tabId]=true;});
  }
  async function forgetTab(tabId) {
    return mutate(s => {delete s.tracked[tabId];delete s.dirty[tabId];delete s.pending[tabId];});
  }
  async function restart() {
    // Tab IDs can be reused after browser restart. Old pending is kept but not auto-closed.
    return mutate(s => {s.tracked={};s.dirty={};s.restoreProtectUntil=now()+120_000;});
  }

  async function isClean(tabId) {
    try {
      const reply = await chrome.tabs.sendMessage(tabId, {type:'IS_DIRTY'});
      return reply?.dirty === false;
    } catch { return false; } // No guard script -> no auto-close.
  }

  async function syncedUrl(token, url, snapshot, cfg) {
    const existing = await notion(token, `/data_sources/${DATA_SOURCE_ID}/query`, {
      filter:{property:'الرابط',url:{equals:url}},page_size:1,
    });
    if (existing.results?.length) return existing.results[0].id;
    const labels = classify(url, snapshot.title, parseDomainRules(cfg.rules));
    const created = await notion(token, '/pages', notionPage({...snapshot,url},labels));
    if (!created?.id) throw Error('نوشن لم يؤكد الحفظ');
    return created.id;
  }

  async function process(tab, record, cfg) {
    if (!await isClean(tab.id)) return;
    const before = await read();
    if (!canArchive(tab, before.tracked[tab.id], now(), cfg.idleMinutes, cfg.excludes, Boolean(before.dirty[tab.id]))) return;
    const url = canonicalUrl(tab.url);
    const snapshot = {url, title:tab.title || url, at:record.at};
    // Persist intent BEFORE network write: process crash cannot erase the attempt.
    await mutate(s => {s.pending[tab.id] = {url:tab.url,nextAt:0};});
    let notionId;
    try {
      notionId = await syncedUrl(cfg.token, url, snapshot, cfg);
    } catch(e) {
      await mutate(s=>{
        s.pending[tab.id] = {url:tab.url,nextAt:now()+(e.retryMs || 60_000)};
        s.lastError = e.message || 'فشل الحفظ';
      });
      return;
    }
    // Durable local ack before any potential destructive action.
    await mutate(s=>{
      delete s.pending[tab.id];
      s.lastError='';
      s.recent = [{url, title:snapshot.title, category:classify(url,snapshot.title,parseDomainRules(cfg.rules)).category, pageId:notionId, at:now()},
        ...s.recent.filter(x=>x.url!==url)].slice(0,50);
    });
    if (!await isClean(tab.id)) return;
    const state = await read();
    let fresh;
    try {fresh = await chrome.tabs.get(tab.id);} catch {return;}
    if (!state.config.enabled || !canArchive(fresh, state.tracked[tab.id], now(), state.config.idleMinutes,
      state.config.excludes, Boolean(state.dirty[tab.id])) || fresh.url !== tab.url || state.tracked[tab.id]?.at !== record.at) return;
    // No await between final eligibility check and remove call.
    try {await chrome.tabs.remove(tab.id);await forgetTab(tab.id);} catch { /* saved in Notion; leave tab */ }
  }

  async function scan() {
    if (scanning) return;
    scanning = true;
    try {
      const s = await read();
      if (!s.config.enabled || !s.config.token) return;
      const tabs = await chrome.tabs.query({});
      const eligible = tabs.filter(tab => canArchive(tab, s.tracked[tab.id], now(), s.config.idleMinutes,
        s.config.excludes, Boolean(s.dirty[tab.id])) &&
        !(s.pending[tab.id]?.url === tab.url && s.pending[tab.id]?.nextAt > now()));
      for (const tab of eligible.slice(0,3)) {
        const fresh = await read();
        if (!fresh.config.enabled) break;
        await process(tab, fresh.tracked[tab.id], fresh.config);
      }
    } finally {scanning=false;}
  }

  return {configure,connect,status,observe,update,activate,markDirty,forgetTab,restart,scan};
}

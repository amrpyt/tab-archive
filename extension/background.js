import {createEngine} from './engine.js';

const engine=createEngine({chrome});
const ALARM='tab-archive-check';

async function boot() {
  // Hide Notion token from content scripts, even those in trusted websites.
  await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  // Session storage survives MV3 worker naps, but resets on Chrome restart.
  const marker = await chrome.storage.session.get('tabArchiveSessionStarted');
  if (!marker.tabArchiveSessionStarted) {
    await engine.restart(); // Never trust old tab IDs after a browser restart.
    await chrome.storage.session.set({tabArchiveSessionStarted:true});
  }
  await chrome.alarms.create(ALARM,{periodInMinutes:1});
}

const ready = boot();
ready.catch(()=>{});
chrome.runtime.onInstalled.addListener(() => {boot().catch(()=>{});});
chrome.runtime.onStartup.addListener(() => {
  boot().catch(()=>{});
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name===ALARM) ready.then(()=>engine.scan()).catch(()=>{});
});
chrome.tabs.onCreated.addListener(tab => ready.then(()=>engine.observe(tab)).catch(()=>{}));
chrome.tabs.onActivated.addListener(({tabId}) => {
  ready.then(()=>chrome.tabs.get(tabId)).then(tab=>engine.activate(tab)).catch(()=>{});
});
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.url || change.status==='loading') ready.then(()=>engine.update(tab)).catch(()=>{});
});
chrome.tabs.onRemoved.addListener(tabId => ready.then(()=>engine.forgetTab(tabId)).catch(()=>{}));

chrome.runtime.onMessage.addListener((message,sender,respond) => {
  const trustedPopup = sender.id===chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL('popup.html'));
  // Content frames can ONLY mark a tab dirty, never read configuration or secrets.
  if (!trustedPopup && sender.tab) {
    if (message?.type==='DIRTY') ready.then(()=>engine.markDirty(sender.tab.id)).then(()=>respond({ok:true})).catch(()=>respond({ok:false}));
    else respond({ok:false});
    return true;
  }
  if (!trustedPopup) return false;
  const commands = {
    STATUS: () => engine.status(),
    CONNECT: () => engine.connect(message.token),
    CONFIGURE: () => engine.configure(message.settings || {}),
    PREVIEW_BACKLOG: () => engine.previewBacklog(),
    ENROLL_BACKLOG: () => engine.enrollBacklog(),
    SCAN: () => engine.scan(),
    DISCONNECT: () => engine.configure({token:'',enabled:false}),
  };
  const command=commands[message?.type];
  if (!command) {respond({ok:false,error:'طلب غير معروف'});return false;}
  ready.then(command).then(data=>respond({ok:true,data})).catch(e=>respond({ok:false,error:e.message || 'حصل خطأ'}));
  return true;
});

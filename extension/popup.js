import {translations, categoryLabel, errorLabel} from './popup-i18n.js';

const el = id => document.getElementById(id);
let state={recent:[]};
let oldPreview=null;
let locale='ar';
const t = key => translations[locale][key];
async function ask(type, extra={}) {
  const reply=await chrome.runtime.sendMessage({type,...extra});
  if(!reply?.ok) throw Error(reply?.error || 'حصل خطأ');
  return reply.data;
}
function message(text='',error=false) {el('feedback').textContent=error?errorLabel(text,locale):text;el('feedback').style.color=error?'#ab4239':'#147563';}
function translateStatic() {
  document.documentElement.lang=locale;
  document.documentElement.dir=locale==='ar'?'rtl':'ltr';
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent=t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder=t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll('[data-i18n-aria-label]')) node.setAttribute('aria-label',t(node.dataset.i18nAriaLabel));
  el('language').textContent=t('language');
  el('language').setAttribute('aria-label',t('switchLabel'));
  el('language').title=t('switchLabel');
}
function renderStatus() {
  el('badge').textContent=state.enabled?t('running'):t('stopped');
  el('connection').textContent=state.hasToken?t('connected'):t('connectFirst');
  el('enable').disabled=!state.hasToken;
  el('enable').textContent=state.enabled?t('pause'):t('enable');
  el('pending').textContent=state.pending?t('pending')(state.pending):'';
  if(state.lastError) message(state.lastError,true);
  el('importOld').disabled=!state.enabled || !oldPreview?.eligible;
}
function render() {
  renderStatus();
  el('idle').value=state.idleMinutes;
  el('setup').hidden=state.hasToken;
  el('excluded').value=(state.excludes||[]).join('\n');
  el('rules').value=state.rules||'';
  el('archive').href=state.archiveUrl;
  renderRecent();
}
function renderRecent() {
  const needle=el('search').value.trim().toLocaleLowerCase();
  const rows=(state.recent||[]).filter(r=>`${r.title} ${r.url} ${r.siteName||''} ${r.description||''} ${r.category} ${categoryLabel(r.category,locale)}`.toLocaleLowerCase().includes(needle));
  const list=el('recent');list.replaceChildren();
  for(const item of rows.slice(0,15)) {
    const line=document.createElement('div');line.className='item';line.role='listitem';
    const link=document.createElement('button');link.type='button';link.title=item.url;link.textContent=item.title || item.url;
    link.addEventListener('click',()=>chrome.tabs.create({url:item.url}));
    const tag=document.createElement('small');tag.textContent=categoryLabel(item.category,locale);
    const content=document.createElement('div');content.className='recent-text';content.append(link);
    if(item.description||item.siteName){const sub=document.createElement('small');sub.className='recent-description';sub.textContent=[item.siteName,item.description].filter(Boolean).join(' · ');content.append(sub);}
    line.append(content,tag);list.append(line);
  }
  if (!rows.length) {const p=document.createElement('small');p.textContent=t('empty');list.append(p);}
}
async function action(callback, showSuccess=true) {
  message();
  try {await callback();state=await ask('STATUS');render();if(showSuccess) message(t('saved'));}
  catch(e) {message(e.message,true);}
}
el('connect').addEventListener('click',()=>action(async()=>{
  await ask('CONNECT',{token:el('token').value.trim()});el('token').value='';
}));
el('enable').addEventListener('click',()=>action(()=>ask('CONFIGURE',{settings:{enabled:!state.enabled}})));
el('saveMinutes').addEventListener('click',()=>action(()=>ask('CONFIGURE',{settings:{idleMinutes:Number(el('idle').value)}})));
el('saveRules').addEventListener('click',()=>action(()=>ask('CONFIGURE',{settings:{excludes:el('excluded').value.split(/\r?\n/),rules:el('rules').value}})));
el('disconnect').addEventListener('click',()=>action(()=>ask('DISCONNECT')));
el('search').addEventListener('input',renderRecent);
el('previewOld').addEventListener('click',()=>action(async()=>{
  oldPreview=await ask('PREVIEW_BACKLOG');
  el('oldInfo').textContent=t('oldCount')(oldPreview.eligible);
  el('importOld').hidden=!oldPreview.eligible;
},false));
el('importOld').addEventListener('click',()=>action(async()=>{
  if(!state.enabled || !oldPreview?.eligible) return;
  const permitted=await chrome.permissions.request({origins:['http://*/*','https://*/*']});
  if(!permitted)throw Error(t('oldDenied'));
  const result=await ask('ENROLL_BACKLOG');
  oldPreview=await ask('PREVIEW_BACKLOG');
  el('oldInfo').textContent=t('oldImported')(result.enrolled,result.remaining);
  el('importOld').hidden=!oldPreview.eligible;
},false));
el('language').addEventListener('click',async()=>{
  locale=locale==='ar'?'en':'ar';
  await chrome.storage.local.set({tabArchiveLocale:locale});
  translateStatic();renderStatus();renderRecent();message();
  if(oldPreview)el('oldInfo').textContent=t('oldCount')(oldPreview.eligible);
});
Promise.all([chrome.storage.local.get('tabArchiveLocale'),ask('STATUS')]).then(([saved,value])=>{
  locale=saved.tabArchiveLocale==='en'?'en':'ar';
  state=value;translateStatic();render();
}).catch(e=>message(e.message,true));

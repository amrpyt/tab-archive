const el = id => document.getElementById(id);
let state={recent:[]};
async function ask(type, extra={}) {
  const reply=await chrome.runtime.sendMessage({type,...extra});
  if(!reply?.ok) throw Error(reply?.error || 'حصل خطأ');
  return reply.data;
}
function message(text='',error=false) {el('feedback').textContent=text;el('feedback').style.color=error?'#ab4239':'#147563';}
function render() {
  el('badge').textContent=state.enabled?'شغال':'متوقف';
  el('connection').textContent=state.hasToken?'نوشن متصل':'اربط نوشن الأول';
  el('enable').disabled=!state.hasToken;
  el('enable').textContent=state.enabled?'إيقاف مؤقت':'تشغيل';
  el('idle').value=state.idleMinutes;
  el('setup').hidden=state.hasToken;
  el('excluded').value=(state.excludes||[]).join('\n');
  el('rules').value=state.rules||'';
  el('archive').href=state.archiveUrl;
  el('pending').textContent=state.pending ? `فيه ${state.pending} محاولة حفظ هتتكرر` : '';
  if(state.lastError) message(state.lastError,true);
  renderRecent();
}
function renderRecent() {
  const needle=el('search').value.trim().toLocaleLowerCase();
  const rows=(state.recent||[]).filter(r=>`${r.title} ${r.category}`.toLocaleLowerCase().includes(needle));
  const list=el('recent');list.replaceChildren();
  for(const item of rows.slice(0,15)) {
    const line=document.createElement('div');line.className='item';line.role='listitem';
    const link=document.createElement('button');link.type='button';link.title=item.url;link.textContent=item.title || item.url;
    link.addEventListener('click',()=>chrome.tabs.create({url:item.url}));
    const tag=document.createElement('small');tag.textContent=item.category;
    line.append(link,tag);list.append(line);
  }
  if (!rows.length) {const p=document.createElement('small');p.textContent='مفيش روابط هنا لسه';list.append(p);}
}
async function action(callback) {
  message();
  try {await callback();state=await ask('STATUS');render();message('اتحفظ');}
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
ask('STATUS').then(value=>{state=value;render();}).catch(e=>message(e.message,true));

import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../extension/engine.js';

const sleep = () => new Promise(r => setImmediate(r));
function setup() {
  let time=1_000_000;
  let data={};
  const tabs=new Map();
  const removed=[];
  const calls=[];
  let dirty=false, legacyFrame=false, saveFails=false, rateLimited=false, ambiguous=false, onCreate=null, injectionFails=false;
  let metadata={title:'Metadata title',description:'A short article about JavaScript programming',siteName:'Developer Library',kind:'article',keywords:['javascript','programming']};
  const injected=[];
  const injectionTargets=[];
  const notion=new Map();
  const chrome={
    storage:{local:{get:async key=>({[key]:structuredClone(data[key])}),set:async obj=>{data={...data,...structuredClone(obj)};},setAccessLevel:async()=>{}}},
    tabs:{query:async()=>[...tabs.values()].map(x=>({...x})),get:async id=>{if (!tabs.has(id)) throw Error('No tab');return {...tabs.get(id)};},remove:async id=>{removed.push(id);tabs.delete(id);},sendMessage:async(id,msg)=>msg.type==='GET_METADATA'?{dirty:dirty || (legacyFrame && msg.legacy),metadata}:{dirty}},
    scripting:{executeScript:async opts=>{injected.push(opts.target.tabId);injectionTargets.push(opts.target);if(injectionFails) throw Error('host permission denied');return [{frameId:0}];}},
    permissions:{contains:async()=>true},
  };
  async function request(url,options={}) {
    calls.push({url,options});
    if(url.includes('/query')) {
      if(rateLimited) return {ok:false,status:429,headers:{get:()=> '90'},json:async()=>({message:'rate limited'})};
      const u=options.body && JSON.parse(options.body).filter.url.equals;
      return {ok:true,json:async()=>({results:notion.has(u)?[{id:notion.get(u)}]:[]})};
    }
    if(url.endsWith('/pages')) {
      if (onCreate) await onCreate();
      if(saveFails) return {ok:false,status:503,headers:{get:()=>null},json:async()=>({message:'offline'})};
      const u=JSON.parse(options.body).properties['الرابط'].url;
      notion.set(u, 'page-1');
      if(ambiguous) throw Error('timeout after save');
      return {ok:true,json:async()=>({id:'page-1'})};
    }
    if (url.includes('/data_sources/')) return {ok:true,json:async()=>({properties:{'العنوان':{type:'title'},'الرابط':{type:'url'}}})};
    throw Error('Unknown url '+url);
  }
  const engine=createEngine({chrome,request,now:()=>time});
  return {engine,chrome,tabs,removed,calls,notion,injected,injectionTargets,advance:ms=>{time+=ms;},setDirty:v=>{dirty=v;},setLegacyFrame:v=>{legacyFrame=v;},setMetadata:v=>{metadata=v;},setInjectionFails:v=>{injectionFails=v;},setSaveFails:v=>{saveFails=v;},setRateLimited:v=>{rateLimited=v;},setAmbiguous:v=>{ambiguous=v;},setOnCreate:v=>{onCreate=v;},getData:()=>data,sleep};
}
const tab=(id=1)=>({id,url:'https://example.com/docs',title:'Read me',active:false,pinned:false,audible:false,incognito:false});

test('untracked browser backlog stays open; tracked tab saves to Notion then closes', async()=>{
  const f=setup(); f.tabs.set(1,tab());
  await f.engine.configure({token:'secret_test',enabled:true});
  f.advance(360000);await f.engine.scan();assert.deepEqual(f.removed,[]);
  await f.engine.observe(tab());f.advance(301000);await f.engine.scan();
  assert.deepEqual(f.removed,[1]);assert.equal(f.notion.has('https://example.com/docs'),true);
  assert.equal(f.calls.at(-1).options.headers.Authorization,'Bearer secret_test');
  assert.equal((await f.engine.status()).hasToken,true);
  assert.equal(JSON.stringify(await f.engine.status()).includes('secret_test'),false);
});

test('Notion failure leaves tab open; retry works without duplicate',async()=>{
  const f=setup();f.tabs.set(1,tab());await f.engine.configure({token:'secret',enabled:true});
  await f.engine.observe(tab());f.advance(301000);f.setSaveFails(true);await f.engine.scan();
  assert.deepEqual(f.removed,[]);assert.equal((await f.engine.status()).pending,1);
  f.setSaveFails(false);f.advance(61000);await f.engine.scan();assert.deepEqual(f.removed,[1]);
  assert.equal(f.notion.size,1);
});

test('Notion 429 Retry-After prevents early re-request or tab close',async()=>{
  const f=setup();f.tabs.set(1,tab());await f.engine.configure({token:'secret',enabled:true});
  await f.engine.observe(tab());f.advance(301000);f.setRateLimited(true);await f.engine.scan();
  assert.equal(f.removed.length,0);
  const count=f.calls.length;
  f.advance(60000);await f.engine.scan();assert.equal(f.calls.length,count);
  f.setRateLimited(false);f.advance(31000);await f.engine.scan();assert.deepEqual(f.removed,[1]);
});

test('pending operation survives restart and is durable before Notion call',async()=>{
  const f=setup();f.tabs.set(1,tab());await f.engine.configure({token:'secret',enabled:true});
  await f.engine.observe(tab());f.advance(301000);
  f.setOnCreate(async()=>{
    const pending=f.getData().tabArchiveV1.pending;
    assert.equal(pending['1'].url,'https://example.com/docs');
  });
  await f.engine.scan();
  assert.deepEqual(f.removed,[1]);
  f.setOnCreate(null);
  const changed={...tab(),url:'https://example.com/other'};
  f.tabs.set(1,changed);await f.engine.observe(changed);f.setSaveFails(true);f.advance(301000);await f.engine.scan();
  await f.engine.restart();
  assert.equal((await f.engine.status()).pending,1);
  assert.deepEqual(f.getData().tabArchiveV1.tracked,{});
});

test('timeout after server save re-queries and does not create twice',async()=>{
  const f=setup();f.tabs.set(1,tab());await f.engine.configure({token:'secret',enabled:true});
  await f.engine.observe(tab());f.advance(301000);f.setAmbiguous(true);await f.engine.scan();
  assert.deepEqual(f.removed,[]);
  f.setAmbiguous(false);f.advance(61000);await f.engine.scan();
  assert.deepEqual(f.removed,[1]);
  assert.equal(f.calls.filter(c=>c.url.endsWith('/pages')).length,1);
});

test('dirty form and failed content-script probe protect tab', async()=>{
  const f=setup();f.tabs.set(1,tab());await f.engine.configure({token:'secret',enabled:true});
  await f.engine.observe(tab());f.advance(301000);f.setDirty(true);await f.engine.scan();assert.deepEqual(f.removed,[]);
  f.setDirty(false);await f.engine.markDirty(1);await f.engine.scan();assert.deepEqual(f.removed,[]);
  await f.engine.activate(tab());await f.engine.scan();assert.deepEqual(f.removed,[]);
});

test('navigation/activation during Notion write does not close a changed tab',async()=>{
  const f=setup();f.tabs.set(1,tab());await f.engine.configure({token:'secret',enabled:true});
  await f.engine.observe(tab());f.advance(301000);
  f.setOnCreate(async()=>{const next={...tab(),url:'https://example.com/new'};f.tabs.set(1,next);await f.engine.observe(next);});
  await f.engine.scan();assert.deepEqual(f.removed,[]);
});

test('exclusion, pause and protected flags prevent any Notion writes',async()=>{
  const f=setup();f.tabs.set(1,{...tab(),pinned:true});await f.engine.configure({token:'secret',enabled:true});
  await f.engine.observe(tab());f.advance(301000);await f.engine.scan();assert.equal(f.calls.length,0);
  f.tabs.set(1,tab());await f.engine.configure({enabled:false});await f.engine.scan();assert.equal(f.calls.length,0);
  await f.engine.configure({enabled:true,excludes:['example.com']});await f.engine.scan();assert.equal(f.calls.length,0);
});

test('Chrome session restore never archives restored background backlog', async()=>{
  const f=setup(); await f.engine.configure({token:'secret',enabled:true});
  await f.engine.restart();
  const restored=tab();f.tabs.set(1,restored);
  await f.engine.observe(restored); // Chrome sends onCreated during session restore.
  f.advance(301000);await f.engine.scan();assert.deepEqual(f.removed,[]);
  f.tabs.set(1,{...restored,active:true});await f.engine.activate({...restored,active:true});await f.engine.scan();
  f.tabs.set(1,restored);await f.engine.scan();f.advance(301000);await f.engine.scan();
  assert.deepEqual(f.removed,[1]);
});

test('background updates of old untouched tabs do not enroll them',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  const old=tab();f.tabs.set(1,old);
  await f.engine.update(old);
  f.advance(301000);await f.engine.scan();assert.deepEqual(f.removed,[]);
});

test('five-minute countdown starts on leaving active tab, not when it first opened', async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  const active={...tab(), active:true};f.tabs.set(1,active);
  await f.engine.observe(active);
  f.advance(20*60000);await f.engine.scan(); // 20 minutes actively reading.
  assert.equal(f.calls.length,0);
  f.tabs.set(1,{...active,active:false});
  await f.engine.scan(); // first observed background minute
  f.advance(4*60000);await f.engine.scan();
  assert.deepEqual(f.removed,[],'must not close after only four minutes in background');
  f.advance(61000);await f.engine.scan();
  assert.deepEqual(f.removed,[1]);
});

test('re-selecting and leaving tab resets whole idle countdown', async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  const background=tab();f.tabs.set(1,background);await f.engine.observe(background);
  f.advance(4*60000);
  const active={...background,active:true};f.tabs.set(1,active);
  await f.engine.activate(active);await f.engine.scan();
  f.tabs.set(1,background);await f.engine.scan();
  f.advance(4*60000);await f.engine.scan();assert.deepEqual(f.removed,[]);
  f.advance(61000);await f.engine.scan();assert.deepEqual(f.removed,[1]);
});

test('a page loading same URL cannot erase unsaved form protection', async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  const t=tab();f.tabs.set(1,t);await f.engine.observe(t);await f.engine.markDirty(t.id);
  await f.engine.update(t);
  f.advance(301000);await f.engine.scan();
  assert.equal(f.removed.length,0);
});

test('tab created on chrome newtab URL remains tracked after its real URL loads',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  const provisional={...tab(),url:'chrome://newtab/',active:true};
  await f.engine.observe(provisional);
  f.tabs.set(1,tab());
  await f.engine.update(tab());
  f.advance(301000);await f.engine.scan();
  assert.deepEqual(f.removed,[1]);
});

test('connection validates a future Notion token format via live API response, not a hard-coded prefix',async()=>{
  const f=setup();
  await f.engine.connect('new_token_format_0123456789');
  assert.equal((await f.engine.status()).hasToken,true);
});

test('tabs opened during pause cannot be closed immediately after resume',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:false});
  const t=tab();f.tabs.set(1,t);await f.engine.observe(t);
  f.advance(10*60_000);
  await f.engine.configure({enabled:true});await f.engine.scan();
  assert.deepEqual(f.removed,[]);
  assert.equal(f.calls.length,0);
});

test('old tabs are listed for opt-in without ever enrolling by themselves',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  for(const t of [tab(1),{...tab(2),pinned:true},{...tab(3),active:true},{...tab(4),url:'https://mail.google.com/'},tab(5)])f.tabs.set(t.id,t);
  const preview=await f.engine.previewBacklog();
  assert.equal(preview.eligible,2);
  assert.equal(preview.batchSize,10);
  assert.deepEqual(f.getData().tabArchiveV1.tracked,{});
  f.advance(10*60_000);await f.engine.scan();assert.deepEqual(f.removed,[]);
});

test('explicit backlog enrollment checks host permission, protects old forms and starts fresh idle timer',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  f.tabs.set(1,tab(1));f.tabs.set(2,tab(2));
  f.setDirty(true);
  let result=await f.engine.enrollBacklog();
  assert.equal(result.enrolled,0);
  assert.deepEqual(f.removed,[]);
  assert.equal((await f.engine.previewBacklog()).eligible,0,'unsafe tabs must not be repeatedly offered');
  const safe=setup();await safe.engine.configure({token:'secret',enabled:true});
  safe.tabs.set(1,tab(1));safe.tabs.set(2,tab(2));
  result=await safe.engine.enrollBacklog();
  assert.equal(result.enrolled,2);
  assert.deepEqual(safe.injected,[1,2]);
  assert.equal(safe.injectionTargets.every(t=>t.allFrames===false),true);
  await safe.engine.scan();assert.deepEqual(safe.removed,[]);
  safe.advance(301_000);await safe.engine.scan();assert.deepEqual(safe.removed,[1]);
  assert.equal(safe.notion.size,1,'duplicate old links share a single Notion row');
});

test('a rejected old tab can enter the normal idle cycle if user actively revisits it',async()=>{
  const f=setup(); await f.engine.configure({token:'secret',enabled:true});
  const old=tab();f.tabs.set(1,old);f.setDirty(true);
  assert.equal((await f.engine.enrollBacklog()).enrolled,0);
  assert.equal((await f.engine.previewBacklog()).eligible,0);
  f.setDirty(false);
  f.tabs.set(1,{...old,active:true});
  await f.engine.activate({...old,active:true});
  assert.equal(f.getData().tabArchiveV1.tracked[1].at,null);
  f.tabs.set(1,old);
  await f.engine.scan();
  assert.equal((await f.engine.previewBacklog()).eligible,0,'already tracked by explicit user visit');
  assert.deepEqual(f.removed,[],'a previously rejected tab cannot close immediately');
  f.advance(301_000);await f.engine.scan();
  assert.deepEqual(f.removed,[1]);
});

test('old backlog enrollment fails closed if injection fails, permission missing, or running is paused',async()=>{
  const f=setup(); f.tabs.set(1,tab());
  await f.engine.configure({token:'secret',enabled:true});
  f.setInjectionFails(true);assert.equal((await f.engine.enrollBacklog()).enrolled,0);
  f.advance(360_000);await f.engine.scan();assert.deepEqual(f.removed,[]);
  f.setInjectionFails(false);
  f.chrome.permissions.contains=async()=>false;
  await assert.rejects(f.engine.enrollBacklog(),/permission|صلاحية/i);
  f.chrome.permissions.contains=async()=>true;
  await f.engine.configure({enabled:false});
  await assert.rejects(f.engine.enrollBacklog(),/شغّل|enable/i);
});

test('old backlog is capped at ten explicit enrollments per click, without closing tabs',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  for(let id=1;id<=22;id++)f.tabs.set(id,{...tab(id),url:`https://example.com/article/${id}`});
  const first=await f.engine.enrollBacklog();
  assert.equal(first.enrolled,10);
  assert.equal(first.remaining,12);
  assert.deepEqual(f.removed,[]);
  assert.equal(Object.keys(f.getData().tabArchiveV1.tracked).length,10);
});

test('new iframe appearing during archive write prevents closing an imported legacy tab',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  f.tabs.set(1,tab());assert.equal((await f.engine.enrollBacklog()).enrolled,1);
  f.advance(301_000);
  f.setOnCreate(async()=>f.setLegacyFrame(true));
  await f.engine.scan();
  assert.equal(f.notion.size,1,'Notion acknowledged the save');
  assert.deepEqual(f.removed,[],'iframe after network write must prevent closing');
});

test('safe page metadata enriches Notion description and classification without saving whole HTML',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  const t={...tab(),title:'Home',url:'https://example.com/article'};
  f.tabs.set(t.id,t);await f.engine.observe(t);
  f.advance(301_000);await f.engine.scan();
  const create=f.calls.find(x=>x.url.endsWith('/pages'));
  const page=JSON.parse(create.options.body);
  assert.equal(page.properties['العنوان'].title[0].text.content,'Metadata title');
  assert.equal(page.properties['التصنيف'].select.name,'برمجة');
  assert.equal(page.properties['النوع'].select.name,'مقال');
  assert.equal(page.properties['وصف مختصر'].rich_text[0].text.content,'A short article about JavaScript programming');
  assert.equal((await f.engine.status()).recent[0].siteName,'Developer Library');
  assert.equal(JSON.stringify(page).includes('outerHTML'),false);
});

test('unsanitized, missing, or dirty metadata never bypasses the close safety guard',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  f.setMetadata({title:'A title',description:'access_token=SECRET-PRIVATE',kind:'article'});
  f.tabs.set(1,tab());await f.engine.observe(tab());
  f.advance(301_000);await f.engine.scan();
  const p=JSON.parse(f.calls.find(x=>x.url.endsWith('/pages')).options.body);
  assert.equal(p.properties['وصف مختصر'],undefined);
  assert.deepEqual(f.removed,[1]);
});

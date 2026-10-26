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
  let dirty=false, saveFails=false, rateLimited=false, ambiguous=false, onCreate=null;
  const notion=new Map();
  const chrome={
    storage:{local:{get:async key=>({[key]:structuredClone(data[key])}),set:async obj=>{data={...data,...structuredClone(obj)};},setAccessLevel:async()=>{}}},
    tabs:{query:async()=>[...tabs.values()].map(x=>({...x})),get:async id=>{if (!tabs.has(id)) throw Error('No tab');return {...tabs.get(id)};},remove:async id=>{removed.push(id);tabs.delete(id);},sendMessage:async()=>({dirty})},
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
  return {engine,chrome,tabs,removed,calls,notion,advance:ms=>{time+=ms;},setDirty:v=>{dirty=v;},setSaveFails:v=>{saveFails=v;},setRateLimited:v=>{rateLimited=v;},setAmbiguous:v=>{ambiguous=v;},setOnCreate:v=>{onCreate=v;},getData:()=>data,sleep};
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
  await f.engine.activate(restored);f.advance(301000);await f.engine.scan();
  assert.deepEqual(f.removed,[1]);
});

test('background updates of old untouched tabs do not enroll them',async()=>{
  const f=setup();await f.engine.configure({token:'secret',enabled:true});
  const old=tab();f.tabs.set(1,old);
  await f.engine.update(old);
  f.advance(301000);await f.engine.scan();assert.deepEqual(f.removed,[]);
});

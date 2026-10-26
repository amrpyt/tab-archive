import test from 'node:test';
import assert from 'node:assert/strict';

test('popup page opened in a normal tab can still ask for STATUS',async()=>{
  let handler;
  const addListener=()=>{};
  globalThis.chrome={
    runtime:{id:'ext-id',getURL:path=>`chrome-extension://ext-id/${path}`,onMessage:{addListener:fn=>{handler=fn;}},onInstalled:{addListener},onStartup:{addListener}},
    storage:{local:{get:async()=>({}),set:async()=>{},setAccessLevel:async()=>{}},session:{get:async()=>({}),set:async()=>{}}},
    alarms:{create:async()=>{},onAlarm:{addListener}},
    tabs:{onCreated:{addListener},onActivated:{addListener},onUpdated:{addListener},onRemoved:{addListener}},
  };
  try {
    await import('../extension/background.js');
    const result=await new Promise(resolve=>{
      const accepted=handler({type:'STATUS'},{id:'ext-id',url:'chrome-extension://ext-id/popup.html',tab:{id:5}},resolve);
      if(!accepted) resolve({failed:true});
    });
    assert.equal(result.ok,true);
    assert.equal(result.data.enabled,false);
  } finally {delete globalThis.chrome;}
});

test('real browser restart clears stale tracked IDs even without a startup event',async()=>{
  let saved={tabArchiveV1:{
    config:{enabled:true, idleMinutes:5,token:'fake_test_token',excludes:[],rules:''},
    tracked:{'777':{url:'https://example.com/',at:1,selected:false}},dirty:{},pending:{},recent:[],lastError:'',
  }};
  const marker={};const noop=()=>{};
  globalThis.chrome={
    runtime:{id:'ext-restart',getURL:path=>`chrome-extension://ext-restart/${path}`,onMessage:{addListener:noop},onInstalled:{addListener:noop},onStartup:{addListener:noop}},
    storage:{local:{get:async key=>({[key]:structuredClone(saved[key])}),set:async obj=>{Object.assign(saved,structuredClone(obj));},setAccessLevel:async()=>{}},
      session:{get:async key=>({[key]:marker[key]}),set:async obj=>{Object.assign(marker,obj);}}},
    alarms:{create:async()=>{},onAlarm:{addListener:noop}},
    tabs:{onCreated:{addListener:noop},onActivated:{addListener:noop},onUpdated:{addListener:noop},onRemoved:{addListener:noop}},
  };
  try {
    await import('../extension/background.js?restart-safety');
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(saved.tabArchiveV1.tracked,{});
    assert.equal(saved.tabArchiveV1.config.enabled,true);
    assert.equal(marker.tabArchiveSessionStarted,true);
  } finally {delete globalThis.chrome;}
});

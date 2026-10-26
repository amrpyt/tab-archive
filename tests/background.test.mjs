import test from 'node:test';
import assert from 'node:assert/strict';

test('popup page opened in a normal tab can still ask for STATUS',async()=>{
  let handler;
  const addListener=()=>{};
  globalThis.chrome={
    runtime:{id:'ext-id',getURL:path=>`chrome-extension://ext-id/${path}`,onMessage:{addListener:fn=>{handler=fn;}},onInstalled:{addListener},onStartup:{addListener}},
    storage:{local:{get:async()=>({}),set:async()=>{},setAccessLevel:async()=>{}}},
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

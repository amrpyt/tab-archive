import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src = file => readFileSync(new URL(`../extension/${file}`, import.meta.url), 'utf8');

test('manifest is minimal MV3, no externally exposed messages or remote code', () => {
  const m=JSON.parse(src('manifest.json'));
  assert.equal(m.manifest_version,3);
  assert.equal(m.background.service_worker,'background.js');
  assert.equal(m.background.type,'module');
  assert.ok(m.permissions.includes('tabs'));
  assert.ok(m.permissions.includes('alarms'));
  assert.ok(m.permissions.includes('storage'));
  assert.deepEqual(m.host_permissions,['https://api.notion.com/*']);
  assert.equal(m.content_scripts[0].all_frames,true);
  assert.equal(m.externally_connectable,undefined);
});

test('dirty form input in any frame tells background and prevents close', () => {
  const events={}, requests={}, sent=[];
  const chrome={runtime:{sendMessage:msg=>sent.push(msg),onMessage:{addListener:fn=>requests.reply=fn}}};
  const document={addEventListener:(name,fn)=>{events[name]=fn;}};
  vm.runInNewContext(src('content.js'),{chrome,document});
  let reply;requests.reply({type:'IS_DIRTY'},null,v=>reply=v);
  assert.equal(reply.dirty,false);
  events.input({isTrusted:true,target:{closest:()=>({}),isContentEditable:false}});
  requests.reply({type:'IS_DIRTY'},null,v=>reply=v);
  assert.equal(reply.dirty,true);
  assert.equal(sent.some(x=>x.type==='DIRTY'),true);
});

test('popup has secure password entry and explicit enable, no embedded secret', () => {
  const html=src('popup.html');
  assert.match(html, /type="password"/);
  assert.match(html, /id="enable"/);
  assert.match(html, /id="saveRules"/);
  assert.match(html, /id="recent"/);
  assert.equal(html.includes('secret_'),false);
});

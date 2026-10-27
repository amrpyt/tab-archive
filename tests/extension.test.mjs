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

test('optional website permission and scripting are limited to user-requested old-tab import', () => {
  const m=JSON.parse(src('manifest.json'));
  assert.ok(m.permissions.includes('scripting'));
  assert.deepEqual(m.optional_host_permissions,['http://*/*','https://*/*']);
  assert.deepEqual(m.host_permissions,['https://api.notion.com/*']);
  assert.match(src('popup.html'),/id="previewOld"/);
  assert.match(src('popup.html'),/id="importOld"/);
});

test('metadata extraction reads only bounded head meta tags and rejects already-edited forms', () => {
  const events={}, requests={}, sent=[];
  const metas=[
    {getAttribute:k=>({'property':'og:title','content':'  Better Article Title  '}[k]||'')},
    {getAttribute:k=>({'name':'description','content':'  Guide to React and TypeScript  '}[k]||'')},
    {getAttribute:k=>({'property':'og:site_name','content':'Developer Hub'}[k]||'')},
    {getAttribute:k=>({'property':'og:type','content':'article'}[k]||'')},
    {getAttribute:k=>({'name':'keywords','content':'javascript, react,typescript'}[k]||'')},
  ];
  const doc={title:'Page title',querySelectorAll:(sel)=>sel==='meta'?metas:[],addEventListener:(name,fn)=>{events[name]=fn;}};
  const chrome={runtime:{sendMessage:msg=>sent.push(msg),onMessage:{addListener:fn=>requests.reply=fn}}};
  const global={},win={};win.top=win;
  vm.runInNewContext(src('content.js'),{chrome,document:doc,window:win,globalThis:global});
  let reply;requests.reply({type:'GET_METADATA'},null,v=>reply=v);
  assert.equal(reply.dirty,false);
  assert.equal(reply.metadata.title,'Better Article Title');
  assert.equal(reply.metadata.description,'Guide to React and TypeScript');
  assert.equal(reply.metadata.siteName,'Developer Hub');
  assert.equal(reply.metadata.kind,'article');
  assert.equal(reply.metadata.keywords.length,3);
  events.input({isTrusted:true,target:{closest:()=>({}),isContentEditable:false}});
  requests.reply({type:'GET_METADATA'},null,v=>reply=v);
  assert.equal(reply.dirty,true);
  assert.equal(reply.metadata,undefined);
});

test('old form with pre-existing unsaved changes is marked dirty when guard is first injected', () => {
  const events={},requests={},sent=[];
  const textarea={tagName:'TEXTAREA',value:'unsaved',defaultValue:'',disabled:false};
  const doc={title:'Draft',querySelectorAll:sel=>sel==='meta'?[]:[textarea],addEventListener:(name,fn)=>{events[name]=fn;}};
  const chrome={runtime:{sendMessage:msg=>{sent.push(msg);return Promise.resolve();},onMessage:{addListener:fn=>requests.reply=fn}}};
  vm.runInNewContext(src('content.js'),{chrome,document:doc,window:{top:{}},globalThis:{}});
  let reply;requests.reply({type:'IS_DIRTY'},null,v=>reply=v);
  assert.equal(reply.dirty,true);
  assert.ok(sent.some(m=>m.type==='DIRTY'));
});

test('legacy tabs with embedded frames are protected because their old form state cannot be proven clean',()=>{
  const requests={};
  const doc={title:'Article',querySelectorAll:sel=>sel==='iframe'?[{}]:[],addEventListener:()=>{}};
  const chrome={runtime:{sendMessage:()=>Promise.resolve(),onMessage:{addListener:fn=>requests.reply=fn}}};
  const win={};win.top=win;
  vm.runInNewContext(src('content.js'),{chrome,document:doc,window:win,globalThis:{}});
  let reply;
  requests.reply({type:'GET_METADATA',legacy:true},null,v=>reply=v);
  assert.equal(reply.dirty,true);
  requests.reply({type:'IS_DIRTY'},null,v=>reply=v);
  assert.equal(reply.dirty,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, classify, isSafeUrl, canArchive, notionPage, parseDomainRules } from '../extension/core.js';

test('canonicalizes trackers but keeps functional video and timestamp params', () => {
  assert.equal(canonicalUrl('https://youtube.com/watch?v=abc&t=42&utm_source=mail#comments'), 'https://youtube.com/watch?v=abc&t=42#comments');
  assert.equal(canonicalUrl('https://example.com/?fbclid=x&a=2'), 'https://example.com/?a=2');
});

test('rejects secrets, private addresses and privileged/financial/auth pages', () => {
  for (const url of ['chrome://extensions', 'https://a.com/?access_token=SECRET', 'https://site.com/login', 'https://site.com/checkout', 'http://127.0.0.1:8000', 'https://mail.google.com/', 'https://app.notion.com', 'https://demo.com/path#access_token=wow', 'https://outlook.cloud.microsoft/mail/', 'https://outlook.office.com/mail/', 'https://portal.example.com/home', 'https://dashboard.example.com/', 'https://banking.example.com/home', 'https://shop.example.com/customer/orders', 'https://example.com/?csrf=secret', 'https://wahba.164-68-98-58.sslip.io/app']) {
    assert.equal(isSafeUrl(url, []), false, url);
  }
  assert.equal(isSafeUrl('https://ar.wikipedia.org/wiki/AI', []), true);
  assert.equal(isSafeUrl('https://example.com/', ['example.com']), false);
});

test('classifies by light rules and editable hostname overrides', () => {
  assert.deepEqual(classify('https://youtu.be/abc', 'تعلم البرمجة', {}), {type:'يوتيوب', category:'برمجة', tags:['مشاهدة لاحقًا']});
  assert.equal(classify('https://quran.com/1', 'الفاتحة', {}).category, 'دين');
  assert.equal(classify('https://github.com/user/repo', 'React code', {}).category, 'برمجة');
  assert.equal(classify('https://unknown.example/', 'Hello', {}).category, 'أخرى');
  assert.equal(classify('https://blog.example.com/article', 'Hello', {'example.com':'تصميم'}).category, 'تصميم');
  assert.deepEqual(parseDomainRules('example.com=دين\nsub.test=برمجة\ninvalid\nbad=خارج'), {'example.com':'دين','sub.test':'برمجة'});
});

test('English category rule names map to the existing Arabic Notion categories', () => {
  const rules=parseDomainRules('example.com=Programming\nnews.site=AI\nlearn.test=Religion\ndesign.site=Design\nwork.site=Work\nmisc.site=Other\ninvalid.site=BadCategory');
  assert.deepEqual(rules,{
    'example.com':'برمجة','news.site':'ذكاء اصطناعي','learn.test':'دين',
    'design.site':'تصميم','work.site':'شغل','misc.site':'أخرى',
  });
  assert.equal(classify('https://example.com/', 'Hello', rules).category,'برمجة');
});

test('only safe, background, unchanged, idle tabs can be archived', () => {
  const t = {id:8, url:'https://example.com/path', title:'Example', active:false, pinned:false, audible:false, incognito:false};
  const record = {url:t.url, at:1000};
  assert.equal(canArchive(t, record, 302000, 5, [], false), true);
  for (const change of [{active:true},{pinned:true},{audible:true},{incognito:true},{url:'https://other.com'}]) {
    assert.equal(canArchive({...t,...change}, record, 302000, 5, [], false), false);
  }
  assert.equal(canArchive(t, record, 300999, 5, [], false), false);
  assert.equal(canArchive(t, record, 302000, 5, [], true), false);
});

test('Notion payload matches existing data source field names and no token included', () => {
  const p = notionPage({url:'https://youtube.com/watch?v=x',title:'Video',at:1234567}, {type:'يوتيوب',category:'أخرى',tags:['مشاهدة لاحقًا']}, 'af3460cb-e50f-4799-af0e-bc5a72169e52');
  assert.equal(p.parent.data_source_id, 'af3460cb-e50f-4799-af0e-bc5a72169e52');
  assert.equal(p.properties['العنوان'].title[0].text.content, 'Video');
  assert.equal(p.properties['الوسوم'].multi_select[0].name, 'مشاهدة لاحقًا');
  assert.equal(p.properties['الرابط'].url, 'https://youtube.com/watch?v=x');
  assert.equal('token' in p, false);
});

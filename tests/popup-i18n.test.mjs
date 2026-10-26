import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translations,categoryLabel,errorLabel} from '../extension/popup-i18n.js';

test('Arabic and English UI translations cover the same labels', () => {
  assert.deepEqual(Object.keys(translations.en).sort(),Object.keys(translations.ar).sort());
  const markup=readFileSync(new URL('../extension/popup.html',import.meta.url),'utf8');
  for (const [,key] of markup.matchAll(/data-i18n(?:-placeholder|-aria-label)?="([^"]+)"/g)) {
    assert.ok(translations.ar[key],`Arabic key: ${key}`);
    assert.ok(translations.en[key],`English key: ${key}`);
  }
  assert.equal(translations.en.pending(2),'2 archive attempts waiting to retry');
});

test('English UI translates categories and known errors without changing archive data', () => {
  assert.equal(categoryLabel('ذكاء اصطناعي','en'),'AI');
  assert.equal(categoryLabel('ذكاء اصطناعي','ar'),'ذكاء اصطناعي');
  assert.equal(errorLabel('نوشن: خطأ 429','en'),'Notion error 429');
});

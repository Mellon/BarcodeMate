import test from 'node:test';
import assert from 'node:assert/strict';
import {languages, dictionaries, negotiateLanguage, translate, diagnostic, direction} from '../src/i18n';

test('language negotiation respects Chinese scripts, regional variants, aliases and fallback', () => {
  for (const [input, output] of [['zh-CN','zh-Hans'],['zh-Hans-HK','zh-Hans'],['zh-TW','zh-Hant'],['zh-HK','zh-Hant'],['zh-MO','zh-Hant'],['fr-CA','fr'],['pt-BR','pt'],['iw-IL','he'],['in-ID','id'],['xx-XX','en']]) assert.equal(negotiateLanguage([input]),output);
  assert.equal(negotiateLanguage(['sv-SE','de-DE']),'de');
  assert.equal(direction('ar'),'rtl');assert.equal(direction('fa'),'rtl');assert.equal(direction('he'),'rtl');assert.equal(direction('en'),'ltr');
});
test('all 24 packaged dictionaries are complete and retain substitution fields', () => {
  assert.equal(languages.length,24);
  const expected=Object.keys(dictionaries.en).sort();
  const placeholders=(text:string)=>[...text.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(m=>m[0]).sort();
  for(const {code} of languages){
    assert.deepEqual(Object.keys(dictionaries[code]).sort(),expected,code);
    for(const source of expected){
      assert(dictionaries[code][source]?.trim(),code+': '+source);
      if (code !== 'en' && source.split(/\s+/).length > 3 && source !== 'Lot / batch (AI 10)') {
        assert.notEqual(dictionaries[code][source], source, code + ': untranslated message ' + source);
      }
      assert.deepEqual(placeholders(dictionaries[code][source]),placeholders(source),code+': '+source);
    }
  }
});
test('localized diagnostics preserve identifiers, numbers and user data', () => {
  const text=translate('zh-Hans','Row {number}: {message}',{number:12,message:'00001234'});
  assert(text.includes('12')&&text.includes('00001234'));
  assert(diagnostic('zh-Hans','Check digit should be 7.').includes('7'));
  assert(!diagnostic('zh-Hans','Check digit should be 7.').includes('should be'));
  assert(diagnostic('zh-Hans','Row 12: Enter data to create a barcode.').includes('12'));
  assert.equal(translate('fr','{userData}',{userData:'$& <0001>'}),'$& <0001>');
});

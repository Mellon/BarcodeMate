import { _electron as electron } from '@playwright/test';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const temp=await mkdtemp(path.join(os.tmpdir(),'barcodemate-chrome-'));
const app=await electron.launch({args:['.'],env:{...process.env,BARCODEMATE_TEST_DIR:temp}});
try{
 const p=await app.firstWindow();await p.locator('#language-select').selectOption('en');await p.locator('[data-workspace=scenarios]').click();await p.locator('[data-workspace=home]').click();
 const read=()=>p.evaluate(()=>{
  const button=document.querySelector('.hm-heading .hm-actions > button'),summary=document.querySelector('.hm-backup > summary'),details=summary.parentElement;
  const b=getComputedStyle(button),s=getComputedStyle(summary),d=getComputedStyle(details);
  const link=document.querySelector('.breadcrumb-link').getBoundingClientRect(),title=document.querySelector('.breadcrumb strong').getBoundingClientRect();
  const nav=document.querySelector('[data-workspace=scenarios]');
  return {centres:Math.abs(link.y+link.height/2-title.y-title.height/2),padding:[b.padding,s.padding],weight:[b.fontWeight,s.fontWeight],height:[button.getBoundingClientRect().height,summary.getBoundingClientRect().height],extra:getComputedStyle(summary,'::after').content,details:[d.borderTopWidth,d.paddingTop,d.marginTop],ancestor:nav.classList.contains('ancestor'),background:getComputedStyle(nav).backgroundColor};
 });
 await p.waitForTimeout(200);
 const before=await read();assert(before.centres<1);assert.equal(before.padding[0],before.padding[1]);assert.deepEqual(before.weight,['400','400']);assert.equal(before.height[0],before.height[1]);assert.equal(before.extra,'none');assert.deepEqual(before.details,['0px','0px','0px']);assert(before.ancestor);assert.equal(before.background,'rgba(0, 0, 0, 0)');
 await p.locator('.hm-backup summary').click();assert.deepEqual((await read()).height,before.height);await p.locator('.hm-backup summary').click();
 await p.locator('[data-workspace=home]').click();assert.equal(await p.locator('[data-workspace=home]').evaluate(e=>e.matches(':focus-visible')),false);
 await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');
 const focus=await p.locator('[data-workspace=home]').evaluate(e=>({visible:e.matches(':focus-visible'),width:getComputedStyle(e).outlineWidth,offset:getComputedStyle(e).outlineOffset}));assert.deepEqual(focus,{visible:true,width:'2px',offset:'-2px'});
 await p.locator('.hm-root h1').click();
 await mkdir('../artifacts/home-labels/desktop-chrome',{recursive:true});
 await p.screenshot({path:'../artifacts/home-labels/desktop-chrome/en.png',fullPage:true});
 await p.locator('#language-select').selectOption('zh-Hans');const zh=await read();assert(zh.centres<1);assert.equal(zh.height[0],zh.height[1]);
 await p.screenshot({path:'../artifacts/home-labels/desktop-chrome/zh-Hans.png',fullPage:true});
 await writeFile('../artifacts/home-labels/desktop-chrome/verification.json',JSON.stringify({checkedAt:new Date().toISOString(),en:before,zh,keyboardFocus:focus},null,2));
 console.log('Breadcrumb alignment, ancestor navigation, pointer/keyboard focus and backup toolbar verified in Electron.');
}finally{await app.close();}

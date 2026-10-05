const { setup } = require('./harness.cjs');
const F = (n) => __dirname + '/fixtures/' + n; // created by tests/make-fixtures.sh
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg); } }
(async () => {
  const { browser, page, errors } = await setup();
  const val = (sel) => page.$eval(sel, (e) => e.value);
  const txt = (sel) => page.$eval(sel, (e) => e.textContent.trim());
  const inModal = () => page.evaluate(() => !!document.activeElement.closest('.dm'));
  const step = () => page.$eval('.prov-progress__item[aria-current="step"]', (e) => +e.dataset.step);
  const fill = async (sel, v) => { await page.fill(sel, ''); await page.type(sel, String(v)); await page.press(sel, 'Tab'); };

  console.log('1. Open + empty close');
  await page.click('#add-deal-btn');
  ok(await page.isVisible('.dm[role="dialog"]'), 'modal opens from New deal');
  ok(await page.evaluate(() => document.activeElement.id) === 'f-area_sqm', 'focus starts on Area');
  await page.keyboard.press('Escape');
  ok(!(await page.$('.dm')), 'Esc with no data closes silently');
  ok(await page.evaluate(() => document.activeElement.id) === 'add-deal-btn', 'focus returns to trigger');
  await page.click('#add-deal-btn');
  await page.mouse.click(10, 870);
  ok(!(await page.$('.dm')), 'overlay click with no data closes silently');
  await page.click('#add-deal-btn');
  await page.click('[data-act="close"]');
  ok(!(await page.$('.dm')), 'close icon with no data closes silently');

  console.log('2. Validation + locks');
  await page.click('#add-deal-btn');
  ok(await page.$eval('[data-step="1"]', (e) => e.getAttribute('aria-disabled')) === 'true', 'upcoming steps locked');
  await page.click('[data-act="next"]');
  ok(await step() === 0, 'Next blocked on invalid Key Info');
  ok((await page.$$('.ds-field[data-state="error"]')).length >= 5, 'required errors shown');
  ok(await page.evaluate(() => document.activeElement.id) === 'f-area_sqm', 'focus moved to first invalid field');

  console.log('3. Calculations');
  await fill('#f-area_sqm', 1000);
  await fill('#f-price', 10000000);
  await fill('#f-occupancy', 95);
  await fill('#f-rent_yearly', 500000);
  await fill('#f-assets_count', 3);
  ok(await val('#f-rent_psm') === '500', `Rent/psm = 500 (got ${await val('#f-rent_psm')})`);
  ok(await val('#f-niy') === '5', `NIY = 5 (got ${await val('#f-niy')})`);
  ok(await val('#f-price') === '10,000,000', 'price formatted on blur');
  await page.click('[data-unit="period"][data-value="monthly"]');
  ok(await val('#f-rent_yearly') === '41,666.67', `rent shown monthly (got ${await val('#f-rent_yearly')})`);
  ok(await val('#f-rent_psm') === '500' && await val('#f-niy') === '5', 'Rent/psm and NIY unchanged after Monthly toggle');
  await fill('#f-rent_yearly', 50000); // monthly → 600k/yr
  ok(await val('#f-rent_psm') === '600' && await val('#f-niy') === '6', `monthly entry normalised (psm ${await val('#f-rent_psm')}, NIY ${await val('#f-niy')})`);
  await page.click('[data-unit="area"][data-value="sqf"]');
  ok(await val('#f-area_sqm') === '10,763.9', `area shown in sqf (got ${await val('#f-area_sqm')})`);
  ok(await txt('#l-rent_psm') === 'Rent/psf' && await val('#f-rent_psm') === '55.74', `Rent/psf = 55.74 (got ${await val('#f-rent_psm')})`);
  await page.click('[data-unit="area"][data-value="sqm"]');
  await page.click('[data-unit="period"][data-value="yearly"]');
  ok(await val('#f-area_sqm') === '1,000' && await val('#f-rent_yearly') === '600,000', 'round-trip toggles keep values');
  await fill('#f-niy', 7.5);
  ok(await txt('#niy-tag') === 'edited', 'NIY marked edited');
  await fill('#f-rent_yearly', 800000);
  ok(await val('#f-niy') === '7.5', 'manual NIY no longer auto-updates');
  await page.click('[data-act="niy-reset"]');
  ok(await val('#f-niy') === '8' && await txt('#niy-tag') === 'auto', `reset to calculated → 8 (got ${await val('#f-niy')})`);
  await fill('#f-occupancy', 140);
  ok(await page.$eval('[data-wrap="occupancy"]', (e) => e.dataset.state) === 'error', 'occupancy > 100 rejected');
  await fill('#f-occupancy', 95);
  await fill('#f-assets_count', 2.5);
  ok(await page.$eval('[data-wrap="assets_count"]', (e) => e.dataset.state) === 'error', 'non-integer assets rejected');
  await fill('#f-assets_count', 3);

  console.log('4. Upload');
  await page.setInputFiles('.prov-dropzone input[type=file]', [F('photo1.jpg'), F('photo2.jpg'), F('photo3.jpg'), F('huge.jpg'), F('notes.txt')]);
  ok((await page.$$('.upload-errors li')).length === 2, 'oversize + unsupported rejected and listed');
  ok((await page.$$('.thumb[data-status="uploading"]')).length === 3, 'progress state shown');
  await page.waitForSelector('.thumb[data-status="uploading"]', { state: 'detached', timeout: 10000 });
  ok(await txt('.upload-count') === '3/10', 'counter 3/10');
  ok(await page.$eval('.thumb:first-child img', (e) => e.alt) === 'photo1.jpg' && !!(await page.$('.thumb:first-child .thumb__cover')), 'first image labelled cover');
  // keyboard reorder
  await page.focus('.thumb:nth-child(2) [data-act="grip"]');
  await page.keyboard.press('ArrowLeft');
  ok(await page.$eval('.thumb:first-child img', (e) => e.alt) === 'photo2.jpg', 'keyboard reorder → photo2 is cover');
  ok(await page.evaluate(() => document.activeElement.closest('.thumb') && document.activeElement.closest('.thumb').querySelector('img').alt) === 'photo2.jpg', 'focus follows moved image');
  // mouse DnD reorder: drag 3rd onto first (before)
  await page.locator('.thumb:nth-child(3)').dragTo(page.locator('.thumb:nth-child(1)'), { targetPosition: { x: 5, y: 40 } });
  ok(await page.$eval('.thumb:first-child img', (e) => e.alt) === 'photo3.jpg', `drag & drop reorder → photo3 is cover (got ${await page.$eval('.thumb:first-child img', (e) => e.alt)})`);
  // remove cover
  await page.click('.thumb:first-child [data-act="remove"]');
  ok(await txt('.upload-count') === '2/10' && await page.$eval('.thumb:first-child img', (e) => e.alt) === 'photo2.jpg', 'remove cover → next becomes cover');
  // over limit
  await page.setInputFiles('.prov-dropzone input[type=file]', [4,5,6,7,8,9,10,11,12].map((i) => F(`photo${i}.jpg`)));
  ok((await page.$$('.upload-errors li')).length === 1 && (await txt('.upload-errors li')).includes('10-file limit'), 'extra files beyond 10 rejected and named');
  await page.waitForSelector('.thumb[data-status="uploading"]', { state: 'detached', timeout: 10000 });
  ok(await txt('.upload-count') === '10/10', 'counter 10/10');
  ok(await page.$eval('.prov-dropzone', (e) => e.getAttribute('aria-disabled')) === 'true', 'dropzone disabled at limit');
  ok(await page.$eval('.prov-dropzone input', (e) => e.disabled), 'file input disabled at limit');
  await page.screenshot({ path: __dirname + '/out/upload.png', fullPage: false });
  await page.$eval('.dm__body', (e) => e.scrollTop = 0);
  await page.screenshot({ path: __dirname + '/out/upload-top.png' });

  console.log('5. General Info');
  ok(await page.$eval('[data-step="1"]', (e) => e.getAttribute('aria-disabled')) === null, 'General unlocked once Key Info valid');
  await page.click('[data-act="next"]');
  ok(await step() === 1, 'moved to General Info');
  ok(await page.$eval('[data-step="0"]', (e) => e.dataset.state) === 'done', 'Key Info marked done');
  await page.fill('#f-deal_name', 'Harbour Gate Logistics Park');
  await page.click('#f-location'); await page.type('#f-location', 'ven');
  ok(await page.isVisible('#lb-location'), 'location suggestions open');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  ok(await val('#f-location') === 'Venlo, Netherlands', 'location picked with keyboard');
  await page.click('.chip-option[data-industry="Logistics"]');
  await page.selectOption('#f-stage', 'LOI');
  await page.selectOption('#f-fund', 'Gocanopy Logistics Fund II');
  await page.click('#f-team');
  await page.click('#team-opt-sc'); await page.click('#team-opt-lo'); await page.click('#team-opt-ya');
  await page.keyboard.press('Escape');
  ok((await page.$$('.team-token')).length === 3, 'team multi-select (3)');
  ok(!!(await page.$('.dm[role="dialog"]')), 'Esc in listbox did not close modal');
  await page.selectOption('#f-deadline_type', 'LOI submission');
  await page.fill('#f-deadline_date', '2026-10-14');
  await page.fill('#f-broker_company', 'CBRE'); await page.fill('#f-broker_contact', 'Pieter van de Wal');
  await page.selectOption('#f-market_type', 'On-Market'); await page.selectOption('#f-process_type', 'Structured Process');
  await page.screenshot({ path: __dirname + '/out/general.png' });

  console.log('6. Physical');
  await page.click('[data-act="next"]');
  await fill('#f-gla_sqm', 37380); await fill('#f-year_built', 2008); await fill('#f-year_renovated', 2000);
  ok(await page.$eval('[data-wrap="year_renovated"]', (e) => e.dataset.state) === 'error', 'renovated < built rejected');
  await page.click('[data-act="next"]');
  ok(await step() === 2, 'blocked on invalid optional field');
  await fill('#f-year_renovated', 2019); await fill('#f-floors', 2);
  await page.selectOption('#f-condition', 'Good');
  await page.screenshot({ path: __dirname + '/out/physical.png' });

  console.log('7. Financial');
  await page.click('[data-act="next"]');
  await fill('#f-wault', 4.1); await fill('#f-noi_yearly', 750000); await fill('#f-ltv', 55); await fill('#f-rent_growth', 2);
  await page.screenshot({ path: __dirname + '/out/financial.png' });

  console.log('8. Preview');
  await page.click('[data-act="next"]');
  ok(await step() === 4, 'Preview reached');
  ok(await page.$eval('.dm', (e) => e.dataset.wide) === 'true', 'preview is wider');
  ok((await txt('.pv-head h3')) === 'Harbour Gate Logistics Park', 'preview shows deal name');
  const metrics = await page.$$eval('.metric', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  console.log('    metrics:', metrics.join(' | '));
  ok(metrics.join('|').includes('Rent/psm €800') && metrics.join('|').includes('NIY 8%'), 'metrics carry the computed values');
  await page.screenshot({ path: __dirname + '/out/preview.png' });
  await page.$eval('.dm__body', (e) => e.scrollTop = e.scrollHeight);
  await page.screenshot({ path: __dirname + '/out/preview-bottom.png' });
  ok((await page.$$('[data-ai]:checked')).length === 3, 'AI toggles default ON');
  await page.click('label:has([data-ai="risks"])');
  ok((await page.$$('[data-ai]:checked')).length === 2, 'AI toggle switched off');
  await page.click('[data-edit="2"]');
  ok(await step() === 2 && await val('#f-gla_sqm') === '37,380' && await val('#f-year_renovated') === '2019', 'Edit Physical → step 3 with data');
  await page.click('[data-step="4"]');
  ok(await step() === 4, 'stepper jump back to Preview');
  ok((await page.$$('[data-ai]:checked')).length === 2, 'AI flags preserved');
  await page.click('[data-edit="0"]');
  ok(await step() === 0 && (await page.$$('.thumb')).length === 10 && await val('#f-rent_yearly') === '800,000', 'Edit Key Info → images + values preserved');
  await page.click('[data-step="4"]');

  console.log('9. Focus trap');
  let escaped = false;
  for (let i = 0; i < 60; i++) { await page.keyboard.press('Tab'); if (!(await inModal())) escaped = true; }
  for (let i = 0; i < 10; i++) { await page.keyboard.press('Shift+Tab'); if (!(await inModal())) escaped = true; }
  ok(!escaped, 'Tab / Shift+Tab stay inside modal');

  console.log('10. Dirty close → confirm');
  await page.keyboard.press('Escape');
  ok(await page.isVisible('[role="alertdialog"]'), 'Esc with data opens confirmation');
  await page.screenshot({ path: __dirname + '/out/confirm.png' });
  await page.keyboard.press('Escape');
  ok(!(await page.$('[role="alertdialog"]')) && !!(await page.$('.dm[role="dialog"]')), 'Esc in confirm = continue editing');
  await page.click('[data-act="close"]');
  await page.click('[data-choice="continue"]');
  ok(!!(await page.$('.dm[role="dialog"]')) && await step() === 4, 'Continue editing keeps state');
  await page.mouse.click(10, 870);
  ok(await page.isVisible('[role="alertdialog"]'), 'overlay click with data opens confirmation');
  await page.click('[data-choice="draft"]');
  ok(!(await page.$('.dm')), 'Save as Draft closes');
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('gocanopy.addDeal.draft.v1') || 'null'));
  ok(draft && draft.images.length === 10 && draft.data.deal_name === 'Harbour Gate Logistics Park', 'draft in localStorage with images');
  ok(await page.isVisible('.toast-region .ds-alert'), 'draft toast shown');

  console.log('11. Restore draft');
  await page.click('#add-deal-btn');
  ok(await page.isVisible('.draft-banner'), 'draft restored banner');
  ok(await step() === 3, `restored to saved step (step ${await step()})`);
  await page.click('[data-step="0"]');
  ok(await val('#f-area_sqm') === '1,000' && (await page.$$('.thumb')).length === 10 && await val('#f-niy') === '8', 'Key Info + photos restored');
  await page.click('[data-step="4"]');
  ok((await page.$$('[data-ai]:checked')).length === 2, 'AI flags restored');

  console.log('12. Discard');
  await page.click('[data-act="close"]');
  await page.click('[data-choice="discard"]');
  ok(!(await page.$('.dm')) && await page.evaluate(() => localStorage.getItem('gocanopy.addDeal.draft.v1')) === null, 'discard closes + clears draft');
  await page.click('#add-deal-btn');
  ok(await val('#f-area_sqm') === '' && !(await page.$('.draft-banner')), 'reopen is empty');
  await page.keyboard.press('Escape');
  ok(!(await page.$('.dm')), 'clean modal closes silently');

  console.log('13. Add Deal');
  await page.click('#add-deal-btn');
  await fill('#f-area_sqm', 8269); await fill('#f-price', 33710000); await fill('#f-occupancy', 98.5);
  await fill('#f-rent_yearly', 831058); await fill('#f-assets_count', 3);
  await page.setInputFiles('.prov-dropzone input[type=file]', [F('photo5.jpg')]);
  await page.waitForSelector('.thumb[data-status="done"]');
  await page.click('[data-act="next"]');
  await page.fill('#f-deal_name', 'Project Gateway - Venlo Logistics');
  await page.fill('#f-location', 'Noord-Brabant & Limburg, Netherlands');
  await page.press('#f-location', 'Escape');
  ok(!!(await page.$('.dm[role="dialog"]')), 'Esc closes listbox only');
  await page.click('.chip-option[data-industry="Logistics"]');
  await page.selectOption('#f-process_type', 'Structured Process');
  await page.click('[data-step="4"]');
  ok(await step() === 4, 'stepper can jump to Preview when earlier steps valid');
  await page.click('[data-act="add"]');
  ok(!(await page.$('.dm')), 'modal closed on Add Deal');
  ok((await txt('.deal-list .row-card:first-child .row-card__name')) === 'Project Gateway - Venlo Logistics', 'new deal at top of inbox');
  ok(await page.$eval('.deal-list .row-card:first-child', (e) => e.classList.contains('is-new')), 'temporary highlight');
  ok((await txt('#inbox-sub')).startsWith('12 active deals'), 'header count updated');
  ok((await page.$$eval('.toast-region .ds-alert__msg', (e) => e.map((x) => x.textContent))).includes('Deal added'), 'success toast');
  console.log('    card:', (await txt('.deal-list .row-card:first-child')).replace(/\s+/g, ' '));
  await page.screenshot({ path: __dirname + '/out/success.png' });
  await page.waitForTimeout(4300);
  ok(!(await page.$eval('.deal-list .row-card:first-child', (e) => e.classList.contains('is-new'))), 'highlight fades');
  const record = await page.evaluate(() => GC.inbox.lastAdded.record.ai);
  ok(record.summary && record.keyStrengths && record.investmentRisks, 'AI flags stored on deal object');

  console.log('\nconsole errors/warnings:', errors.length ? errors : 'none');
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

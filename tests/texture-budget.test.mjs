import {test} from 'node:test';
import assert from 'node:assert/strict';
import {texturePixels, checkTextureBudget} from '../src/texture-budget.mjs';
function header(w, h) {
  const b = new Uint8Array(24); b.set([137,80,78,71,13,10,26,10]); b.set([73,72,68,82], 12);
  const v = new DataView(b.buffer); v.setUint32(8, 13); v.setUint32(16, w); v.setUint32(20, h); return b;
}
const garments = Object.fromEntries(['top','bottom'].map(s => [s, {assets: {front:s+'1',back:s+'2',frontBump:s+'3',backBump:s+'4'}}]));
test('PNG dimensions are checked before decode', () => {
  assert.equal(texturePixels(header(1024, 512)), 524288);
  for (const bytes of [header(0, 512), header(2049, 1), new Uint8Array(24)]) assert.throws(() => texturePixels(bytes));
});
test('aggregate includes all nine allocated texture slots, not only unique URLs', async () => {
  let count = 0;
  const load = async () => { count++; return {ok:true, arrayBuffer:async () => header(1024, 1024).buffer}; };
  await assert.rejects(checkTextureBudget('head', garments, load), /texture_pixel_budget/); assert.equal(count, 9);
  assert.equal(await checkTextureBudget('head', garments, async () => ({ok:true,arrayBuffer:async () => header(512, 512).buffer})), 9 * 512 * 512);
});
test('missing resources fail before constructing an appearance', async () => {
  await assert.rejects(checkTextureBudget('head', garments, async () => ({ok:false})), /texture_resource_unavailable/);
});

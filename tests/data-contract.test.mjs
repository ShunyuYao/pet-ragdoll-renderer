import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeAppearance, validateShape} from '../src/data-contract.mjs';
function fixture() {
  const assets = {head: 'plugin://rat-doll-renderer/__appearance__/head'};
  const garments = {};
  for (const [slot, kind] of [['top', 'tee'], ['bottom', 'shorts']]) {
    garments[slot] = {kind, assets: {}};
    for (const field of ['front', 'back', 'frontBump', 'backBump', 'shape']) {
      const key = slot + field; garments[slot].assets[field] = key;
      assets[key] = 'plugin://rat-doll-renderer/__appearance__/' + key;
    }
  }
  return {dataVersion: 2, data: {person: 'male', headScale: 1.35, garments}, assets};
}
test('two independent outfits resolve only host-assigned handles', () => {
  const a = fixture(), b = fixture(); b.data.person = 'female'; b.data.garments.top.kind = 'sweater'; b.data.garments.bottom.kind = 'denim';
  assert.equal(decodeAppearance(a).garments.top.assets.front, a.assets.topfront);
  assert.equal(decodeAppearance(b).garments.top.kind, 'sweater');
  assert.equal(decodeAppearance(a).garments.top.kind, 'tee');
});
test('incomplete v1 and invalid scales fail explicitly', () => {
  for (const change of [x => x.dataVersion = 1, x => x.data.headScale = 3, x => x.data.headScale = NaN, x => delete x.assets.head, x => delete x.data.garments.bottom]) {
    const x = fixture(); change(x); assert.throws(() => decodeAppearance(x), /invalid_appearance/);
  }
});
test('appearance JSON cannot inject file/network URLs or inherited resources', () => {
  for (const url of ['https://example.com/head.png', 'file:///head.png', 'data:image/png;base64,AA', 'plugin://other/__appearance__/head', 'plugin://rat-doll-renderer/renderer.mjs']) {
    const x = fixture(); x.assets.head = url; assert.throws(() => decodeAppearance(x));
  }
  const x = fixture(); x.data.garments.top.assets.front = 'https://example.com/texture'; assert.throws(() => decodeAppearance(x));
  const y = fixture(); y.assets = Object.create(y.assets); assert.throws(() => decodeAppearance(y));
});
test('bounded contour accepts actual shape format and rejects invalid geometry budgets', () => {
  const valid = () => ({outline: [[0, 0], [1, 0], [.5, 1]], distance: {size: 2, pixels: [0, 4, 8, 1]}});
  assert.equal(validateShape(valid()).outline.length, 3);
  for (const change of [x => x.outline[0][0] = NaN, x => x.outline[0][0] = -1, x => x.outline = Array(1025).fill([0, 0]), x => x.distance.size = 129, x => x.distance.pixels.push(0), x => x.distance.pixels[0] = 256]) {
    const x = valid(); change(x); assert.throws(() => validateShape(x), /invalid_appearance/);
  }
});
test('byte encoded distance maps are lossless, bounded and unambiguous', () => {
  const values = [0, 127, 255, 7];
  const encoded = {outline: [[0, 0], [1, 0], [.5, 1]], distance: {size: 2, bytes: Buffer.from(values).toString('base64')}};
  assert.deepEqual(validateShape(encoded).distance.pixels, values);
  assert.equal(encoded.distance.pixels, undefined, 'do not mutate immutable input');
  for (const bytes of ['', 'AA==', 'AAAAAAAAAAAA', 'AA??AA==', 'AH//Bz==']) {
    assert.throws(() => validateShape({...encoded, distance: {size: 2, bytes}}));
  }
  assert.throws(() => validateShape({...encoded, distance: {size: 2, pixels: values, bytes: encoded.distance.bytes}}));
});

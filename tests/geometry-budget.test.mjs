import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePattern} from '../src/garment-rig.js';
test('normal garment panel creates bounded connected triangles', () => {
  const mesh = makePattern({outline: [[.1, .1], [.9, .1], [.9, .9], [.1, .9]]}, 'sweater');
  assert.ok(mesh.vertices.length > 4 && mesh.vertices.length <= 12000);
  assert.ok(mesh.triangles.length > 2 && mesh.triangles.length <= 24000);
});
test('small malicious contour cannot expand past the derived geometry budget', () => {
  let seed = 1;
  const next = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const outline = Array.from({length: 1024}, () => [next(), next()]);
  assert.throws(() => makePattern({outline}, 'sweater'), /garment_geometry_budget/);
});
test('empty triangulation is rejected instead of mounting an invisible garment', () => {
  assert.throws(() => makePattern({outline: [[.5, .5], [.5, .5], [.5, .5]]}, 'tee'), /invalid_garment_contour/);
});

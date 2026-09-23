import test from 'node:test';
import assert from 'node:assert/strict';
import {STANDARD_CLIPS,canonicalFrame,validateRecipe} from '../experiments/ordinary/spec.mjs';
test('ordinary spec preserves the complete standard set and authored one-shot semantics',()=>{
 assert.equal(Object.keys(STANDARD_CLIPS).length,11);
 assert.equal(Object.values(STANDARD_CLIPS).reduce((n,s)=>n+s.count,0),241);
 assert.deepEqual(Object.entries(STANDARD_CLIPS).filter(([,s])=>!s.loop).map(([name])=>name),['greet','speak','wake','peek','unpeek']);
 assert(Object.values(STANDARD_CLIPS).every(s=>s.face===-1));
 assert.deepEqual(STANDARD_CLIPS.edgehide,{count:1,fps:1,face:-1,loop:true});
});
test('reverse and hold reference the exact entering pose, without extra output frames',()=>{
 for(let i=0;i<24;i++)assert.deepEqual(canonicalFrame('unpeek',i),canonicalFrame('peek',23-i));
 assert.deepEqual(canonicalFrame('edgehide',0),canonicalFrame('peek',23));
 assert.deepEqual(canonicalFrame('send',7),{clip:'haul',frame:7});
});
test('out-of-range and nonstandard requests cannot reach pose arithmetic',()=>{
 for(const c of ['cast','celebrate','haul','constructor','__proto__','unknown'])assert.throws(()=>canonicalFrame(c,0),/invalid_frame/);
 for(const n of [-1,24,NaN,Infinity,.5,'0'])assert.throws(()=>canonicalFrame('walk',n),/invalid_frame/);
 assert.throws(()=>canonicalFrame('edgehide',1));
});
test('photo-specific attachment is required data, never an implicit identity default',()=>{
 validateRecipe([0,1]);validateRecipe([.5,.5]);
 for(const uv of [undefined,null,[],[0],[0,0,0],[NaN,0],[Infinity,0],[-.1,0],[1.1,0],['.5',0]])assert.throws(()=>validateRecipe(uv),/invalid_peek_landmark/);
});

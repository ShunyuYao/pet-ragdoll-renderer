import test from 'node:test';
import assert from 'node:assert/strict';
import {STANDARD_CLIPS,canonicalFrame,validateRecipe} from '../experiments/ordinary/spec.mjs';
import {composeFrame} from '../experiments/ordinary/compose.mjs';
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
test('pixel composition keeps transparent output, opaque background and scale bounds',()=>{
 const body={width:4,height:4,data:new Uint8ClampedArray(64).fill(255)};
 const head={width:1,height:1,data:new Uint8ClampedArray([200,20,40,0])};
 const layers={body,head,anchor:[2,2],headOrigin:[2,2],headDensity:1};
 assert.deepEqual(composeFrame(layers,1).data,body.data);
 assert(composeFrame({...layers,hidden:true},1).data.every(value=>value===0));
 for(const scale of [0,.5,2.1,NaN,Infinity])assert.throws(()=>composeFrame(layers,scale),/invalid_head_scale/);
 assert(body.data.every(value=>value===255),'source pixels never mutate');
});

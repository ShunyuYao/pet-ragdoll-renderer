import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReleaseMotion} from '../src/release-motion.mjs';
const feed=(m,rows)=>rows.forEach(([t,x,y=0])=>m.sample({t,x,y}));
test('slow travel stays place regardless of total distance',()=>{
 const m=createReleaseMotion();for(let t=0;t<=2000;t+=20)m.sample({t,x:t*.2,y:0});assert.equal(m.finish(2000).kind,'place');
});
test('deliberate placement below 0.55 DIP per ms stays place',()=>{
 for(const [vx,vy] of [[.2,0],[.54,0],[0,-.54],[.3,.3]]){const m=createReleaseMotion();for(let t=0;t<=200;t+=10)m.sample({t,x:t*vx,y:t*vy});assert.equal(m.finish(200).kind,'place');}
});
test('comfortable flicks from 0.55 DIP per ms throw in every direction',()=>{
 for(const [vx,vy] of [[.55,0],[.75,0],[0,-.75],[.5,.5],[1.1,0]]){const m=createReleaseMotion();for(let t=0;t<=200;t+=10)m.sample({t,x:t*vx,y:t*vy});assert.equal(m.finish(200).kind,'throw');}
});
test('a brief 40 ms release delay retains moderate throw intent',()=>{
 for(const step of [8,16,20]){const m=createReleaseMotion();for(let t=0;t<=240;t+=step)m.sample({t,x:t*.9,y:0});assert.equal(m.finish(280).kind,'throw');}
});
test('brief flick after holding still throws but a full pause cancels it',()=>{
 const m=createReleaseMotion();feed(m,[[0,0],[500,0],[520,24],[540,48],[560,72],[580,96]]);assert.equal(m.finish(600).kind,'throw');assert.equal(m.finish(740).kind,'place');
});
test('a slow correction cancels a preceding fast throw in either direction',()=>{
 for(const sign of [-1,1]){const m=createReleaseMotion();feed(m,[[0,0],[20,50],[40,100],[60,150],[80,145],[100,140]].map(([t,x])=>[t,x*sign]));assert.equal(m.finish(100).kind,'place');}
});
test('horizontal, vertical and diagonal throws use recent two dimensional speed',()=>{
 for(const [vx,vy] of [[2.4,0],[0,-2.4],[1.4,1.4]]){const m=createReleaseMotion();for(let t=0;t<=200;t+=16)m.sample({t,x:t*vx,y:t*vy});assert.equal(m.finish(200).kind,'throw');}
});
test('pause ages a previous fling out even with no mousemove events',()=>{
 const m=createReleaseMotion();feed(m,[[0,0],[20,40],[40,80],[60,120]]);assert.equal(m.finish(60).kind,'throw');assert.equal(m.finish(200).kind,'place');
});
test('final reverse movement wins over prior fling direction',()=>{
 const m=createReleaseMotion();feed(m,[[0,0],[20,40],[40,80],[60,120],[80,80],[100,40]]);const r=m.finish(100);assert.equal(r.kind,'throw');assert.ok(r.velocityX<0);
});
test('stationary noise, a click and sparse old movement are not a throw',()=>{
 for(const rows of [[[0,0],[1,1]],[[0,0]],[[0,0],[1000,20]],[[0,0],[20,1],[40,0],[60,1]]]){const m=createReleaseMotion();feed(m,rows);assert.equal(m.finish(rows.at(-1)[0]).kind,'place');}
});
test('short window is comparable across sampling rates and discards old speed',()=>{
 for(const step of [8,16,32]){const m=createReleaseMotion();for(let t=0;t<=400;t+=step)m.sample({t,x:t*2.4,y:0});assert.equal(m.finish(400).kind,'throw');assert.equal(m.finish(550).kind,'place');}
});
test('new pickup, invalid input and clock discontinuity cannot reuse old intent',()=>{
 const m=createReleaseMotion();feed(m,[[0,0],[20,40],[40,80]]);m.reset({t:100,x:80,y:0});assert.equal(m.finish(120).kind,'place');
 m.sample({t:NaN,x:200,y:0});m.sample({t:110,x:Infinity,y:0});assert.equal(m.finish(130).kind,'place');
 m.sample({t:10,x:300,y:0});assert.equal(m.finish(10).kind,'place');
});

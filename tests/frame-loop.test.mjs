import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFrameLoop} from '../src/frame-loop.mjs';

function fixture(){
 let clock=0,next=0,active=true;
 const queue=new Map(),ticks=[],errors=[];
 const loop=createFrameLoop({requestFrame:fn=>{const id=next++;queue.set(id,fn);return id;},cancelFrame:id=>queue.delete(id),now:()=>clock,tick:(dt,time)=>ticks.push({dt,time}),shouldContinue:()=>active,onError:e=>errors.push(e)});
 return {loop,queue,ticks,errors,setActive:v=>active=v,advance(ms){clock+=ms;const jobs=[...queue.values()];queue.clear();for(const fn of jobs)fn();}};
}
test('one callback per refresh, including a zero request id and repeated wake',()=>{
 const f=fixture();f.loop.start();f.loop.start();assert.equal(f.queue.size,1);
 for(let i=0;i<120;i++)f.advance(1000/60);
 assert.equal(f.ticks.length,120);assert.equal(f.queue.size,1);assert.ok(f.ticks.every(t=>Math.abs(t.dt-1/60)<1e-9));
 f.loop.stop();assert.equal(f.queue.size,0);assert.equal(f.loop.active,false);
});
test('idle stops, a later wake resets elapsed time, suspended time is bounded',()=>{
 const f=fixture();f.loop.start();f.advance(16);f.setActive(false);f.advance(16);assert.equal(f.queue.size,0);
 f.advance(60000);f.setActive(true);f.loop.start();f.advance(8);assert.equal(f.ticks.at(-1).dt,.008);
 f.advance(1000);assert.equal(f.ticks.at(-1).dt,.05);
});
test('a canceled callback cannot revive an old generation after restart',()=>{
 const f=fixture();f.loop.start();const late=[...f.queue.values()][0];f.loop.stop();f.loop.start();late();assert.equal(f.ticks.length,0);assert.equal(f.queue.size,1);f.advance(10);assert.equal(f.ticks.length,1);
});
test('stop during a tick prevents rescheduling and errors stop before reporting',()=>{
 let callback,cancelled=0,failure;
 const loop=createFrameLoop({requestFrame:fn=>{callback=fn;return 0;},cancelFrame:()=>cancelled++,now:()=>1,tick:()=>loop.stop(),shouldContinue:()=>true,onError:()=>assert.fail()});
 loop.start();callback();assert.equal(loop.active,false);
 const broken=createFrameLoop({requestFrame:fn=>{callback=fn;return 1;},cancelFrame:()=>cancelled++,now:()=>1,tick:()=>{throw Error('render failed');},shouldContinue:()=>true,onError:e=>{assert.equal(broken.active,false);failure=e;}});
 broken.start();callback();assert.match(failure.message,/render failed/);assert.equal(broken.active,false);
});
test('different refresh rates advance physical elapsed time rather than frame counts',()=>{
 for(const hz of [30,60,120]){const f=fixture();f.loop.start();for(let i=0;i<hz;i++)f.advance(1000/hz);assert.ok(Math.abs(f.ticks.reduce((n,t)=>n+t.dt,0)-1)<1e-9);f.loop.stop();}
});

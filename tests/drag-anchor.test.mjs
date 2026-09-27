import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Body,Vec3} from '../src/vendor/cannon-es.js';
import {followGrabTarget} from '../src/drag-anchor.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function setup(){const anchor=new Body({mass:0}),bodies=[new Body({mass:1,position:new Vec3(0,0,1)}),new Body({mass:1,position:new Vec3(1,0,0)})];for(const b of bodies){b.velocity.set(2,3,4);b.angularVelocity.set(4,3,2);}return {anchor,bodies};}
test('ordinary pointer travel preserves the original physics input without translating bodies',()=>{
 const {anchor,bodies}=setup();followGrabTarget(anchor,new Vec3(.2,0,0),bodies,1/60);close(anchor.position.x,.2);close(bodies[0].position.x,0);close(bodies[1].position.x,1);
});
test('large jump reaches pointer immediately but only old bounded travel reaches constraint',()=>{
 const {anchor,bodies}=setup(),target=new Vec3(6,0,0);followGrabTarget(anchor,target,bodies,1/60);
 close(anchor.position.distanceTo(target),0);close(anchor.position.x-bodies[0].position.x,20/60);
 close(bodies[1].position.x-bodies[0].position.x,1);close(bodies[0].position.z,1);
 for(const b of bodies){assert.deepEqual(b.velocity.toArray(),[2,3,4]);assert.deepEqual(b.angularVelocity.toArray(),[4,3,2]);close(b.previousPosition.x,b.position.x);close(b.interpolatedPosition.x,b.position.x);assert.equal(b.aabbNeedsUpdate,true);}
});
test('fast reversal preserves inter-body geometry and introduces no anchor velocity',()=>{
 const {anchor,bodies}=setup();for(const target of [new Vec3(8,0,2),new Vec3(-5,0,1),new Vec3(7,0,3)]){followGrabTarget(anchor,target,bodies,1/60);close(anchor.position.distanceTo(target),0);close(bodies[1].position.x-bodies[0].position.x,1);close(bodies[0].position.z-bodies[1].position.z,1);close(anchor.velocity.length(),0);}
});
test('stationary input cannot move the rig or inject energy',()=>{
 const {anchor,bodies}=setup();const before=bodies.map(b=>b.position.toArray());for(let i=0;i<100;i++)followGrabTarget(anchor,new Vec3(),bodies,1/60);assert.deepEqual(bodies.map(b=>b.position.toArray()),before);
});

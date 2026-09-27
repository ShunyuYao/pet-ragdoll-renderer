import * as THREE from './vendor/three.module.js';
import * as CANNON from './vendor/cannon-es.js';
import './sdk-bridge.mjs';
import {createAppearance} from './appearance.mjs';
import {pose} from './pose.mjs';
import {createReleaseMotion} from './release-motion.mjs';
import {createRecoveryPose} from './recovery-pose.mjs';
import {createFrameLoop} from './frame-loop.mjs';
import {followGrabTarget} from './drag-anchor.mjs';

const SPAN=5.3;
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.append(renderer.domElement);
const copy=document.createElement('canvas'), copyCtx=copy.getContext('2d',{willReadFrequently:true});
scene.add(new THREE.AmbientLight(0xffffff,1.55));
const key=new THREE.DirectionalLight('#fff6e6',1.65);key.position.set(-4,-6,9);scene.add(key);
const fill=new THREE.DirectionalLight('#d6e4ff',.6);fill.position.set(4,4,6);scene.add(fill);
const camera=new THREE.OrthographicCamera(-SPAN/2,SPAN/2,SPAN/2,-SPAN/2,.1,40);camera.up.set(0,0,1);
const world=new CANNON.World({gravity:new CANNON.Vec3(0,0,-9.82)});
world.solver.iterations=24;world.defaultContactMaterial.friction=.6;world.defaultContactMaterial.restitution=.03;
const floor=new CANNON.Body({mass:0,shape:new CANNON.Plane()});floor.collisionFilterGroup=1;world.addBody(floor);
const ray=new THREE.Raycaster(), draggable=[];
let doll,config,session,initialized=false,phase='loading',seq=0,inFlight=null,lastSent=0;
let grabConstraint=null,grabAnchor=null,target=null,landedAt=null,recovery=null,frameCount=0,grabs=0,landed=0;
let center={x:0,z:2.48},lastInputAt=0,grabbedPart=null;
let lastPick=null;
let flip=1;
const releaseMotion=createReleaseMotion();
let grabPoint=null,lastPointer=null,lastRelease=null;
const transitions=[];
const presentedPoses=new Map();
function change(next){if(phase!==next){phase=next;transitions.push({phase,at:performance.now()});}}
const ppu=()=>config.size/SPAN;
const screenToWorld=(x,y)=>new THREE.Vector3((flip===-1?config.workArea.x+config.workArea.width-x:x-config.workArea.x)/ppu(),0,(config.workArea.y+config.workArea.height-y)/ppu());
function visuals(){
  for(const b of doll.bodies){b.visual.position.copy(b.position);b.visual.quaternion.copy(b.quaternion);}
  doll.garments.update();scene.updateMatrixWorld(true);
}
function bounds(){
  const box=new THREE.Box3();
  for(const g of doll.garments.items)if(g.mesh.visible){g.mesh.computeBoundingBox();box.union(new THREE.Box3().setFromObject(g.mesh));}
  for(const b of doll.bodies)box.union(new THREE.Box3().setFromObject(b.visual));
  return box;
}
function savePose(){return doll.bodies.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));}
function restorePose(values){doll.bodies.forEach((b,i)=>{b.position.copy(values[i].p);b.quaternion.copy(values[i].q);});visuals();}
function clearMotion(b){b.velocity.setZero();b.angularVelocity.setZero();b.force.setZero();b.torque.setZero();b.aabbNeedsUpdate=true;b.wakeUp();}
function authored(x,z,frame=0,clip='idle'){
  pose(doll,clip,frame%24);
  for(const b of doll.bodies){b.position.x+=x;b.position.z+=z;clearMotion(b);}
  visuals();
}
function release(input){
  const wasHeld=phase==='grabbing';
  if(grabConstraint)world.removeConstraint(grabConstraint);
  if(grabAnchor)world.removeBody(grabAnchor);
  grabConstraint=grabAnchor=target=null;
  if(wasHeld){
    if(input){
      lastRelease=releaseMotion.finish(input.t);
      if(lastRelease.kind==='place'){startRecovery(lastPointer);return;}
    }
    change('falling');landedAt=null;
  }
}
function pick(x,y){
  const p=screenToWorld(x,y);
  doll.garments.refreshBounds();
  for(const g of doll.garments.items)g.mesh.computeBoundingBox();
  // The static clip is sampled at 12 fps and antialiased. Permit a four-DIP
  // silhouette tolerance when crossing from that frame into the continuous rig.
  for(const [dx,dz] of [[0,0],[2,0],[-2,0],[0,2],[0,-2],[4,0],[-4,0],[0,4],[0,-4]]){
    ray.setFromCamera(new THREE.Vector2((p.x+dx/ppu()-center.x)/(SPAN/2),(p.z+dz/ppu()-center.z)/(SPAN/2)),camera);
    const hit=ray.intersectObjects(draggable.filter(o=>o.visible&&o.parent?.visible!==false),false)[0];
    if(hit)return {point:hit.point,body:hit.object.userData.garment?doll.garments.pickBody(hit.point):hit.object.userData.body};
  }
  return null;
}
function begin(p){
  let saved=null,shown=null;
  if(phase==='idle'){
    flip=p.view.flip;
    const c=screenToWorld(p.view.x+config.size/2,p.view.y+config.size/2);
    authored(c.x,c.z-2.48,p.view.frame,p.view.clip);center={x:c.x,z:c.z};updateCamera();
  }else if(presentedPoses.has(p.view.presentedSeq)){
    // Hit-test what the user actually saw, then attach that local point to the
    // current body. Slow display / transport must not make a visible toy ungrabbable.
    shown=presentedPoses.get(p.view.presentedSeq);saved={pose:savePose(),center:{...center}};
    restorePose(shown.pose);center={...shown.center};updateCamera();
  }
  const hit=pick(shown?shown.x+p.view.localX:p.x,shown?shown.y+p.view.localY:p.y);
  const pivot=hit?.body.pointToLocalFrame(new CANNON.Vec3(hit.point.x,hit.point.y,hit.point.z));
  if(saved){restorePose(saved.pose);center=saved.center;updateCamera();}
  lastPick={x:p.x,y:p.y,view:p.view,center:{...center},hit:!!hit};
  if(!hit){window.renderHost.fail('grab_target_mismatch');return;}
  release();recovery=null;landedAt=null;
  grabbedPart=hit.body.dollPartName;grabs++;
  grabPoint={body:hit.body,pivot:pivot.clone()};lastPointer={x:p.x,y:p.y,t:p.t};lastRelease=null;releaseMotion.reset(lastPointer);
  grabAnchor=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC,collisionFilterGroup:0,collisionFilterMask:0});
  hit.body.pointToWorldFrame(pivot,grabAnchor.position);world.addBody(grabAnchor);
  grabConstraint=new CANNON.PointToPointConstraint(hit.body,pivot,grabAnchor,new CANNON.Vec3(),700);
  world.addConstraint(grabConstraint);target=grabAnchor.position.clone();
  change('grabbing');lastInputAt=p.t;lastSent=0;
}
function startRecovery(placeAt){
  const from=savePose();
  let x=doll.parts.pelvis.position.x,z=0;
  authored(0,0,0);
  const bottom=bounds().min.z;
  if(placeAt&&grabPoint){
    const point=screenToWorld(placeAt.x,placeAt.y),anchor=grabPoint.body.pointToWorldFrame(grabPoint.pivot);
    x=point.x-anchor.x;z=point.z-anchor.z;
  }else z=-bottom;
  x=Math.max(SPAN/2,Math.min(config.workArea.width/ppu()-SPAN/2,x));
  z=Math.max(-bottom,Math.min(config.workArea.height/ppu()-2.48-SPAN/2,z));
  for(const b of doll.bodies){b.position.x+=x;b.position.z+=z;}
  recovery={from,to:savePose(),at:performance.now()};
  recovery.skeleton=createRecoveryPose(doll,recovery.from,recovery.to);
  doll.bodies.forEach((b,i)=>{b.position.copy(from[i].p);b.quaternion.copy(from[i].q);clearMotion(b);});
  // Authoring the destination updated the visible meshes too. Restore both
  // representations before this tick can emit; otherwise the destination pose
  // flashes for one frame before the interpolation returns to the fallen pose.
  visuals();
  change('recovering');
}
function updateCamera(){camera.position.set(center.x,-9,center.z);camera.lookAt(center.x,0,center.z);camera.updateMatrixWorld(true);}
function emit(now){
  if(inFlight!==null)return;
  const box=bounds();
  // Moving the crop changes only the camera/window pair, never the physics world.
  if(phase!=='idle')center={x:(box.min.x+box.max.x)/2,z:Math.max(SPAN/2,(box.min.z+box.max.z)/2)};
  updateCamera();renderer.render(scene,camera);
  copyCtx.clearRect(0,0,copy.width,copy.height);copyCtx.save();
  if(flip===-1){copyCtx.translate(copy.width,0);copyCtx.scale(-1,1);}
  copyCtx.drawImage(renderer.domElement,0,0);copyCtx.restore();
  const pixels=copyCtx.getImageData(0,0,copy.width,copy.height).data;
  const x=config.workArea.x+(flip===-1?config.workArea.width-center.x*ppu():center.x*ppu())-config.size/2;
  const y=config.workArea.y+config.workArea.height-center.z*ppu()-config.size/2;
  inFlight=++seq;lastSent=now;frameCount++;
  presentedPoses.set(seq,{pose:savePose(),center:{...center},x,y});
  while(presentedPoses.size>8)presentedPoses.delete(presentedPoses.keys().next().value);
  window.renderHost.frame({session,seq,width:copy.width,height:copy.height,pixels,x,y,phase,landed,
    release:lastRelease,
    inputAt:lastInputAt,producedAt:Date.now(),grabbedPart,grabs,lastPick,character:config.character,headScale:config.headScale,
    bodies:doll.bodies.map(b=>({part:b.dollPartName,x:b.position.x,z:b.position.z,q:[b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w]})),
    constraints:world.constraints.length,bodyCount:world.bodies.length,
    bounds:{minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z},
    clipped:box.max.x-box.min.x>SPAN||box.max.z-box.min.z>SPAN,
  });
}
async function init(p){
  if(config)return;
  config=p;session=p.session;
  renderer.setSize(p.pixelSize,p.pixelSize,false);copy.width=copy.height=p.pixelSize;
  doll=await createAppearance(p,scene,world,draggable);
  const origin=screenToWorld(p.x+p.size/2,p.y+p.size/2);
  authored(origin.x,origin.z-2.48,0);center={x:origin.x,z:origin.z};initialized=true;change('idle');emit(performance.now());if(inFlight===null)wakeLoop();
}
window.renderHost.onControl(p=>{
  try{
    if(p.type==='init'){init(p).catch(e=>window.renderHost.fail(e.stack));return;}
    if(!initialized||p.session!==session)return;
    if(p.type==='ack'){if(p.seq===inFlight)inFlight=null;if(phase==='idle'&&lastSent===0)wakeLoop();return;}
    if(p.type==='begin'){begin(p);wakeLoop();}
    if(p.type==='move'&&grabAnchor){const point=screenToWorld(p.x,p.y);
      lastPointer={x:p.x,y:p.y,t:p.t};releaseMotion.sample(lastPointer);
      target.set(Math.max(0,Math.min(config.workArea.width/ppu(),point.x)),grabAnchor.position.y,Math.max(.1,Math.min(config.workArea.height/ppu(),point.z)));lastInputAt=p.t;}
    if(p.type==='end')release(p);
    if(p.type==='cancel'){release();change('idle');lastSent=0;wakeLoop();}
  }catch(e){window.renderHost.fail(e.stack);}
});
function tickRealtime(dt,now){
  try{
    if(!initialized)return;
    if(['grabbing','falling','settling'].includes(phase)){
      if(grabAnchor&&target){
        // Carry excess movement with the rig, so fast input remains responsive
        // while the constraint receives the same bounded relative travel.
        followGrabTarget(grabAnchor,target,doll.bodies,dt);
      }
      world.step(1/120,dt,6);visuals();
      if(!doll.bodies.every(b=>[b.position.x,b.position.y,b.position.z].every(Number.isFinite)))throw Error('physics_nonfinite');
      const contact=world.contacts.some(c=>c.bi===floor||c.bj===floor);
      if(phase==='falling'&&contact){landed++;landedAt=now;change('settling');}
      if(phase==='settling'&&now-landedAt>650)startRecovery();
    }else if(phase==='recovering'){
      const t=Math.min(1,(now-recovery.at)/850);
      recovery.skeleton.apply(t);
      visuals();
      const bottom=bounds().min.z;
      if(bottom<0){for(const b of doll.bodies)b.position.z-=bottom;visuals();}
      if(t===1){
        const base=doll.parts.pelvis.position.z-(1.86-.01);
        center={x:doll.parts.pelvis.position.x,z:base+2.48};
        change('idle');lastSent=0;
      }
    }
    if(phase!=='idle'||lastSent===0)emit(now);
  }catch(e){stopLoop();window.renderHost.fail(e.stack);}
}
const loop=createFrameLoop({
  requestFrame:callback=>requestAnimationFrame(callback),cancelFrame:id=>cancelAnimationFrame(id),
  now:()=>performance.now(),tick:tickRealtime,shouldContinue:()=>phase!=='idle',
  onError:error=>window.renderHost.fail(error.stack),
});
function stopLoop(){loop.stop();}
function wakeLoop(){loop.start();}
window.addEventListener('pagehide',stopLoop);
Object.defineProperty(window,'m0Physics',{get:()=>({...window.renderHost.diagnostics,phase,loopActive:loop.active,pointer:lastPointer?{...lastPointer}:null,grabLag:grabAnchor&&target?grabAnchor.position.distanceTo(target)*ppu():null,grabBodyLag:grabAnchor&&grabPoint?grabPoint.body.pointToWorldFrame(grabPoint.pivot).distanceTo(grabAnchor.position)*ppu():null,grabs,landed,frameCount,inFlight,transitions,bodyCount:world.bodies.length,constraintCount:world.constraints.length,appearance:doll?.inspectAppearance()})});

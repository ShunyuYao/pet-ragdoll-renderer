// Preserve the old constraint's maximum relative travel, but carry the whole
// rig by any excess pointer displacement. The pointer stays current without
// feeding a large discontinuity into the solver or launching the doll harder.
export function followGrabTarget(anchor,target,bodies,dt){
 const dx=target.x-anchor.position.x,dy=target.y-anchor.position.y,dz=target.z-anchor.position.z;
 const distance=Math.hypot(dx,dy,dz),relativeTravel=20*Math.max(0,dt);
 const carry=distance>relativeTravel?1-relativeTravel/distance:0;
 if(carry>0){
  for(const body of bodies){
   for(const p of [body.position,body.previousPosition,body.interpolatedPosition]){
    if(p){p.x+=dx*carry;p.y+=dy*carry;p.z+=dz*carry;}
   }
   body.aabbNeedsUpdate=true;
  }
 }
 anchor.position.copy(target);anchor.velocity.setZero();anchor.aabbNeedsUpdate=true;
}

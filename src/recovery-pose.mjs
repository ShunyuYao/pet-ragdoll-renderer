// Recover a connected articulated skeleton, not 11 unrelated world transforms.
// Uses the rig's existing pivots and quaternion types; no separate physics world.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createRecoveryPose(doll,from,to){
  const root=doll.bodies.indexOf(doll.parts.pelvis),seen=new Set([root]),links=[];
  // The physical constraints form a tree rooted at the pelvis. Traversal order
  // matters: update the parent before solving its child's connected position.
  while(seen.size<doll.bodies.length){
    let added=false;
    for(const joint of doll.constraints){
      const a=doll.bodies.indexOf(joint.bodyA),b=doll.bodies.indexOf(joint.bodyB);
      if(seen.has(a)===seen.has(b))continue;
      const forward=seen.has(a),parent=forward?a:b,child=forward?b:a;
      const pp=forward?joint.pivotA:joint.pivotB,cp=forward?joint.pivotB:joint.pivotA;
      const local=pose=>{
        const p=pose[parent],c=pose[child],inverse=p.q.inverse();
        const pa=p.q.vmult(pp);pa.vadd(p.p,pa);
        const ca=c.q.vmult(cp);ca.vadd(c.p,ca);ca.vsub(pa,ca);
        return {q:inverse.mult(c.q),gap:inverse.vmult(ca)};
      };
      links.push({parent,child,pp,cp,from:local(from),to:local(to)});seen.add(child);added=true;
    }
    if(!added)throw Error('recovery_rig_disconnected');
  }
  return {apply(t){
    const pelvis=doll.bodies[root];
    from[root].p.lerp(to[root].p,smooth(t),pelvis.position);
    from[root].q.slerp(to[root].q,smooth(t/.82),pelvis.quaternion);
    for(const link of links){
      const parent=doll.bodies[link.parent],child=doll.bodies[link.child],part=child.dollPartName;
      // Torso comes upright first; hands and feet settle slightly later. Local
      // rotations keep a bent elbow/knee attached throughout that follow-through.
      const delay=part.includes('Arm')?.10:part.includes('Leg')?.04:0;
      const progress=smooth((t-delay)/(1-delay));
      const q=link.from.q.slerp(link.to.q,progress);parent.quaternion.mult(q,child.quaternion);
      // Blend the solver's small initial error away early, preserving accepted
      // authored neck/shoulder offsets at the final pose instead of snapping.
      const gap=link.from.gap.clone();link.from.gap.lerp(link.to.gap,smooth(t/.32),gap);
      gap.vadd(link.pp,gap);parent.quaternion.vmult(gap,child.position);child.position.vadd(parent.position,child.position);
      child.position.vsub(child.quaternion.vmult(link.cp),child.position);
    }
  }};
}

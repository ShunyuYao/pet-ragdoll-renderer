// Authoring only: the transparent canvas right border IS the desktop edge.
// Left-edge composition is mirrored by the host; no wall is baked into frames.
import * as CANNON from '../../src/vendor/cannon-es.js';
export const EDGE_CLIPS={peek:24,edgehide:1,unpeek:24};
const v=(x=0,y=0,z=0)=>new CANNON.Vec3(x,y,z);
const q=a=>new CANNON.Quaternion(0,Math.sin(a/2),0,Math.cos(a/2));
const at=(p,r,x,y,z)=>{const out=r.vmult(v(x,y,z));out.vadd(p,out);return out;};
export function posePeek(doll,clip,frame){
 // The head eases straight into view, without a separate hand/anticipation beat.
 // Withdrawal reverses the same frames; hold equals the last entering pose.
 const f=clip==='edgehide'?23:clip==='unpeek'?23-frame:frame,p=f/23;
 const reveal=Math.sin(p*Math.PI/2),lean=-.24-.42*reveal;
 const pelvis=v(2.43+.44*(1-reveal),0,1.61),rotation=q(lean);
 const set=(name,position,orientation=rotation)=>{const b=doll.parts[name];b.position.copy(position);b.quaternion.copy(orientation);};
 set('pelvis',pelvis);
 const upper=at(pelvis,rotation,0,0,.49);set('upperBody',upper);
 const shoulder=at(upper,rotation,0,0,.35);
 set('head',at(shoulder,rotation,0,0,.35),q(lean-.065*Math.sin(Math.PI*reveal)));
 for(const [side,sign] of [['Left',1],['Right',-1]]){
  const hip=at(pelvis,rotation,sign*.18,0,-.14);
  set('upper'+side+'Leg',at(hip,rotation,0,0,-.42));
  set('lower'+side+'Leg',at(hip,rotation,0,0,-1.23));
  // Keep the far arm behind the border. Preserve limb lengths and the
  // garment shoulder connection, without reaching or gripping the edge.
  const joint=at(shoulder,rotation,sign*.36,-.10,0);
  // Both characters use the approved tucked-back arm pose. The short sleeve
  // exposes skin along the same path as the girl's sweater sleeve.
  const elbow=v(joint.x+.48,-.10,joint.z-Math.sqrt(.62**2-.48**2));
  const wrist=v(elbow.x+.56,-.10,elbow.z-Math.sqrt(.58**2-.56**2));
  const arm=(name,start,end)=>{const angle=Math.atan2(-sign*(end.z-start.z),sign*(end.x-start.x));set(name,v((start.x+end.x)/2,-.10,(start.z+end.z)/2),q(angle));};
  arm('upper'+side+'Arm',joint,elbow);arm('lower'+side+'Arm',elbow,wrist);
  doll.parts['lower'+side+'Arm'].visual.children[0].visible=false;
 }
 for(const b of doll.bodies){b.visual.position.copy(b.position);b.visual.quaternion.copy(b.quaternion);}
 doll.garments.update();
}

// Authored pose copied from the accepted private avatar authoring source; physics stays separate.
import * as CANNON from './vendor/cannon-es.js';
const clips={idle:24,walk:24};
const vector=(x=0,y=0,z=0)=>new CANNON.Vec3(x,y,z),quat=angle=>new CANNON.Quaternion(0,Math.sin(angle/2),0,Math.cos(angle/2));
function plus(a,b){const result=new CANNON.Vec3();a.vadd(b,result);return result;}
function transform(p,q,x,y,z){return plus(p,q.vmult(vector(x,y,z)));}
export function pose(doll,clip,frame){
 for(const side of ['Left','Right'])doll.parts['lower'+side+'Arm'].visual.children[0].visible=true;
 const t=frame/clips[clip]*Math.PI*2,s=Math.sin(t),c=Math.cos(t),walking=clip==='walk',hauling=clip==='haul',happy=clip==='celebrate',sleeping=clip==='sleep';
 const energy=happy?.09:walking?.045:hauling?.025:.01;
 const lean=hauling?.13+.055*s:walking?.045*s:sleeping?.19:.022*s;
 const q=quat(lean),pelvis=vector(0,0,1.86+(happy?energy*(1-c):energy*(1-c*2*c)));
 const set=(name,p,r=q)=>{const b=doll.parts[name];b.position.copy(p);b.quaternion.copy(r);};
 set('pelvis',pelvis);const upper=transform(pelvis,q,0,0,.49);set('upperBody',upper);
 const shoulder=transform(upper,q,0,0,.35),head=transform(shoulder,q,0,0,.35);
 const headAngle=lean+(clip==='speak'?.045*s:clip==='drag'?.10*s:sleeping?.20:clip==='wake'?.20*(1-frame/clips[clip]):.025*s);
 set('head',head,quat(headAngle));
 for(const [side,sign] of [['Left',1],['Right',-1]]){
   const legAngle=walking?sign*.27*s:happy?sign*.10*s:clip==='drag'?sign*.13*s:sign*.012*s;
   const knee=walking?Math.max(0,-sign*s)*.34:happy?.10*(1-c):.025;
   const hip=transform(pelvis,q,sign*.18,0,-.14),lq=quat(legAngle),lowerQ=quat(legAngle+knee);
   set('upper'+side+'Leg',transform(hip,lq,0,0,-.42),lq);
   const kneeP=transform(hip,lq,0,0,-.84);set('lower'+side+'Leg',transform(kneeP,lowerQ,0,0,-.39),lowerQ);
   let armAngle=sign*(1.30+(walking?-.12*s*sign:.04*s*sign)),elbow=sign*.08;
   if(hauling){armAngle=sign===1?1.10+.09*s:-2.18+.09*s;elbow=sign===1?-1.12-.15*c:-.70-.15*c;}
   if(clip==='cast'){const reach=Math.sin(frame/clips[clip]*Math.PI);armAngle=sign===1?1.4-.3*reach:-1.5-.68*reach;elbow=sign===1?-.85*reach:-.70*reach;}
   if(happy){armAngle=-sign*(.55+.16*s);elbow=-sign*.50;}
   if(clip==='greet'&&sign===-1){armAngle=.25;elbow=1.05+.35*Math.sin(t*2);}
   if(sleeping){armAngle=sign*1.1;elbow=sign*.5;}
   // The physics rig's narrow .18 shoulder is a collision proxy, not the
   // garment's outer shoulder seam. Seat authored arms beside the actual loose
   // torso and slightly forward so sleeves/hands do not disappear inside it.
   const aq=quat(lean+armAngle),eq=quat(lean+armAngle+elbow),joint=transform(shoulder,q,sign*.36,-.10,0);
   set('upper'+side+'Arm',transform(joint,aq,sign*.31,0,0),aq);
   const elbowP=transform(joint,aq,sign*.62,0,0);set('lower'+side+'Arm',transform(elbowP,eq,sign*.29,0,0),eq);
 }
 for(const b of doll.bodies){b.visual.position.copy(b.position);b.visual.quaternion.copy(b.quaternion);}
 doll.garments.update();
}

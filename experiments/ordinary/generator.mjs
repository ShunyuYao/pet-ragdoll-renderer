// Experimental offline authoring; deliberately excluded from the plugin ZIP.
import * as THREE from '../../src/vendor/three.module.js';
import * as CANNON from '../../src/vendor/cannon-es.js';
import {createAppearance} from '../../src/appearance.mjs';
import {decodeAppearance} from '../../src/data-contract.mjs';
import {pose} from './poses.mjs';
import {EDGE_CLIPS} from './peek-pose.mjs';
import {canonicalFrame,validateRecipe} from './spec.mjs';
export {STANDARD_CLIPS,canonicalFrame} from './spec.mjs';
export async function createOrdinaryGenerator({appearance,peekNeckUv}) {
 validateRecipe(peekNeckUv);
 const decoded=decodeAppearance(appearance);
 const scene=new THREE.Scene(),world=new CANNON.World();
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene.add(new THREE.AmbientLight(0xffffff,1.55));
 const key=new THREE.DirectionalLight('#fff6e6',1.65);key.position.set(-4,-6,9);scene.add(key);
 const fill=new THREE.DirectionalLight('#d6e4ff',.6);fill.position.set(4,4,6);scene.add(fill);
 let disposed=false,doll;
 function dispose(){
  if(disposed)return;disposed=true;
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  scene.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
  for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  if(doll?.texture)textures.add(doll.texture);
  // Skinned meshes allocate a bone texture on first draw. Disposing material
  // maps alone leaves this allocation alive until the entire context is lost.
  for(const s of skeletons)s.dispose();
  for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();
  for(const c of [...world.constraints])world.removeConstraint(c);for(const b of [...world.bodies])world.removeBody(b);
  scene.clear();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
 }
 try{doll=await createAppearance({...decoded,headScale:1},scene,world,[]);}catch(error){dispose();throw error;}
function setPreviewHeadScale(doll,scale){
 const head=doll.parts.head.visual.children.find(c=>c.userData.photoHead);
 head.userData.originalZ??=head.position.z;
 if(head.userData.previewChinY===undefined){
  const p=head.geometry.attributes.position,halfWidth=(head.geometry.boundingBox.max.x-head.geometry.boundingBox.min.x)*.025;
  let chin=Infinity;
  // The bottom of the central photo contour is the chin/neck attachment.
  // Long hair can extend lower at the sides and must not become the pivot.
  for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<halfWidth)chin=Math.min(chin,p.getY(i));
  head.userData.previewChinY=chin;
 }
 // Photo-local Y becomes rig-local Z after its existing quarter-turn rotation.
 // Grow upwards from the bottom of the cutout, preserving the neck connection.
 head.scale.setScalar(scale);
 head.position.z=head.userData.originalZ+head.userData.previewChinY*(1-scale);
 return head;
}
function photoNeckPoint(doll,head,peekNeckUv){
 if(head.userData.peekChinPoint)return head.userData.peekChinPoint.clone();
 const [u,v]=peekNeckUv;
 const uv=head.geometry.attributes.uv,p=head.geometry.attributes.position;
 let nearest=0,distance=Infinity;
 for(let i=0;i<p.count;i++)if(p.getZ(i)>=0){
  const error=(uv.getX(i)-u)**2+(uv.getY(i)-(1-v))**2;
  if(error<distance){distance=error;nearest=i;}
 }
 head.userData.peekChinPoint=new THREE.Vector3().fromBufferAttribute(p,nearest);
 return head.userData.peekChinPoint.clone();
}

// Average the front center of the real skinned neckline, not the collider neck
// and not a screen-space head offset. The two garments have different collars.
function garmentCollar(doll){
 const mesh=doll.garments.items[0].mesh,a=mesh.geometry.attributes.position;
 let top=-Infinity;
 for(let i=0;i<a.count;i++)if(Math.abs(a.getX(i))<.045&&a.getY(i)<0)top=Math.max(top,a.getZ(i));
 const collar=new THREE.Vector3();let count=0;
 for(let i=0;i<a.count;i++)if(Math.abs(a.getX(i))<.045&&a.getY(i)<0&&a.getZ(i)>top-.02){
  collar.add(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));count++;
 }
 if(!count)throw Error('Garment has no front neck attachment');
 return collar.divideScalar(count);
}

function renderLayers(requestedClip,requestedFrame){
 if(disposed)throw Error('generator_disposed');
 const {clip,frame}=canonicalFrame(requestedClip,requestedFrame);
 const d=doll;
 pose(d,clip,frame);const head=setPreviewHeadScale(d,1);
 const edge=!!EDGE_CLIPS[clip],shift=edge?.625:0;
 // Preserve the approved clothing/leg reveal; attach the head to the actual
 // garment collar. Arms share garment coordinates on both characters.
 const shifted=edge?d.bodies.filter(b=>b.dollPartName!=='head'&&!b.dollPartName.includes('Arm')):[];
 for(const b of shifted)b.visual.position.x+=shift;
 const layerCamera=new THREE.OrthographicCamera(-2.65,2.65,2.65,-2.65,.1,30);
 layerCamera.up.set(0,0,1);layerCamera.position.set(0,-8,2.48);layerCamera.lookAt(0,0,2.48);layerCamera.updateMatrixWorld(true);
 // 416 balances near-Retina output with the existing LAN byte/pixel budgets.
 const size=416,headDensity=3;
 renderer.setSize(size,size,false);scene.updateMatrixWorld(true);
 const photoRotation=head.quaternion.clone(),headPosition=d.parts.head.visual.position.clone();
 const neckSkin=d.parts.head.visual.children.find(o=>o!==head),neckVisible=neckSkin.visible;
 const chinPoint=edge?photoNeckPoint(d,head,peekNeckUv):new THREE.Vector3(0,head.userData.previewChinY,0);
 // Photo-local up must follow the torso, including its lean. The head rigid
 // body has a small authored wobble; cancel only that relative wobble, never
 // the whole torso rotation. All clothing and the original reveal stay put.
 if(edge){
  const relative=d.parts.head.visual.quaternion.clone().invert().multiply(d.parts.upperBody.visual.quaternion);
  head.quaternion.premultiply(relative);scene.updateMatrixWorld(true);
  const collar=garmentCollar(d),chin=head.localToWorld(chinPoint.clone());
  // Seat the chin slightly inside the collar (about six output pixels), so the
  // curved cutout and garment meet with overlap instead of a one-pixel hinge.
  collar.addScaledVector(new THREE.Vector3(0,0,1).applyQuaternion(d.parts.upperBody.visual.quaternion),-.075);
  // A collider-sized neck capsule must not protrude beside the photo chin.
  neckSkin.visible=false;
  d.parts.head.visual.position.add(collar.sub(chin));scene.updateMatrixWorld(true);
 }
 const anchor=head.localToWorld(chinPoint.clone()).project(layerCamera);
 head.visible=false;renderer.render(scene,layerCamera);const body=renderer.domElement.toDataURL('image/png');head.visible=true;
 const meshes=[];scene.traverseVisible(o=>{if(o.isMesh&&o!==head){meshes.push(o);o.visible=false;}});
 // Render the original photo at higher density BEFORE any slider scaling.
 // Crop by projected geometry (including off-screen peek), never by the viewport.
 const bounds=new THREE.Box3().setFromObject(head),points=[];
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).project(layerCamera));
 const left=Math.floor((Math.min(...points.map(p=>p.x))+1)*size/2)-2;
 const right=Math.ceil((Math.max(...points.map(p=>p.x))+1)*size/2)+2;
 const top=Math.floor((1-Math.max(...points.map(p=>p.y)))*size/2)-2;
 const bottom=Math.ceil((1-Math.min(...points.map(p=>p.y)))*size/2)+2;
 layerCamera.left=left/size*5.3-2.65;layerCamera.right=right/size*5.3-2.65;
 layerCamera.top=2.65-top/size*5.3;layerCamera.bottom=2.65-bottom/size*5.3;
 layerCamera.updateProjectionMatrix();renderer.setSize((right-left)*headDensity,(bottom-top)*headDensity,false);
 renderer.render(scene,layerCamera);const photo=renderer.domElement.toDataURL('image/png');for(const o of meshes)o.visible=true;
 head.quaternion.copy(photoRotation);d.parts.head.visual.position.copy(headPosition);neckSkin.visible=neckVisible;
 for(const b of shifted)b.visual.position.x-=shift;
 const f=clip==='edgehide'?23:clip==='unpeek'?23-frame:frame;
 return {body,head:photo,anchor:[(anchor.x+1)*size/2,(1-anchor.y)*size/2],headOrigin:[left,top],headDensity,hidden:edge&&f===0,edgeReveal:edge?Math.sin(f/23*Math.PI/2):null};
};

return {renderLayers,dispose,inspect:()=>({disposed,width:416,height:416,headDensity:3,bodies:world.bodies.length,renderer:renderer.info.memory,appearance:doll.inspectAppearance()})};
}

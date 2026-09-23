// Private shared renderer input. No photographs or personal data in this file.
import * as THREE from './vendor/three.module.js';
import * as CANNON from './vendor/cannon-es.js';
import {createRagdoll} from './ragdoll-adapter.js';
import {createWardrobe,dressPart} from './doll-appearance.js';
import {createGarments} from './garment-rig.js';
import {checkTextureBudget} from './texture-budget.mjs';

export async function createAppearance({person,headScale,headUrl,garments},scene,world,draggable){
  if(!['female','male'].includes(person)||!Number.isFinite(headScale)||headScale<.75||headScale>2)throw Error('invalid_appearance');
  await checkTextureBudget(headUrl,garments);
  const texture=await new THREE.TextureLoader().loadAsync(headUrl);
  texture.colorSpace=THREE.SRGBColorSpace;
  const doll={id:person,x:0,texture,garmentInputs:garments,wardrobe:createWardrobe(person),
    ...createRagdoll({angle:Math.PI*.62,angleShoulders:Math.PI*.8,twistAngle:Math.PI/3})};
  for(const b of doll.bodies){
    b.position.z+=.12;b.visual=dressPart(b,doll,draggable);scene.add(b.visual);
    b.collisionFilterGroup=2;b.collisionFilterMask=1;world.addBody(b);
  }
  doll.garments=await createGarments(doll,scene,draggable);
  for(const c of doll.constraints){
    if(c.bodyA===doll.parts.upperBody&&c.bodyB.dollPartName.includes('Arm')){c.pivotA.x=Math.sign(c.pivotA.x)*.36;c.pivotA.y=-.10;}
    world.addConstraint(c);
  }
  const head=doll.parts.head,photo=head.visual.children.find(o=>o.userData.photoHead);
  // Match the installed pack's ordinary-action authoring: the bottom of the
  // central photo contour is the pivot (side hair must not become the pivot).
  const vertices=photo.geometry.attributes.position;
  const halfWidth=(photo.geometry.boundingBox.max.x-photo.geometry.boundingBox.min.x)*.025;
  let chin=Infinity;
  for(let i=0;i<vertices.count;i++)if(Math.abs(vertices.getX(i))<halfWidth)chin=Math.min(chin,vertices.getY(i));
  const chinPoint=new THREE.Vector3(0,chin,0);
  const anchor=chinPoint.clone().applyQuaternion(photo.quaternion).add(photo.position);
  photo.scale.setScalar(headScale);
  // Compute in head-local coordinates, retaining the original rotation and
  // attachment as one transform. Body, sleeves and neck never scale with it.
  photo.position.copy(anchor).sub(chinPoint.clone().multiplyScalar(headScale).applyQuaternion(photo.quaternion));
  const sphere=photo.geometry.boundingSphere;
  const offset=sphere.center.clone().multiplyScalar(headScale).applyQuaternion(photo.quaternion).add(photo.position);
  head.removeShape(head.shapes[0]);head.addShape(new CANNON.Sphere(sphere.radius*headScale),new CANNON.Vec3(offset.x,offset.y,offset.z));
  doll.inspectAppearance=()=>({
    person,headScale,scale:photo.scale.toArray(),
    anchorError:chinPoint.clone().multiply(photo.scale).applyQuaternion(photo.quaternion).add(photo.position).distanceTo(anchor),
    textureWidth:texture.image.width,textureHeight:texture.image.height,
    outfit:Object.fromEntries(doll.garments.items.map(g=>[g.outfit.slot,g.kind])),
    headWorldWidth:(photo.geometry.boundingBox.max.x-photo.geometry.boundingBox.min.x)*headScale,
    colliderRadius:head.shapes[0].radius,
  });
  return doll;
}

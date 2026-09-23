export const GENERATOR_VERSION='ordinary-prototype-1';
export const STANDARD_CLIPS=Object.freeze(Object.fromEntries(
 ['idle','walk','drag','greet','speak','sleep','wake','send','peek','edgehide','unpeek'].map(name=>[name,Object.freeze({
 count:name==='edgehide'?1:24,fps:name==='edgehide'?1:12,face:-1,
 loop:!['greet','speak','wake','peek','unpeek'].includes(name)
 })])));
export function canonicalFrame(clip,frame){
 const spec=Object.hasOwn(STANDARD_CLIPS,clip)?STANDARD_CLIPS[clip]:null;
 if(!spec||!Number.isInteger(frame)||frame<0||frame>=spec.count)throw Error('invalid_frame');
 if(clip==='send')return {clip:'haul',frame};
 if(clip==='edgehide')return {clip:'peek',frame:23};
 if(clip==='unpeek')return {clip:'peek',frame:23-frame};
 return {clip,frame};
}
export function validateRecipe(uv){
 if(!Array.isArray(uv)||uv.length!==2||!uv.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('invalid_peek_landmark');
}

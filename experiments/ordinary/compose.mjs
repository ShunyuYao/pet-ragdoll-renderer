// Avatar-specific compositing stays with the plugin. The host receives only
// the finished RGBA frame; it does not interpret heads, garments or landmarks.
export function composeFrame({body,head,...meta},scale){
 if(!Number.isFinite(scale)||scale<.75||scale>2)throw Error('invalid_head_scale');
 const w=body.width,h=body.height,out=new Uint8ClampedArray(body.data),p=head.data,hw=head.width,hh=head.height;
  if(meta.hidden)return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};
  const [ax,ay]=meta.anchor,density=meta.headDensity||1;
  const [ox,oy]=meta.headOrigin||[-w/2,-h/2];
  const minX=Math.max(0,Math.floor(ax+(ox-ax)*scale)),maxX=Math.min(w,Math.ceil(ax+(ox+hw/density-ax)*scale));
  const minY=Math.max(0,Math.floor(ay+(oy-ay)*scale)),maxY=Math.min(h,Math.ceil(ay+(oy+hh/density-ay)*scale));
  // Area samples preserve fine detail when shrinking, premultiplied alpha avoids halos.
  const samples=Math.min(4,Math.max(1,Math.ceil(density/scale))),weightScale=1/(samples*samples);
  for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
   let a=0,r=0,g=0,b=0;
   for(let syi=0;syi<samples;syi++)for(let sxi=0;sxi<samples;sxi++){
   const sx=((x+(sxi+.5)/samples-ax)/scale+ax-ox)*density-.5;
   const sy=((y+(syi+.5)/samples-ay)/scale+ay-oy)*density-.5;
   const x0=Math.floor(sx),y0=Math.floor(sy),dx=sx-x0,dy=sy-y0;
   for(let j=0;j<2;j++)for(let i=0;i<2;i++){
    const xx=x0+i,yy=y0+j;if(xx<0||yy<0||xx>=hw||yy>=hh)continue;
    const n=(yy*hw+xx)*4,weight=(i?dx:1-dx)*(j?dy:1-dy)*p[n+3]/255*weightScale;
    a+=weight;r+=p[n]*weight;g+=p[n+1]*weight;b+=p[n+2]*weight;
   }
   }
   if(a===0)continue;
   const n=(y*w+x)*4,back=out[n+3]/255*(1-a),alpha=a+back;
   out[n]=(r+out[n]*back)/alpha;out[n+1]=(g+out[n+1]*back)/alpha;out[n+2]=(b+out[n+2]*back)/alpha;out[n+3]=alpha*255;
  }
  return {width:w,height:h,data:out};

}

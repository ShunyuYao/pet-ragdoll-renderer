// A comfortable flick should throw even if release trails the motion slightly.
// Keep the window bounded: deliberate placement, a pause or a slow reversal
// must still cancel throw intent instead of latching an earlier fast movement.
export const RELEASE_WINDOW_MS=120;
export const RELEASE_SPEED=.55;
export function createReleaseMotion(){
  let samples=[],direction=null;
  function sample(p){
    if(!p||![p.x,p.y,p.t].every(Number.isFinite))return;
    let previous=samples.at(-1);
    if(previous&&p.t<previous.t){samples=[];direction=null;previous=null;}
    if(previous){
      const dx=p.x-previous.x,dy=p.y-previous.y;
      // A meaningful reversal starts a new gesture; tiny hand noise must not
      // manufacture an arbitrarily short, high-speed sample window.
      if(Math.hypot(dx,dy)>=2){
        if(direction&&dx*direction.x+dy*direction.y<0)samples=[previous];
        direction={x:dx,y:dy};
      }
    }
    if(samples.at(-1)?.t===p.t)samples[samples.length-1]={...p};else samples.push({...p});
    while(samples.length>2&&samples[1].t<=p.t-RELEASE_WINDOW_MS)samples.shift();
  }
  function reset(p){samples=[];direction=null;sample(p);}
  function finish(t){
    const last=samples.at(-1);if(last)sample({...last,t});
    let velocityX=0,velocityY=0;
    if(samples.length>1){
      let first=samples[0];const end=samples.at(-1),cutoff=end.t-RELEASE_WINDOW_MS,next=samples[1];
      if(first.t<cutoff&&next.t>first.t){const f=(cutoff-first.t)/(next.t-first.t);first={t:cutoff,x:first.x+(next.x-first.x)*f,y:first.y+(next.y-first.y)*f};}
      const dt=Math.max(16,end.t-first.t);
      velocityX=(end.x-first.x)/dt;velocityY=(end.y-first.y)/dt;
    }
    const speed=Math.hypot(velocityX,velocityY);
    return {kind:speed>=RELEASE_SPEED?'throw':'place',velocityX,velocityY,speed,windowMs:RELEASE_WINDOW_MS};
  }
  return {sample,reset,finish};
}

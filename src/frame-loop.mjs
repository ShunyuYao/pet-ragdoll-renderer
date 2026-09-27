// One scheduled repaint, stopped while idle. Host ACK backpressure remains in
// the renderer: a slow consumer skips output instead of accumulating frames.
export function createFrameLoop({requestFrame,cancelFrame,now,tick,shouldContinue,onError}){
 let running=false,pending=null,last=0,generation=0;
 function stop(){running=false;generation++;if(pending!==null)cancelFrame(pending);pending=null;}
 function schedule(epoch){
  pending=requestFrame(()=>{
   if(!running||epoch!==generation)return;
   pending=null;
   try{
    const current=now(),dt=Math.min(.05,Math.max(0,(current-last)/1000));last=current;
    tick(dt,current);
    if(!running||epoch!==generation)return;
    if(shouldContinue())schedule(epoch);else stop();
   }catch(error){stop();onError(error);}
  });
 }
 return {get active(){return running;},stop,start(){if(running)return;running=true;last=now();schedule(++generation);}};
}

import {decodeAppearance} from './data-contract.mjs';
// Local adapter from the accepted physics module to the experimental SDK.
const sdk = window.pet?.render;
if (!sdk) throw Error('render_sdk_unavailable');
let lastFrameDiagnostics=null;
window.renderHost = Object.freeze({
  onControl(listener) {
    return sdk.onControl(message => {
      if (message.type !== 'init') return listener(message);
      try {
        listener({...message, ...decodeAppearance(message.appearance)});
      } catch { sdk.fail('invalid_appearance'); }
    });
  },
  frame(frame) {
    // Diagnostics stay local. The preload binds the session independently.
    lastFrameDiagnostics=Object.fromEntries(Object.entries(frame).filter(([key])=>!['pixels','session'].includes(key)));
    sdk.submitFrame({seq:frame.seq,width:frame.width,height:frame.height,pixels:frame.pixels,
      x:frame.x,y:frame.y,phase:frame.phase === 'idle' ? 'idle' : 'active'});
  },
  get diagnostics() { return lastFrameDiagnostics; },
  fail(reason) { sdk.fail(String(reason).split('\n')[0].replace(/^Error:\s*/, '').slice(0,80)); }
});

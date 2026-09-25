// Pure gesture classification: a pan, cancellation or second finger never purchases.
const VM_TOUCH = (() => {
  function begin(e) { return {id:e.pointerId,x:e.clientX,y:e.clientY,moved:false}; }
  function move(gesture,e) {
    if(!gesture)return;
    if(e.pointerId!==gesture.id || Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8)gesture.moved=true;
  }
  function tap(gesture,e) {
    return !!gesture && gesture.id===e.pointerId && !gesture.moved && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=8;
  }
  return {begin,move,tap};
})();
if(typeof module!=='undefined')module.exports=VM_TOUCH;

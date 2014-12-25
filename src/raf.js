// shim for requestAnimationFrame/cancelAnimationFrame
var raf = (function() {
    return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame;
})();

var caf = (function() {
    return window.cancelAnimationFrame ||
           window.cancelRequestAnimationFrame ||
           window.webkitCancelRequestAnimationFrame ||
           window.mozCancelRequestAnimationFrame;
})();

var raf = (function () {
    var startTime = Date.now();
    return function (callback) {
        return setTimeout(function () {
            callback(Date.now() - startTime);
        }, 1000/60);
    };
})();

var caf = clearTimeout;

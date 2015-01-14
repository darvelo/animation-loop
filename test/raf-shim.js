var raf = function (func) {
    return setTimeout(func, 1);
};

var caf = function (id) {
    return clearTimeout(id);
};

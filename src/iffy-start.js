(function (name, definition) {
    var global;

    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = definition();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(definition);
    } else {
        // get the global object in ES5 strict environments
        // ref: http://stackoverflow.com/questions/3277182/how-to-get-the-global-object-in-javascript
        try {
            global = Function('return this')() || (42, eval)('this');
        } catch (e) {
            global = window;
        }

        global[name] = definition();
    }
})('AnimationLoop', function () {


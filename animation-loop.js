/**********************
* The MIT License (MIT)
*
* Copyright (c) 2014 David Arvelo
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
**********************/

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

var validOptions = [
    'context',
    'before',
    'render',
    'done',
    'args',
    'pauseThreshold',
    'duration',
];

function AnimationLoop (options) {
    if (!(this instanceof AnimationLoop)) {
        return new AnimationLoop(options);
    }

    checkOptions(options);

    this.animations = createAnimationArray(options);
    this.startTime = null;
    this.remaining = this.animations.length;
    this.complete = false;
}

AnimationLoop.create = function (options) {
    return new this(options).start();
};

function checkOptions (options) {
    if (typeof options !== 'function' && typeof options !== 'object' && !Array.isArray(options)) {
        throw new Error('Options to AnimationLoop are not of a supported type.');
    }

    if (Array.isArray(options)) {
        var optionsOK = options.every(function (anim) {
            return typeof anim === 'function' || (typeof anim === 'object' && !Array.isArray(anim));
        });

        if (!optionsOK) {
            throw new Error('Array options to AnimationLoop are not of a supported type.');
        }
    }
}

function createAnimationArray (options) {
    var obj, i, name;

    if (Array.isArray(options)) {
        return options.map(createAnimationArray).reduce(function (memo, wrapped) {
            return memo.concat(wrapped);
        }, []);
    }

    if (typeof options === 'object') {
        obj = {};

        if (typeof options.render !== 'function') {
            throw new Error('There was no render function in the given object.');
        }

        for (i = 0; i < validOptions.length; ++i) {
            name = validOptions[i];
            obj[name] = options[name];
        }

        return [obj];
    }

    if (typeof options === 'function') {
        return [{ render: options }];
    }
}

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

AnimationLoop.prototype = {
    constructor: AnimationLoop,

    start: function () {
        this.rafId = raf(this.cycle.bind(this));
        return this;
    },

    cancel: function () {
        caf(this.rafId);
        return this;
    },

    cycle: function (now) {
        var startTime, lastTime, runningTime, deltaT, timing;
        var pauseThreshold = this.pauseThreshold;

        if (!this.animations.length) {
            return;
        }

        startTime = this.startTime = this.startTime || now;
        lastTime = this.lastTime = this.lastTime || now;
        runningTime = this.runningTime || now - startTime;
        deltaT = now - lastTime;

        this.lastTime = now;
        this.rafId = raf(this.cycle.bind(this));

        if (pauseThreshold && deltaT >= pauseThreshold) {
            return;
        }

        // runningTime only updates when the time between
        // frames is short enough, as defined by the user.
        // the gap can be wide if the tab becomes inactive, etc.
        // ref: hacks.mozilla.org/2011/08/animating-with-javascript-from-setinterval-to-requestanimationframe/
        this.runningTime = (runningTime += deltaT);

        timing = {
            time: now,
            deltaT: deltaT,
            startTime: startTime,
            lastTime: lastTime,
            runningTime: runningTime,
        };

        this.animations.forEach(function (anim) {
            var pct, state;
            var context = anim.context || null;
            var passArgs = [timing];

            if (anim.duration) {
                pct = Math.max(0, Math.min(1, runningTime / anim.duration));
                anim.lastPct = anim.pct || pct;
                anim.pct = pct;
                passArgs.push({ now: pct, last: anim.lastPct });
            }

            if (Array.isArray(anim.args)) {
                passArgs = passArgs.concat(anim.args);
            }

            if (typeof anim.before === 'function') {
                state = anim.before.apply(context, passArgs);
            }

            if (state === false) {
                anim.running = false;
            }

            if (state === 'cancel') {
                anim.cancel = true;
            }
        }, this);

        this.animations = this.animations.filter(function (anim) {
            var running = anim.running !== false;
            var cancel  = anim.cancel === true;
            var context = anim.context || null;
            var passArgs = [timing];
            var state;

            if (anim.duration) {
                passArgs.push({ now: anim.pct, last: anim.lastPct });
            }

            if (Array.isArray(anim.args)) {
                passArgs = passArgs.concat(anim.args);
            }

            // only render if anim.before() didn't return `false` or 'cancel'
            if (running && !cancel) {
                state = anim.render.apply(context, passArgs);
            }

            if (state === 'cancel') {
                cancel = anim.cancel = true;
                this.remaining--;
            }

            // if animation running time is 100% of its duration, don't queue it up again
            if (!cancel && (state === false || anim.pct === 1)) {
                running = anim.running = false;
                this.remaining--;

                if (typeof anim.done === 'function') {
                    anim.done.apply(context, passArgs);
                }
            }

            if (this.remaining === 0 && typeof this.oncomplete === 'function') {
                this.complete = true;
                this.oncomplete();
            }

            if (running === false || cancel) {
                return false;
            }

            return true;
        }, this);
    },
};

return AnimationLoop;

});

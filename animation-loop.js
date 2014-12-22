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
    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = definition();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(definition);
    } else {
        this[name] = definition();
    }
})('AnimationLoop', function () {

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
    if (Array.isArray(options)) {
        return options.map(createAnimationArray);
    }

    if (typeof options === 'object') {
        return [options];
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
        var animations = this.animations.slice();
        var startTime, lastTime;

        if (!animations.length) {
            this.complete = true;
            return;
        }

        if (!this.startTime) {
            this.startTime = startTime = now;
        }

        if (!this.lastTime) {
            this.lastTime = now;
        }

        lastTime = this.lastTime;

        var timing = {
            startTime: startTime,
            lastTime: lastTime,
            animTime: lastTime - startTime,
            now: now,
            deltaT: now - lastTime,
        };

        animations.forEach(function (anim) {
            var pct;

            if (anim.duration) {
                timing.duration = anim.duration;
                pct = Math.max(0, Math.min(1, timing.animTime / timing.duration));
                anim.pct = timing.pct = pct;
                anim.lastPct = timing.lastPct = timing.lastPct || pct;
            } else {
                timing.duration = null;
                timing.pct = null;
                timing.lastPct = null;
            }

            if (typeof anim.before === 'function') {
                anim.running = anim.before(timing);
            }
        }, this);

        this.animations = animations.filter(function (anim) {
            var pct = anim.pct;

            if (anim.running === false) {
                this.remaining--;
                return false;
            }

            timing.duration = anim.duration;
            // these should be set on anim by now if anim.duration exists
            timing.pct = pct;
            timing.lastPct = anim.lastPct;

            var running = anim.render(timing);

            if (running === false || anim.pct === 1) {
                if (typeof anim.done === 'function') {
                    anim.done();
                }

                this.remaining--;
                return false;
            } else if (running === 'cancel') {
                this.remaining--;
                return false;
            }

            return true;
        }, this);

        this.rafId = raf(this.cycle.bind(this));
    },
};

return AnimationLoop;

});

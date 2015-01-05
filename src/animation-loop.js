class AnimationLoop {
    constructor (options) {
        if (!(this instanceof AnimationLoop)) {
            return new AnimationLoop(options);
        }

        this.animations = AnimationLoop.createAnimations(options);
        this.startTime = null;
        this.remaining = this.animations.length;
        this.complete = false;
        this.registry = {};
    }

    static create (options) {
        return new this(options).startAll();
    }

    static createAnimations(options) {
        if (not(options, 'Array')) {
            options = [options];
        }

        return options.map(option => new Animation(option));
    }

    startAll () {
        this.animations.forEach(anim => anim.start());
        return this;
    }

    pauseAll () {
        this.animations.forEach(anim => anim.pause());
        return this;
    }

    cancelAll () {
        this.animations.forEach(anim => anim.cancel());
        return this;
    }

    add (options) {
        var anims = AnimationLoop.createAnimations(options);
        this.animations = this.animations.concat(anims);
        this.remaining += anims.length;

        this.animations.forEach(anim => anim.start());
    }

    addEventListener (name, callback, ctx) {
        var callbacks = this.registry[name] || (this.registry[name] = []);
        callbacks.push([callback, ctx]);
    }

    removeEventListener (name, callback, ctx) {
        var arglen = arguments.length;
        var callbacks = this.registry[name] || [];
        var cb, cx;

        for (let i = callbacks.length - 1; i >= 0; --i) {
            [ cb, cx ] = callbacks[i];

            if (cb === callback) {
                // make sure ctx is checked if it was passed in.
                // if not, remove all callbacks regardless of cx.
                if (arglen === 1 || cx === ctx) {
                    callbacks.splice(i, 1);
                }
            }
        }
    }

    trigger (name) {
        var callbacks = this.registry[name] || [];
        callbacks.forEach(arr => {
            var [ func, ctx ] = arr;
            func.call(ctx);
        });
    }

    // default behavior. user is expected to override if desired.
    oncomplete () {
        this.trigger('complete');
    }

    cycle (now) {
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

        // @TODO: pass previous timing object to before() ?
        timing = { now, deltaT, startTime, lastTime, runningTime };

        this.animations.forEach(anim => {
            // @TODO: add this.pause() ?
            var pct;
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
                anim.before(...passArgs);
            }

            if (!anim.running || anim.canceled) {
                return false;
            }

            return true;
        });

        this.animations = this.animations.filter(anim => {
            var passArgs = [timing];

            if (anim.duration) {
                passArgs.push({ now: anim.pct, last: anim.lastPct });
            }

            if (Array.isArray(anim.args)) {
                passArgs = passArgs.concat(anim.args);
            }

            anim.render(...passArgs);

            if (anim.canceled) {
                this.remaining--;
            }

            // if animation running time is 100% of its duration, don't queue it up again
            if (!anim.canceled && (!anim.running || anim.pct === 1)) {
                anim.stop();
                this.remaining--;

                if (typeof anim.done === 'function') {
                    anim.done(...passArgs);
                }
            }

            if (this.remaining === 0 && typeof this.oncomplete === 'function') {
                this.complete = true;
                this.oncomplete();
            }

            if (!anim.running || anim.canceled) {
                return false;
            }

            return true;
        });
    }
}

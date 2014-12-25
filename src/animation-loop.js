class AnimationLoop {
    constructor(options) {
        if (!(this instanceof AnimationLoop)) {
            return new AnimationLoop(options);
        }

        this.animations = AnimationLoop.createAnimations(options);
        this.startTime = null;
        this.remaining = this.animations.length;
        this.complete = false;
    }

    static create(options) {
        return new this(options).start();
    }

    static createAnimations(options) {
        if (not(options, 'Array')) {
            options = [options];
        }

        return options.map(option => new Animation(option));
    }

    start() {
        this.rafId = raf(this.cycle.bind(this));
        return this;
    }

    // @TODO: pauseAll()

    cancel() {
        caf(this.rafId);
        return this;
    }

    add(options) {
        var anims = AnimationLoop.createAnimations(options);
        this.animations = this.animations.concat(anims);
    }

    cycle(now) {
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
            var pct, state;
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
                state = anim.before(...passArgs);
            }

            if (state === false) {
                anim.running = false;
            }

            if (state === 'cancel') {
                anim.cancel = true;
            }
        });

        this.animations = this.animations.filter(anim => {
            var running = anim.running !== false;
            var cancel  = anim.cancel === true;
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
                state = anim.render(...passArgs);
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
                    anim.done(...passArgs);
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
        });
    }
}

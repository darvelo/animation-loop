class Animation {
    constructor (options) {
        if (!(this instanceof Animation)) {
            return new Animation(options);
        }

        // state
        this.canceled = false;
        this.completed = false;
        this.paused = false;
        this.autonomous = false;

        // timing
        this.startTime = null;

        for (let prop in options) {
            if (options.hasOwnProperty(prop)) {
                this[prop] = options[prop];
            }
        }

        if (this.autonomous) {
            this.rafId = null;
        }

        if (!this.paused) {
            this.start();
        }
    }

    cancelRAF() {
        caf(this.rafId);
        this.rafId = null;
    }

    start () {
        if (this.completed || this.canceled) {
            return this;
        }

        if (this.autonomous) {
            // prevent launching multiple rafs
            this.cancelRAF();
            this.rafId = raf(this.burnFrame.bind(this));
        }

        this.paused = false;
        return this;
    }

    // use up one frame to get deltaT's small enough to animate smoothly.
    // this is needed when the animation has been paused for a while.
    burnFrame (now) {
        this.updateState(now);
        this.rafId = raf(this.cycle.bind(this));
    }

    pause () {
        // prevent state change after animation completes
        if (this.completed || this.canceled) {
            return this;
        }

        if (this.autonomous) {
            this.cancelRAF();
        }

        this.paused = true;
        return this;
    }

    cancel () {
        if (this.autonomous) {
            this.cancelRAF();
        }

        this.canceled = true;
        this.completed = true;
        this._oncomplete();
        return this;
    }

    complete () {
        if (this.autonomous) {
            this.cancelRAF();

        }

        if (is(this.done, 'Function')) {
            let args = this.args || [];
            this.done(...args);
        }

        this.completed = true;
        this._oncomplete();
        return this;
    }

    updateState (now) {
        var previousState = this.previousState;

        // initialize state data and 'previous' state data
        if (!previousState) {
            this.startTime = now;

            previousState = {};
            previousState.now = now;
            previousState.lastNow = now;
            previousState.runningTime = 0;
            previousState.deltaT = 0;
            previousState.progress = 0;

            this.state = this.previousState = previousState;
            return;
        }

        // store previous state data
        previousState = this.previousState = this.state;

        // create new state data based on the previous state values
        this.state = {
            now,
            lastNow: previousState.now,
            deltaT: now - previousState.now,
            // use previous values for these two because if the animation is paused,
            // or there is too much of a delay between frames (this.pauseThreshold),
            // the elapsed time between frames should not accumulate here.
            runningTime: previousState.runningTime,
            progress: previousState.progress,
        };
    }

    // here we know that the animation will run, so update the runningTime and progress values
    updateProgress() {
        var state = this.state;

        state.runningTime += state.deltaT;

        if (this.duration) {
            state.progress = Math.max(0, Math.min(1, state.runningTime / this.duration));
        }
    }

    cycle (now) {
        // make sure this method isn't accidentally called
        if (!this.autonomous) {
            return;
        }

        var args = this.args || [];
        // cache for lookups
        var state = this.state;
        var deltaT = now - this.lastNow;

        // only run animation when the time between frames is short enough.
        // the gap can be wide if the tab becomes inactive, app is switched, etc.
        // ref: hacks.mozilla.org/2011/08/animating-with-javascript-from-setinterval-to-requestanimationframe/
        if (this.pauseThreshold && deltaT >= this.pauseThreshold) {
            this.rafId = raf(this.burnFrame.bind(this));
            return;
        } else {
            this.rafId = raf(this.cycle.bind(this));
            this.updateState(now);
        }

        this.updateProgress();

        if (is(this.before, 'Function')) {
            this.before(...args);
        }

        // do not call render() if the animation state changed in before()
        if (this.paused || this.canceled || this.completed) {
            return;
        }

        this.render(...args);

        // do not call done() if the animation state changed in render()
        if (this.paused || this.canceled || this.completed) {
            return;
        }

        if (state.progress === 1) {
            this.complete();
        }
    }
}

var validProps = [
    'before',
    'render',
    'done',
    'args',
    'pauseThreshold',
    'duration',
];

class Animation {
    constructor (obj) {
        var i, name;

        if (!(this instanceof Animation)) {
            return new Animation(obj);
        }

        obj = is(obj, 'Object')   ? obj
            : is(obj, 'Function') ? { render: obj }
            : null;

        if (is(obj, 'Null')) {
            throw new Error('Options to AnimationLoop are not of a supported type.');
        }

        if (not(obj.render, 'Function')) {
            throw new Error('There was no render function supplied to the AnimationLoop.');
        }

        for (i = 0; i < validProps.length; ++i) {
            name = validProps[i];
            this[name] = obj[name];
        }

        // state
        this.rafId = null;
        this.paused = false;
        this.canceled = false;
        this.completed = false;

        // timing
        this.startTime = null;
    }

    start () {
        if (this.completed) {
            return;
        }

        this.rafId = raf(this.cycle.bind(this));
        return this;
    }

    pause () {
        caf(this.rafId);
        this.rafId = null;
        this.paused = true;
        return this;
    }

    cancel () {
        this.canceled = true;
        this.complete();
        return this;
    }

    complete () {
        caf(this.rafId);
        this.rafId = null;
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

    cycle (now) {
        // must do this first
        this.updateState(now);

        var args = this.args || [];
        // cache for lookups
        var state = this.state;

        // set up another frame
        this.rafId = raf(this.cycle.bind(this));

        // @TODO: get pauseThreshold working again
        // only run animation when the time between frames is short enough.
        // the gap can be wide if the tab becomes inactive, app is switched, etc.
        // ref: hacks.mozilla.org/2011/08/animating-with-javascript-from-setinterval-to-requestanimationframe/
        //
        // if paused, we're now resuming since cycle() is called only by start() and itself.
        // we need to burn one cycle in order to get the deltaT's small enough to animate smoothly.
        if (this.paused || this.pauseThreshold && state.deltaT >= this.pauseThreshold) {
            this.paused = false;
            return;
        }

        // now that we know that the animation will run, update the runningTime and progress values
        state.runningTime += state.deltaT;
        if (this.duration) {
            state.progress = Math.max(0, Math.min(1, state.runningTime / this.duration));
        }

        if (is(this.before, 'Function')) {
            this.before(...args);
        }

        // do not call render() if the animation was paused or canceled in before()
        if (this.paused || this.canceled) {
            return;
        }

        this.render(...args);

        // do not call done() if the animation was paused or canceled in render()
        if (this.paused || this.canceled) {
            return;
        }

        if (state.progress === 1) {
            if (is(this.done, 'Function')) {
                this.done(...args);
            }

            this.complete();
        }
    }
}

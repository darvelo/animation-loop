class Animation {
    constructor (options) {
        if (!(this instanceof Animation)) {
            return new Animation(options);
        }

        // state
        this.canceled = false;
        this.completed = false;
        this.paused = false;

        // timing
        this.startTime = null;

        for (let prop in options) {
            if (options.hasOwnProperty(prop)) {
                this[prop] = options[prop];
            }
        }

        if (!this.paused) {
            this.start();
        }
    }

    start () {
        if (this.completed || this.canceled) {
            return this;
        }

        this.paused = false;
        return this;
    }

    pause () {
        // prevent state change after animation completes
        if (this.completed || this.canceled) {
            return this;
        }

        this.paused = true;
        return this;
    }

    cancel () {
        this.canceled = true;
        this.completed = true;
        this._oncomplete();
        return this;
    }

    complete () {
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
}

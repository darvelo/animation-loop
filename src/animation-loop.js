var validProps = [
    'before',
    'render',
    'done',
    'args',
    'duration',
    'paused',
    'pauseThreshold',
    'autonomous',
];

class AnimationLoop {
    constructor (options) {
        if (!(this instanceof AnimationLoop)) {
            return new AnimationLoop(options);
        }

        options = options || {};

        this.animations = [];
        this.remaining = 0;
        this.completed = false;
        this.registry = {};

        // flag that tells animations whether to request their own frames
        this.autonomous = options.autonomous || false;

        if (!this.autonomous) {
            this.paused = false;
            this.rafId = null;
        }

        this.pauseThreshold = is(options.pauseThreshold, 'Undefined') ? false : options.pauseThreshold;
    }

    createAnimations(optionsList) {
        if (not(optionsList, 'Array')) {
            optionsList = [optionsList];
        }

        return optionsList.map(options => {
            // validate properties
            options = this.getScrubbedOptions(options);
            // merge loop's options
            options.autonomous = options.autonomous || this.autonomous;
            options.pauseThreshold = options.pauseThreshold || this.pauseThreshold;
            // keep track of how many animations have completed
            options._oncomplete = this._animationComplete.bind(this);
            return new Animation(options);
        });
    }

    getScrubbedOptions (options) {
        var scrubbed = {};

        options = is(options, 'Object')   ? options
                : is(options, 'Function') ? { render: options }
                : null;

        if (is(options, 'Null')) {
            throw new Error('Options to AnimationLoop are not of a supported type.');
        }

        if (not(options.render, 'Function')) {
            throw new Error('There was no render function supplied to the AnimationLoop.');
        }

        // only add whitelisted props
        for (let prop of validProps) {
            if (options.hasOwnProperty(prop) && not(options[prop], 'Undefined')) {
                scrubbed[prop] = options[prop];
            }
        }

        return scrubbed;
    }

    cancelRAF() {
        caf(this.rafId);
        this.rafId = null;
    }

    start () {
        this.animations.forEach(anim => anim.start());

        if (!this.autonomous && !this.completed) {
            // prevent launching multiple rafs
            this.cancelRAF();
            this.rafId = raf(this.cycle.bind(this));
            this.paused = false;
        }

        return this;
    }

    pause () {
        this.animations.forEach(anim => anim.pause());

        if (!this.autonomous) {
            this.cancelRAF();
            this.paused = true;
        }

        return this;
    }

    cancel () {
        this.animations.forEach(anim => anim.cancel());

        if (this.autonomous) {
            this.cancelRAF();
        }

        return this;
    }

    _animationComplete () {
        this.remaining--;

        if (this.remaining === 0) {
            this.completed = true;

            if (!this.autonomous) {
               this.cancelRAF();
            }

            if (is(this.oncomplete, 'Function')) {
                this.oncomplete();
            }
        }
    }

    add (options) {
        var anims = this.createAnimations(options);
        this.animations = this.animations.concat(anims);
        this.remaining += anims.length;
        this.completed = false;

        // start animations as soon as they're added, unless paused
        if (!this.autonomous && !this.paused) {
            this.start();
        }

        return anims;
    }

    clearCompleted() {
        var animations = this.animations;
        // return all animations removed
        var completed = [];

        for (var i = animations.length-1; i >= 0; --i) {
            let anim = animations[i];

            if (anim.completed || anim.canceled) {
                completed = completed.concat(animations.splice(i, 1));
            }
        }

        // put animations in their original order
        completed.reverse();

        return completed;
    }

    addEventListener (name, callback, ctx) {
        var callbacks = this.registry[name] || (this.registry[name] = []);
        callbacks.push([callback, ctx]);
    }

    removeEventListener (name, callback, ctx) {
        var arglen = arguments.length;
        var callbacks;

        if (arglen === 1) {
            delete this.registry[name];
            return;
        }

        callbacks = this.registry[name] || [];

        for (let i = callbacks.length - 1; i >= 0; --i) {
            let [ cb, cx ] = callbacks[i];

            if (cb === callback) {
                // make sure ctx is checked if it was passed in.
                // if not, remove all callbacks regardless of cx.
                if (arglen === 2 || cx === ctx) {
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

    // default behavior that the user can override if desired
    oncomplete () {
        this.trigger('complete');
    }

    cycle (now) {
        // if animation is autonomous, completed, paused, or canceled, skip over it
    }
}

class AnimationLoop {
    constructor (options) {
        if (!(this instanceof AnimationLoop)) {
            return new AnimationLoop(options);
        }

        this.animations = [];
        this.add(options);

        this.remaining = this.animations.length;
        this.complete = false;
        this.registry = {};
    }

    _animationComplete () {
        this.remaining--;

        if (this.remaining === 0 && is(this.oncomplete, 'Function')) {
            this.oncomplete();
        }
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

        anims.forEach(anim => {
            // keep track of how many animations have completed
            anim.oncomplete = this._animationComplete.bind(this);

            anim.start();
        });

        return this;
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

    // default behavior. user is expected to override if desired.
    oncomplete () {
        this.trigger('complete');
    }
}

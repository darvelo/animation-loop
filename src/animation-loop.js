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

   createAnimations (...optionsList) {
      if (optionsList.length === 0) {
         return [];
      } else {
         optionsList = flatten(optionsList);
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
      validProps.forEach(prop => {
         if (options.hasOwnProperty(prop) && not(options[prop], 'Undefined')) {
            scrubbed[prop] = options[prop];
         }
      });

      return scrubbed;
   }

   cancelRAF() {
      caf(this.rafId);
      this.rafId = null;
   }

   start () {
      this.animations.forEach(anim => anim.start());

      if (!this.autonomous) {
         // prevent launching multiple rafs
         this.cancelRAF();
         this.rafId = raf(this.burnFrame.bind(this));
         this.paused = false;
      }

      return this;
   }

   // use up one frame to get deltaT's small enough to animate smoothly.
   // this is needed when the animation has been paused for a while.
   burnFrame (now) {
      // make sure this method isn't accidentally called
      if (this.autonomous || this.remaining === 0) {
         return;
      }

      this.updateState(now);

      this.animations.forEach(anim => {
         if (anim.autonomous || anim.paused || anim.completed || anim.canceled)  {
            return;
         }

         anim.updateState(now);
      });

      this.rafId = raf(this.cycle.bind(this));
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

   add (...optionsList) {
      // kick off the loop only when it's empty of runnable animations.
      // this prevents calling anim.start() on animations that are supposed to stay paused.
      if (!this.autonomous && !this.paused && this.remaining === 0) {
         this.start();
      }

      var anims = this.createAnimations(...optionsList);
      this.animations = this.animations.concat(anims);
      this.remaining += anims.length;
      this.completed = (this.remaining === 0) ? this.completed : false;

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
         let cb = callbacks[i][0];
         let cx = callbacks[i][1];

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
         let func = arr[0];
         let ctx  = arr[1];
         func.call(ctx);
      });
   }

   // default behavior that the user can override if desired
   oncomplete () {
      this.trigger('complete');
   }

   // keep track of deltaT for the AnimationLoop
   updateState (now) {
      this._lastNow = this._lastNow || now;
      this._deltaT = now - this._lastNow;
      this._lastNow = now;
   }

   cycle (now) {
      // make sure this method isn't accidentally called
      if (this.autonomous || this.remaining === 0) {
         return;
      }

      var deltaT = now - this._lastNow;
      var animations = this.animations;

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

      // call *all* animation `before()` methods before calling all `render()` methods.
      // this allows an animation to "clean up" its drawing area before
      // the space is redrawn by itself or other animations.
      animations = animations.filter(anim => {
         if (anim.autonomous || anim.paused || anim.canceled || anim.completed)  {
            return false;
         }

         var args = anim.args || [];
         anim.updateState(now);
         anim.updateProgress();

         if (is(anim.before, 'Function')) {
            anim.before(...args);
         }

         // do not call render() if before() changed the anim's state
         if (anim.autonomous || anim.paused || anim.canceled || anim.completed)  {
            return false;
         }

         return true;
      });

      animations.forEach(anim => {
         var args = anim.args || [];
         anim.render(...args);

         // do not call done() if render() changed the anim's state
         if (anim.paused || anim.canceled || anim.completed) {
            return;
         }

         if (anim.state.progress === 1) {
            anim.complete();
         }
      });
   }
}

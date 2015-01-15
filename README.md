# AnimationLoop

> Create, start, pause, and cancel animations in the browser the easy way.

# Usage

```javascript
/* 
In the HTML...
    <div id="box"></div>

In the CSS...
    #box {
        position: absolute;
        height: 100px;
        width: 100px;
        background-color: red;
    }
*/

var box = document.getElementById('box');
var loop = new AnimationLoop();
// tip: all animations can be accessed in the `loop.animations` array.
```

## Animation creation using options

```javascript
loop.add({
    // optional, wait until we manually `.start()` the animation
    paused: true,
    duration: 1000,
    args: [box.style],
    render: function (style) {
        // a value from 0 to 1, indicating how far along in the duration we are, in the current frame.
        // `this` is the Animation object itself
        var progress = this.state.progress;

        // move the box in a sine wave pattern, back and forth around a center point
        var center = 500;
        // how many sine waves we will complete
        var revolutions = 2;
        // max distance away from the center
        var sway = center / 2;

        var left = Math.floor(Math.sin(progress * Math.PI * 2 * revolutions) * sway) + center;
        style.left = left + 'px';
    },
    done: function () {
        console.log('box done!', this);
    }
});

loop.addEventListener('complete', function () {
    console.log('loop is done!', this === loop);
}, loop);
```

## Animation creation using just a render function

```javascript
loop.add(function () {
    var left = parseInt(box.style.left, 10) || 0;

    // movement is proportional to the time between frames.
    // here, we want a smooth 60fps (~16ms per frame) animation, moving 5px per frame.
    // since frames may take more or less than 16ms, we move the box proportionally:
    // 5px * (time-since-last-frame / 16),
    // which moves the box further than 5px if `deltaT` was greater than the ideal 16ms,
    // or shorter than 5px if the frame occurred sooner than the ideal 16ms.
    // `this` is the Animation object itself
    left += 5 * this.state.deltaT / 16;

    // we can pause the animation any time, but we'll need to keep a reference to it to
    // `.start()` it up again, or use `loop.start()` to start all paused animaions.
    if ( left > 195 && left < 200) {
        this.pause();
    }

    // we can stop the animation using `.cancel()`
    if (left > 400) {
        // clamp the box to 400px max
        box.style.left = '400px';
        this.cancel();
        console.log('box done!', this);
    } else {
        box.style.left = left + 'px';
    }
})
```

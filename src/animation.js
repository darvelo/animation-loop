var validProps = [
    'before',
    'render',
    'done',
    'args',
    'pauseThreshold',
    'duration',
];

class Animation {
    constructor(obj) {
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
            throw new Error('There was no render function in the given object.');
        }

        for (i = 0; i < validProps.length; ++i) {
            name = validProps[i];
            this[name] = obj[name];
        }
    }
}

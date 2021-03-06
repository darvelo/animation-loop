function is (obj, type) {
    return type === ({}).toString.call(obj).slice(8,-1);
}

function not (obj, type) {
    return !is(obj, type);
}

function flatten (arr) {
    var result = [];

    arr.forEach(value => {
        if (is(value, 'Array')) {
            let resLen = result.length;
            let valLen = value.length;
            let i = -1;

            result.length += valLen;

            while (++i < valLen) {
                result[resLen++] = value[i];
            }
        } else {
            result.push(value);
        }
    });

    return result;
}

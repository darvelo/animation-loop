function is (obj, type) {
    return type === ({}).toString.call(obj).slice(8,-1);
}

function not (obj, type) {
    return !is(obj, type);
}

function flatten (arr) {
    var result = [];

    for (let value of arr) {
        if (is(value, 'Array')) {
            var resLen = result.length;
            var valLen = value.length;
            var i = -1;

            result.length += valLen;

            while (++i < valLen) {
                result[resLen++] = value[i];
            }
        } else {
            result.push(value);
        }
    }

    return result;
}

function is (obj, type) {
    return type === ({}).toString.call(obj).slice(8,-1);
}

function not (obj, type) {
    return !is(obj, type);
}

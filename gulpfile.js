var gulp = require('gulp');
var del = require('del');
var to5 = require('gulp-6to5');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var mocha = require('gulp-mocha');

// dir vars
var dest = 'built';
var src  = 'src';
var tmp  = '.tmp';
var testNode = tmp + '/test/node';
var testBrowser = tmp + '/test/browser';

// js vars
var entrypoint    = 'animation-loop';
var builtFileName = entrypoint + '.min.js';
var tests = ['test/tests.spec.js'];

/* build-related files */

var transpilingBuilt = [
    'utils',
    'raf',
    'animation',
    entrypoint,
].map(mapSourceFiles);
var wrappingBuilt = [
    'license',
    'iffy-start',
    builtFileName,
    'iffy-end',
].map(mapSourceFiles);

/* testing-related files */

var transpilingTestingNode = [
    'utils',
    'test/raf-shim',
    'animation',
    entrypoint,
].map(mapSourceFiles);
var wrappingTestingNode = [
    'iffy-start',
    testNode + '/' + entrypoint,
    'iffy-end',
].map(mapSourceFiles);

var transpilingTestingBrowser = [
    'utils',
    'raf',
    'animation',
    entrypoint,
].map(mapSourceFiles);
var wrappingTestingBrowser = [
    'iffy-start',
    testBrowser + '/' + entrypoint,
    'iffy-end',
].map(mapSourceFiles);

function mapSourceFiles (filename) {
    var prefix = (filename === builtFileName) ? dest + '/'
               : /\//.test(filename) ? ''
               : src + '/';

    var extension = /\.\w{1,3}$/.test(filename) ? '' : '.js';
    return prefix + filename + extension;
}

/* build-related tasks */

gulp.task('clean:built', function(cb) {
    del(dest, cb);
});

gulp.task('transpile:built', ['clean:built'], function () {
    return gulp.src(transpilingBuilt)
        .pipe(concat(builtFileName))
        .pipe(to5())
        .on('error', function (err) { console.error(err.toString()); this.emit('end'); })
        .pipe(gulp.dest(dest));
});

gulp.task('wrap:built', ['transpile:built'], function () {
    return gulp.src(wrappingBuilt)
        .pipe(concat(builtFileName))
        .pipe(uglify({ preserveComments: 'some' }))
        .pipe(gulp.dest(dest));
});

/* testing-related tasks */

gulp.task('clean:tmp', function(cb) {
    del(tmp, cb);
});

gulp.task('transpile:test:node', ['clean:tmp'], function () {
    return gulp.src(transpilingTestingNode)
        .pipe(concat(entrypoint + '.js'))
        .pipe(to5())
        .on('error', function (err) { console.error(err.toString()); this.emit('end'); })
        .pipe(gulp.dest(testNode));
});

gulp.task('transpile:test:browser', ['clean:tmp'], function () {
    return gulp.src(transpilingTestingBrowser)
        .pipe(concat(entrypoint + '.js'))
        .pipe(to5())
        .on('error', function (err) { console.error(err.toString()); this.emit('end'); })
        .pipe(gulp.dest(testBrowser));
});

gulp.task('wrap:test:node', ['transpile:test:node'], function () {
    return gulp.src(wrappingTestingNode)
        .pipe(concat(entrypoint + '.js'))
        .pipe(gulp.dest(testNode));
});

gulp.task('wrap:test:browser', ['transpile:test:browser'], function () {
    return gulp.src(wrappingTestingBrowser)
        .pipe(concat(entrypoint + '.js'))
        .pipe(gulp.dest(testBrowser));
});

gulp.task('test', ['wrap:test:node', 'wrap:test:browser'], function () {
    return gulp.src(tests, { read: false })
        .pipe(mocha({ reporter: 'nyan' }))
        .once('end', function () { process.exit(); });
});

gulp.task('build', ['clean:built', 'transpile:built', 'wrap:built']);
gulp.task('default', ['build']);

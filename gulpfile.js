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

// js vars
var entrypoint    = 'animation-loop';
var builtFileName = entrypoint + '.min.js';
var tests = ['test/tests.spec.js'];
var transpiling = [
    'utils',
    'raf',
    'animation',
    entrypoint,
].map(mapSourceFiles);
var wrapping = [
    'license',
    'iffy-start',
    builtFileName,
    'iffy-end',
].map(mapSourceFiles);
var testing = [
    'iffy-start',
    'utils',
    'test/raf-shim',
    'animation',
    entrypoint,
    'iffy-end',
].map(mapSourceFiles);

function mapSourceFiles (filename) {
    var prefix = (filename === builtFileName) ? dest + '/'
               : /\//.test(filename) ? ''
               : src + '/';

    var extension = /\.\w{1,3}$/.test(filename) ? '' : '.js';
    return prefix + filename + extension;
}

gulp.task('clean', function(cb) {
    del([dest, tmp], cb);
});

gulp.task('transpile', ['clean'], function () {
    return gulp.src(transpiling)
        .pipe(concat(builtFileName))
        .pipe(to5())
        .on('error', function (err) { console.error(err.toString()); this.emit('end'); })
        .pipe(gulp.dest(dest));
});

gulp.task('transpile/test', ['clean'], function () {
    return gulp.src(testing)
        .pipe(concat(entrypoint + '.js'))
        .pipe(to5())
        .on('error', function (err) { console.error(err.toString()); this.emit('end'); })
        .pipe(gulp.dest(tmp));
});

gulp.task('wrap', ['transpile'], function () {
    return gulp.src(wrapping)
        .pipe(concat(builtFileName))
        .pipe(uglify({ preserveComments: 'some' }))
        .pipe(gulp.dest(dest));
});

gulp.task('test', ['transpile/test'], function () {
    return gulp.src(tests, { read: false })
        .pipe(mocha({ reporter: 'nyan' }))
        .once('end', function () { process.exit(); });
});

gulp.task('build', ['clean', 'transpile', 'wrap']);
gulp.task('default', ['build']);

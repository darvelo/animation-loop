var gulp = require('gulp');
var del = require('del');
var to5 = require('gulp-6to5');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

// dir vars
var dest = 'built';
var src  = 'src';

// js vars
var builtFileName = 'animation-loop.min.js';
var builtFile     = dest + '/' + builtFileName;
var license       = src + '/' + 'license.js';
var iffyStart     = src + '/iffy-start.js';
var iffyEnd       = src + '/iffy-end.js';
var transpiling   = [src + '/animation-loop.js'];
var wrapping = [
    license,
    iffyStart,
    builtFile,
    iffyEnd,
];

gulp.task('clean', function(cb) {
    del(dest, cb);
});

gulp.task('transpile', ['clean'], function () {
    return gulp.src(transpiling)
        .pipe(concat(builtFileName))
        .pipe(to5())
        .on('error', function (err) { console.error(err.toString()); this.emit('end'); })
        .pipe(gulp.dest(dest));
});

gulp.task('wrap', ['transpile'], function () {
    return gulp.src(wrapping)
    .pipe(concat(builtFileName))
    .pipe(uglify({ preserveComments: 'some' }))
    .pipe(gulp.dest(dest));
});

gulp.task('build', ['clean', 'transpile', 'wrap']);
gulp.task('default', ['build']);

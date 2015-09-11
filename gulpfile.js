var gulp = require('gulp');
var nodemon     = require('gulp-nodemon');

gulp.task('dev', function() {
  nodemon({
    script: 'server.js',
    delay: 2000
  })
});
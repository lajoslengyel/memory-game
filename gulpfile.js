const {watch, src, dest} = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');

const build = () => {
    return src('./style.scss')
        .pipe(sass({}))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(dest('./'));
};

const watchTask = () => {
    build();
    watch(['./style.scss'], build);
};

module.exports.default = build;
module.exports.watch = watchTask;

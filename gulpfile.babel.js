import { src, dest, watch, parallel, series } from 'gulp';
import del from 'del';
import sass from 'gulp-sass';
import cssSort from 'gulp-csscomb';
import csso from 'gulp-csso';
import pug from 'gulp-pug';
import rename from 'gulp-rename';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';
import browserSync from 'browser-sync';
import fs from 'fs';
import data from 'gulp-data';
import webp from 'gulp-webp';
import imagemin from 'gulp-imagemin';
import mozjpeg from 'imagemin-mozjpeg';
import pngquant from 'imagemin-pngquant';
import svgstore from 'gulp-svgstore';
import concat from 'gulp-concat';
import ghPages from 'gh-pages';
import plumber from 'gulp-plumber';
import sourcemaps from 'gulp-sourcemaps';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import prettify from 'gulp-prettify'; // based on https://beautifier.io/

/**
 *  Основные директории
 */
const dirs = {
  src: 'source',
  dest: 'build'
};

/**
 * Пути к файлам
 */
const path = {
  styles: {
    root: `${dirs.src}/sass/`,
    compile: `${dirs.src}/sass/style.scss`,
    save: `${dirs.dest}/css/`
  },
  views: {
    root: `${dirs.src}/pug/`,
    compile: `${dirs.src}/pug/pages/`,
    save: `${dirs.dest}`
  },
  json: {
    data: `${dirs.src}/pug/data/data.json`
  },
  scripts: {
    root: `${dirs.src}/js/`,
    save: `${dirs.dest}/js/`
  },
  images: {
    root: `${dirs.src}/img/`,
    save: `${dirs.dest}/img/`
  }
};

/**
 * Основные задачи
 */
const stylesDev = () => src(path.styles.compile, { allowEmpty: true })
  .pipe(plumber())
  .pipe(sourcemaps.init())
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(rename({ suffix: `.min` }))
  .pipe(sourcemaps.write('.'))
  .pipe(dest(path.styles.save));

// Эта задача с csso, который не работает с sourcemaps
const stylesBuild = () => src(path.styles.compile, { allowEmpty: true })
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(cssSort())
  .pipe(dest(path.styles.save))
  .pipe(postcss([autoprefixer()]))
  .pipe(csso())
  .pipe(rename({ suffix: `.min` }))
  .pipe(dest(path.styles.save));

const views = () => src(`${path.views.compile}*.pug`)
  .pipe(plumber())
  .pipe(data((file) => {
    return JSON.parse(fs.readFileSync(path.json.data));
  }))
  .pipe(pug())
  .pipe(prettify({
    indent_size: 2,
    indent_char: ' ',
    inline: [''], // перенос строки для всех инлайн элементов
    "end_with_newline": true // перенос строки в конце файла
  }))
  .pipe(dest(path.views.save));

const scripts = () => src(`${path.scripts.root}*.js`)
  .pipe(concat('script.js'))
  .pipe(babel({
    presets: ['@babel/preset-env']
  }))
  .pipe(dest(path.scripts.save))
  .pipe(uglify())
  .pipe(rename({ suffix: '.min' }))
  .pipe(dest(path.scripts.save));

const images = () => src(`${path.images.root}**/*`)
  .pipe(imagemin([
    pngquant({ quality: [0.2, 0.8] }),
    mozjpeg({ quality: 85 })
  ]))
  .pipe(dest(path.images.save))
  .pipe(webp({ quality: 85 }))
  .pipe(dest(path.images.save));

const clean = () => del([dirs.dest]);

const devWatch = () => {
  const bs = browserSync.init({
    server: dirs.dest,
    cors: true,
    notify: false,
    ui: false
  });
  watch(`${path.styles.root}**/*.scss`, stylesDev).on('change', bs.reload);
  watch(`${path.views.root}**/*.pug`, views).on('change', bs.reload);
  watch(`${path.json.data}`, views).on('change', bs.reload);
  watch(`${path.scripts.root}**/*.js`, scripts).on('change', bs.reload);
  watch(`${path.images.root}**/*.{png,jpg}`, images).on('change', bs.reload);
  watch(`${path.images.root}**/*.svg`, series(sprite, views)).on('all', bs.reload);
};

// Эта задача только для критерия Б24, по сути не нужна, отличается только stylesBuild
const buildWatch = () => {
  const bs = browserSync.init({
    server: dirs.dest,
    cors: true,
    notify: false,
    ui: false
  });
  watch(`${path.styles.root}**/*.scss`, stylesBuild).on('change', bs.reload);
  watch(`${path.views.root}**/*.pug`, views).on('change', bs.reload);
  watch(`${path.json.data}`, views).on('change', bs.reload);
  watch(`${path.scripts.root}**/*.js`, scripts).on('change', bs.reload);
  watch(`${path.images.root}**/*.{png,jpg}`, images).on('change', bs.reload);
  watch(`${path.images.root}**/*.svg`, series(sprite, views)).on('all', bs.reload);
};

const sprite = () => {
  return src(`${path.images.root}**/*.svg`)
    .pipe(svgstore({ inlineSvg: true }))
    .pipe(rename('sprite.svg'))
    .pipe(dest(`${path.views.root}common/`))
};

const fonts = () => {
  return src(`${dirs.src}/fonts/*.{woff,woff2}`)
    .pipe(dest(`${dirs.dest}/fonts/`))
};

const publish = (cb) => {
  ghPages.publish(dirs.dest, cb);
};

/**
 * Задачи для разработки
 */
export const dev = series(clean, fonts, parallel(stylesDev, scripts, sprite, images), views, devWatch);

/**
 * Для билда
 */
export const build = series(clean, fonts, parallel(stylesBuild, scripts, sprite, images), views);

/**
 * Для критерия Б24
 */
export const start = series(build, buildWatch);

/**
 * Для деплоя
 */
export const deploy = series(build, publish);

export default dev;

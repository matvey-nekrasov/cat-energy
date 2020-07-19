import { src, dest, watch, parallel, series } from 'gulp';
import del from 'del';
import sass from 'gulp-sass';
import cssSort from 'gulp-csscomb';
import csso from 'gulp-csso';
import jsonMergeModule from 'gulp-merge-json';
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
    normalize: `${dirs.src}/css/normalize.css`,
    save: `${dirs.dest}/css/`
  },
  views: {
    root: `${dirs.src}/pug/`,
    compile: `${dirs.src}/pug/pages/`,
    save: `${dirs.dest}`
  },
  json: {
    root: `${dirs.src}/pug/data/**/*.json`,
    save: `${dirs.src}/pug/data/`,
    compiled: `${dirs.src}/pug/data/data.json`
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
  .pipe(rename({
    suffix: `.min`
  }))
  .pipe(sourcemaps.write('.'))
  .pipe(dest(path.styles.save));

const stylesBuild = () => src(path.styles.compile, { allowEmpty: true })
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(cssSort())
  .pipe(dest(path.styles.save))
  .pipe(postcss([autoprefixer()]))
  .pipe(csso())
  .pipe(rename({
    suffix: `.min`
  }))
  .pipe(dest(path.styles.save));

const jsonClean = () => del([path.json.compiled]);

const jsonMerge = () => src(path.json.root)
  .pipe(jsonMergeModule({ fileName: 'data.json' }))
  .pipe(dest(path.json.save));

const json = series(jsonClean, jsonMerge);

const views = () => src(`${path.views.compile}*.pug`)
  .pipe(data((file) => {
    return JSON.parse(
      fs.readFileSync(path.json.compiled)
    );
  }))
  .pipe(pug({
    pretty: true
  }))
  .pipe(dest(path.views.save));

const scripts = () => src(`${path.scripts.root}*.js`)
  .pipe(concat('script.js'))
  .pipe(babel({
    presets: ['@babel/preset-env']
  }))
  .pipe(dest(path.scripts.save))
  .pipe(uglify())
  .pipe(rename({
    suffix: '.min'
  }))
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
    notify: false
  });
  watch(`${path.styles.root}**/*.scss`, stylesDev).on('change', bs.reload);
  watch(`${path.views.root}**/*.pug`, views).on('change', bs.reload);
  watch([`${path.json.save}blocks/*.json`, `${path.json.save}common/*.json`], series(json, views)).on('change', bs.reload);
  watch(`${path.scripts.root}**/*.js`, scripts).on('change', bs.reload);
  watch(`${path.images.root}**/*.{png,jpg}`, images).on('change', bs.reload);
};

// Эта задача только для критерия Б24, по сути не нужна
const buildWatch = () => {
  const bs = browserSync.init({
    server: dirs.dest,
    notify: false
  });
  watch(`${path.styles.root}**/*.scss`, stylesBuild).on('change', bs.reload);
  watch(`${path.views.root}**/*.pug`, views).on('change', bs.reload);
  watch([`${path.json.save}blocks/*.json`, `${path.json.save}common/*.json`], series(json, views)).on('change', bs.reload);
  watch(`${path.scripts.root}**/*.js`, scripts).on('change', bs.reload);
  watch(`${path.images.root}**/*.{png,jpg}`, images).on('change', bs.reload);
};

const sprite = () => {
  return src(`${path.images.root}**/*.svg`)
    .pipe(svgstore({
      inlineSvg: true
    }))
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
export const dev = series(clean, json, fonts, parallel(stylesDev, views, scripts, sprite, images), devWatch);

/**
 * Для билда
 */
export const build = series(clean, json, fonts, parallel(stylesBuild, views, scripts, sprite, images));

/**
 * Для критерия Б24
 */
export const start = series(build, buildWatch);

/**
 * Для деплоя
 */
export const deploy = series(build, publish);

export default dev;

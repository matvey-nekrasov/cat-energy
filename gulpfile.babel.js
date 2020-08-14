import { src, dest, parallel, series, watch } from 'gulp';
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
import mergeStream from 'merge-stream';

const sync = browserSync.create();

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
    sprite: `${dirs.src}/img/sprite/`,
    save: `${dirs.dest}/img/`
  },
  pixelGlass: {
    srcJs: 'node_modules/pixel-glass/script.js',
    srcCss: 'node_modules/pixel-glass/styles.css',
    destJs: 'pixel-glass.js',
    destCss: 'pixel-glass.css'
  }
};

// Приватные задачи
const reload = (cb) => {
  sync.reload();
  cb();
};

const pixelGlass = () => mergeStream(
  src(path.pixelGlass.srcJs)
    .pipe(rename(path.pixelGlass.destJs))
    .pipe(dest(path.scripts.save)),
  src(path.pixelGlass.srcCss)
    .pipe(rename(path.pixelGlass.destCss))
    .pipe(dest(path.styles.save))
);

const styles = () => src(path.styles.compile, { allowEmpty: true })
  .pipe(plumber())
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(cssSort())
  .pipe(dest(path.styles.save))
  .pipe(postcss([autoprefixer()]))
  .pipe(csso())
  .pipe(rename({ suffix: `.min` }))
  .pipe(dest(path.styles.save))
  .pipe(sync.stream());

// Эта задача без плагинов, которые не работает с sourcemaps
const stylesSourcemaps = () => src(path.styles.compile, { allowEmpty: true })
  .pipe(plumber())
  .pipe(sourcemaps.init())
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(rename({ suffix: `.min` }))
  .pipe(sourcemaps.write('.'))
  .pipe(dest(path.styles.save))
  .pipe(sync.stream());

const views = () => src(`${path.views.compile}*.pug`)
  .pipe(plumber())
  .pipe(data((file) => {
    return JSON.parse(fs.readFileSync(path.json.data));
  }))
  .pipe(pug())
  .pipe(prettify({
    indent_size: 2,
    indent_char: ' ',
    inline: [], // перенос строки для всех инлайн элементов
    end_with_newline: true // перенос строки в конце файла
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

const sprite = () => {
  return src(`${path.images.sprite}*.svg`)
    .pipe(svgstore({ inlineSvg: true }))
    .pipe(rename('sprite.svg'))
    .pipe(dest(path.images.save))
    .pipe(sync.stream());
};

export const images = () => src(`${path.images.root}*.{png,jpg,svg}`)
  .pipe(imagemin([
    pngquant({ quality: [0.2, 0.8] }),
    mozjpeg({ quality: 90 })
  ]))
  .pipe(dest(path.images.save))
  .pipe(webp({ quality: 90 }))
  .pipe(dest(path.images.save));

export const clean = () => del([dirs.dest]);

const fonts = () => {
  return src(`${dirs.src}/fonts/*.{woff,woff2}`)
    .pipe(dest(`${dirs.dest}/fonts/`))
};

const publish = (cb) => {
  ghPages.publish(dirs.dest, cb);
};

export const watchers = () => {
  sync.init({
    server: dirs.dest,
    cors: true,
    notify: false,
    ui: false
  });
  watch(`${path.styles.root}**/*.scss`, styles);
  watch(`${path.views.root}**/*.pug`, series(views, reload));
  watch(`${path.json.data}`, series(views, reload));
  watch(`${path.scripts.root}**/*.js`, series(scripts, reload));
  watch(`${path.images.root}*.{png,jpg,svg}`, series(images, reload));
  watch(`${path.images.sprite}*.svg`, series(sprite, reload));
};

// Публичные задачи

export const build = series(
  clean, fonts,
  parallel(styles, scripts, sprite, images, pixelGlass),
  views);

export const start = series(build, watchers);

export const deploy = series(build, publish);

export default start;

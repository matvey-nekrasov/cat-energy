"use strict";

document.querySelector('html').classList.remove('no-js');
var navMain = document.querySelector('.nav');
var navToggle = navMain.querySelector('.nav__toggle');
navToggle.addEventListener('click', function () {
  navMain.classList.toggle('nav--closed');
  navMain.classList.toggle('nav--opened');
});
document.querySelector('html').classList.remove('no-js');

const navMain = document.querySelector('.nav');
const navToggle = navMain.querySelector('.nav__toggle');

navToggle.addEventListener('click', function () {
  navMain.classList.toggle('nav--closed');
  navMain.classList.toggle('nav--opened');
});

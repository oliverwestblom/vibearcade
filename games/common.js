// Helskarm for alla spel. Knappen laggs till automatiskt i verktygsraden, sa
// inget spel behover andra sin markup.
const skal = document.querySelector('.game-shell');

// Helskarm ska fa planen att vaxa forbi sin egen bitmap. For att den ska gora
// det utan att bli ihoptryckt behover CSS veta spelets bildforhallande, sa vi
// laser det ur canvasen har i stallet for att hardkoda det per spel.
const plan = document.querySelector('canvas');
if (skal && plan && plan.width && plan.height) {
  skal.style.setProperty('--ratio', (plan.width / plan.height).toFixed(4));
}

function iHelskarm() {
  return document.fullscreenElement === skal || document.webkitFullscreenElement === skal;
}
async function vaxlaHelskarm() {
  try {
    if (iHelskarm()) await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
    else await (skal.requestFullscreen ? skal.requestFullscreen({ navigationUI: 'hide' }) : skal.webkitRequestFullscreen());
  } catch (error) {
    const status = document.querySelector('#status');
    if (status) status.textContent = 'Helskärm nekades av webbläsaren.';
  }
}
if (skal && (skal.requestFullscreen || skal.webkitRequestFullscreen)) {
  const knapp = document.createElement('button');
  knapp.className = 'control fs-knapp';
  knapp.id = 'helskarm';
  knapp.type = 'button';
  knapp.textContent = 'Helskärm';
  knapp.title = 'Helskärm (F)';
  knapp.addEventListener('click', vaxlaHelskarm);
  const verktyg = document.querySelector('.toolbar');
  const start = document.querySelector('#start');
  if (verktyg && start) verktyg.insertBefore(knapp, start);
  else if (verktyg) verktyg.appendChild(knapp);
  const uppdatera = () => {
    knapp.textContent = iHelskarm() ? 'Avsluta helskärm' : 'Helskärm';
    document.body.classList.toggle('helskarm', iHelskarm());
  };
  for (const namn of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(namn, uppdatera);
}

// F11 och kiosk-lage fyller skarmen utan att satta document.fullscreenElement,
// sa :fullscreen matchar inte da. Fonsterhojden avslojar det i stallet, och
// klassen ger samma stora spelplan som knappen.
function skarmfyllt() {
  if (iHelskarm()) return true;
  if (!window.screen || !screen.height) return false;
  return Math.abs(window.innerHeight - screen.height) <= 2;
}
function uppdateraLage() {
  document.body.classList.toggle('skarmfyllt', skarmfyllt());
}
window.addEventListener('resize', uppdateraLage);
for (const namn of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(namn, uppdateraLage);
uppdateraLage();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    // I helskarm tar webblasaren hand om Escape sjalv; navigera inte bort da.
    if (iHelskarm() || document.fullscreenElement) return;
    event.preventDefault();
    window.location.href = '../../index.html';
    return;
  }
  const mal = event.target;
  if (mal && (mal.tagName === 'INPUT' || mal.tagName === 'TEXTAREA' || mal.isContentEditable)) return;
  if (event.key === 'f' || event.key === 'F') {
    event.preventDefault();
    vaxlaHelskarm();
  }
});

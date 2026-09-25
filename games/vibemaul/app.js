// Gor Vibemaul installerbart som app (PWA). Service workern cachar spelet sa
// det startar offline, och i app-laget doljs lanken tillbaka till portalen.
(() => {
  const iApp = new URLSearchParams(location.search).has('app') ||
    (window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches));
  if (iApp) document.documentElement.classList.add('vm-app');
  // Service workers kraver http(s); fran file:// eller i testmiljon hoppas de over.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(fel => console.warn('Vibemaul: service worker kunde inte registreras', fel));
    });
  }
})();

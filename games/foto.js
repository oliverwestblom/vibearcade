// Delad rekordbild. Ett spel kan antingen lana ut sin egen video (Vibe Slash
// har redan kameran igang) eller be Foto att oppna kameran bara for bilden.
// Bilden tas forst nar spelaren sjalv slagit pa den, och skickas till servern
// som en liten JPEG tillsammans med poangen.
const Foto = (() => {
  const BREDD = 240;
  let video = null, strom = null, lanad = false;

  function aktiv() {
    return !!video && video.readyState >= 2;
  }
  function lana(externVideo) {
    if (strom) av();
    video = externVideo;
    lanad = true;
  }
  function slappLan() {
    if (!lanad) return;
    video = null;
    lanad = false;
  }
  async function slaPa() {
    if (strom) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('OsakerKontext');
    strom = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    video = document.createElement('video');
    video.playsInline = true; video.muted = true;
    video.srcObject = strom;
    await video.play();
    lanad = false;
    return true;
  }
  function av() {
    if (strom) for (const spar of strom.getTracks()) spar.stop();
    strom = null;
    if (!lanad) video = null;
  }
  function ta() {
    if (!aktiv()) return null;
    const h = Math.round(BREDD * (video.videoHeight || 480) / (video.videoWidth || 640));
    const duk = document.createElement('canvas');
    duk.width = BREDD; duk.height = h;
    const ctx = duk.getContext('2d');
    // Spegelvand, sa bilden ser ut som spelaren ar van vid att se sig sjalv.
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -BREDD, 0, BREDD, h); ctx.restore();
    try { return duk.toDataURL('image/jpeg', 0.62); } catch (error) { return null; }
  }
  function felText(error) {
    const namn = error && error.name;
    if (namn === 'NotAllowedError') return 'Kameran nekades.';
    if (namn === 'NotFoundError') return 'Ingen kamera hittades.';
    if (error && error.message === 'OsakerKontext') return 'Kameran kräver https eller localhost.';
    return `Kameran kunde inte startas (${namn || 'fel'}).`;
  }
  return { slaPa, av, ta, aktiv, lana, slappLan, felText, harStod: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) };
})();

// Utilidades compartidas. Se pega ANTES de cada colector (instagram.js, facebook.js, tiktok.js).
window.BF = window.BF || {};
BF.SINCE = Date.parse('2026-11-01T06:00:00Z') / 1000; // 1 nov 00:00 CDMX
BF.UNTIL = Date.parse('2026-11-18T06:00:00Z') / 1000; // 17 nov 23:59 CDMX
BF.sleep = ms => new Promise(r => setTimeout(r, ms));
BF.clean = s => (s || '').replace(/\s+\n/g, '\n').trim();

// Miniatura JPEG (data URL) de ~400px de ancho; null si falla.
BF.thumb = async function (src, w = 360) {
  if (!src) return null;
  try {
    const blob = await (await fetch(src)).blob();
    const bm = await createImageBitmap(blob);
    const h = Math.min(Math.round(bm.height * w / bm.width), Math.round(w * 1.5));
    const sh = Math.round(h * bm.width / w);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(bm, 0, 0, bm.width, sh, 0, 0, w, h);
    return cv.toDataURL('image/jpeg', 0.68);
  } catch (e) { return null; }
};

// Crea un botón rojo fijo que copia window.__payload al portapapeles al darle clic.
BF.copyButton = function () {
  let b = document.getElementById('__cpbtn');
  if (!b) {
    b = document.createElement('button');
    b.id = '__cpbtn';
    Object.assign(b.style, { position: 'fixed', top: '10px', left: '40%', zIndex: 2147483647, padding: '18px 36px', background: '#d00', color: '#fff', fontSize: '20px', border: '0', borderRadius: '8px' });
    b.onclick = () => {
      const t = document.createElement('textarea');
      t.value = window.__payload; document.body.appendChild(t); t.select();
      const ok = document.execCommand('copy'); t.remove();
      b.textContent = ok ? 'COPIADO ' + window.__payload.length : 'FALLO';
    };
    document.body.appendChild(b);
  }
  b.textContent = 'COPIAR DATOS';
  return 'boton listo';
};

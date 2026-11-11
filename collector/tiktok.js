// Colector de TikTok. Ejecutar en cada perfil (con sesión iniciada), después de common.js.
// Uso por perfil: await BF.ttPage({ known: [...] })  -> acumula en sessionStorage
// Al final: BF.ttFinish()                            -> prepara el botón COPIAR DATOS
BF.TT_ACCOUNTS = { lg_mexico: 'LG', hisensemxoficial: 'Hisense' };

BF.ttPage = async function ({ known = [] } = {}) {
  const user = (location.pathname.match(/@([^/?]+)/) || [])[1];
  const brand = BF.TT_ACCOUNTS[user];
  if (!brand) throw new Error('Perfil no reconocido: ' + user);
  const idTime = id => Number(BigInt(id) >> 32n);
  const items = () => [...document.querySelectorAll('[data-e2e="user-post-item"]')].map(el => {
    const a = el.querySelector('a[href*="/video/"],a[href*="/photo/"]'); if (!a) return null;
    const id = (a.href.match(/\/(?:video|photo)\/(\d+)/) || [])[1]; if (!id) return null;
    const img = el.querySelector('img');
    return { id, href: a.href.split('?')[0], kind: a.href.includes('/photo/') ? 'Carrusel' : 'Video', t: idTime(id), alt: (img && img.alt) || '', src: img && img.src, views: (el.querySelector('[data-e2e="video-views"]') || {}).textContent || null, pinned: !!el.querySelector('[data-e2e="video-card-badge"]') };
  }).filter(Boolean);
  for (let k = 0; k < 15; k++) {
    const nonPinned = items().filter(i => !i.pinned);
    if (nonPinned.length && Math.min(...nonPinned.map(i => i.t)) < BF.SINCE) break;
    window.scrollTo(0, document.body.scrollHeight); await BF.sleep(2500);
  }
  const kn = new Set(known);
  const store = JSON.parse(sessionStorage.getItem('bf_tt') || '{}');
  let n = 0;
  for (const i of items()) {
    if (i.t < BF.SINCE || i.t >= BF.UNTIL) continue;
    const id = 'tt_' + i.id; n++;
    store[id] = {
      id, platform: 'TikTok', brand, account: '@' + user, url: i.href,
      date: new Date(i.t * 1000).toISOString(), format: i.kind,
      copy_out: BF.clean(i.alt.replace(/\s*creado por .+$/i, '').replace(/\s*created by .+$/i, '')),
      copy_in: '', likes: null, comments: null, views: i.views,
      thumb: kn.has(id) ? null : await BF.thumb(i.src)
    };
  }
  sessionStorage.setItem('bf_tt', JSON.stringify(store));
  return { user, posts_in_window: n, accumulated: Object.keys(store).length };
};

BF.ttFinish = function () {
  const store = JSON.parse(sessionStorage.getItem('bf_tt') || '{}');
  window.__payload = JSON.stringify({ platform: 'TikTok', collected_at: new Date().toISOString(), posts: Object.values(store) });
  BF.copyButton();
  return { posts: Object.keys(store).length, bytes: window.__payload.length };
};

BF.ttReset = function () { sessionStorage.removeItem('bf_tt'); return 'ok'; };

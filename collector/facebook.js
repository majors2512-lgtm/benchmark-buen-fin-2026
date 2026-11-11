// Colector de Facebook. Ejecutar en cada página de marca (con sesión iniciada), después de common.js.
// Uso por página: await BF.fbPage({ known: [...] })  -> acumula en sessionStorage (misma pestaña)
// Al final (en la última página): BF.fbFinish()     -> prepara el botón COPIAR DATOS
BF.FB_PAGES = { lgmexico: 'LG', hisensemexico: 'Hisense', tclmex: 'TCL', whirlpoolmx: 'Whirlpool' };

BF.findAll = function (o, pred, acc = [], depth = 0, seen = new Set()) {
  if (!o || typeof o !== 'object' || depth > 60 || seen.has(o)) return acc;
  seen.add(o); if (pred(o)) acc.push(o);
  for (const k in o) BF.findAll(o[k], pred, acc, depth + 1, seen);
  return acc;
};

BF.fbPage = async function ({ known = [] } = {}) {
  const slug = location.pathname.split('/').filter(Boolean)[0].toLowerCase();
  const brand = BF.FB_PAGES[slug];
  if (!brand) throw new Error('Página no reconocida: ' + slug);
  const res = [];
  const oo = XMLHttpRequest.prototype.open, os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__u = u; return oo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function (b) { if (String(this.__u).includes('graphql')) { const s = this; this.addEventListener('load', () => { try { res.push(s.responseText); } catch (e) {} }); } return os.apply(this, arguments); };
  const scriptsTxt = [...document.querySelectorAll('script[type="application/json"]')].map(s => s.textContent);
  const parse = txts => { const out = []; txts.forEach(t => t.split('\n').forEach(l => { l = l.trim(); if (l) try { out.push(JSON.parse(l.replace(/^for \(;;\);/, ''))); } catch (e) {} })); return out; };
  // Scroll hasta que el feed (no los "Destacados") llegue a publicaciones anteriores al 1 de noviembre.
  const oldest = () => Math.min(Infinity, ...BF.findAll(parse(res), o => o.__typename === 'Story' && o.post_id && o.creation_time).map(s => s.creation_time));
  for (let k = 0; k < 30; k++) { window.scrollTo(0, document.body.scrollHeight); await BF.sleep(2500); if (k >= 4 && oldest() < BF.SINCE - 86400) break; }

  const roots = [];
  scriptsTxt.forEach(t => { try { roots.push(JSON.parse(t)); } catch (e) {} });
  roots.push(...parse(res));
  const stories = BF.findAll(roots, o => o.__typename === 'Story' && o.post_id && o.creation_time);
  const by = new Map();
  for (const s of stories) {
    const prev = by.get(s.post_id) || {};
    const msg = BF.findAll(s, o => o.message && typeof o.message.text === 'string')[0];
    const urlo = BF.findAll(s, o => typeof o.url === 'string' && /facebook\.com\/(.+\/(posts|videos|photos)\/|reel\/|permalink|story_fbid)/.test(o.url))[0];
    const att = s.attachments || [];
    const imgs = BF.findAll(att, o => typeof o.uri === 'string' && /fbcdn|scontent/.test(o.uri));
    const img = imgs.find(o => (o.width || 0) >= 300) || imgs[0];
    const alts = BF.findAll(att, o => typeof o.accessibility_caption === 'string').map(o => o.accessibility_caption);
    const vid = BF.findAll(att, o => o.__typename === 'Video')[0];
    by.set(s.post_id, {
      t: s.creation_time, msg: prev.msg || (msg && msg.message.text), url: prev.url || (urlo && urlo.url),
      img: prev.img || (img && img.uri), alts: prev.alts && prev.alts.length ? prev.alts : alts, video: prev.video || !!vid
    });
  }
  const k = new Set(known);
  const store = JSON.parse(sessionStorage.getItem('bf_fb') || '{}');
  let n = 0;
  for (const [pid, v] of by) {
    if (v.t < BF.SINCE || v.t >= BF.UNTIL) continue;
    const id = 'fb_' + pid; n++;
    const url = (v.url || ('https://www.facebook.com/' + pid)).replace(/\?.*$/, '');
    store[id] = {
      id, platform: 'Facebook', brand, account: slug, url,
      date: new Date(v.t * 1000).toISOString(),
      format: /\/reel\//.test(url) ? 'Reel' : (v.video ? 'Video' : 'Imagen'),
      copy_out: BF.clean(v.msg), copy_in: [...new Set(v.alts)].join(' | '),
      likes: null, comments: null, views: null,
      thumb: k.has(id) ? null : await BF.thumb(v.img)
    };
  }
  sessionStorage.setItem('bf_fb', JSON.stringify(store));
  return { page: slug, posts_in_window: n, accumulated: Object.keys(store).length };
};

BF.fbFinish = function () {
  const store = JSON.parse(sessionStorage.getItem('bf_fb') || '{}');
  window.__payload = JSON.stringify({ platform: 'Facebook', collected_at: new Date().toISOString(), posts: Object.values(store) });
  BF.copyButton();
  return { posts: Object.keys(store).length, bytes: window.__payload.length };
};

BF.fbReset = function () { sessionStorage.removeItem('bf_fb'); return 'ok'; };

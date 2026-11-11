// Colector de Instagram. Ejecutar en https://www.instagram.com/lgmexico/ (con sesión iniciada),
// después de common.js. Uso: await BF.ig({ known: ['ig_XXXX', ...] })
// known = ids ya archivados (no se vuelve a generar su miniatura).
BF.IG_ACCOUNTS = { lgmexico: 'LG', hisensemex: 'Hisense', tclmex: 'TCL', whirlpoollatam: 'Whirlpool', mabe_global: 'Mabe' };

BF.igTemplate = async function () {
  if (window.__tpl) return window.__tpl;
  const cap = [];
  const oo = XMLHttpRequest.prototype.open, os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__u = u; return oo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function (b) { if (String(this.__u).includes('graphql')) cap.push({ u: String(this.__u), b: String(b) }); return os.apply(this, arguments); };
  const of = window.fetch;
  window.fetch = function (i, o) { try { const u = String((i && i.url) || i); if (u.includes('graphql')) cap.push({ u, b: String(o && o.body) }); } catch (e) {} return of.apply(this, arguments); };
  for (let k = 0; k < 6 && !cap.some(c => c.b.includes('PolarisProfilePostsTabContentQuery')); k++) {
    window.scrollTo(0, document.body.scrollHeight); await BF.sleep(2500);
  }
  const c = cap.find(x => x.b.includes('PolarisProfilePostsTabContentQuery'));
  if (!c) throw new Error('No se capturó la consulta de perfil de Instagram');
  window.__tpl = c; return c;
};

BF.igUser = async function (username, known) {
  const tpl = await BF.igTemplate();
  const p = new URLSearchParams(tpl.b); const v = JSON.parse(p.get('variables'));
  v.username = username; let after = null; const out = [];
  for (let page = 0; page < 8; page++) {
    v.after = after; p.set('variables', JSON.stringify(v));
    const r = await fetch(tpl.u, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: p.toString(), credentials: 'include' });
    const j = await r.json();
    const conn = j.data && j.data.xdt_api__v1__feed__user_timeline_graphql_connection;
    if (!conn) throw new Error('Respuesta inesperada para ' + username);
    let older = false;
    for (const e of conn.edges) {
      const n = e.node; const pinned = (n.timeline_pinned_user_ids || []).length > 0;
      if (n.taken_at < BF.SINCE) { if (!pinned) older = true; continue; }
      if (n.taken_at >= BF.UNTIL) continue;
      const id = 'ig_' + n.code;
      const cands = ((n.image_versions2 && n.image_versions2.candidates) || []).slice().sort((a, b) => a.width - b.width);
      const src = (cands.find(c => c.width >= 400) || cands[cands.length - 1] || {}).url;
      out.push({
        id, platform: 'Instagram', brand: BF.IG_ACCOUNTS[username], account: '@' + username,
        url: 'https://www.instagram.com/' + (n.product_type === 'clips' ? 'reel' : 'p') + '/' + n.code + '/',
        date: new Date(n.taken_at * 1000).toISOString(),
        format: n.product_type === 'clips' ? 'Reel' : (n.media_type === 8 ? 'Carrusel' : 'Imagen'),
        copy_out: BF.clean(n.caption && n.caption.text),
        copy_in: [n.accessibility_caption].concat((n.carousel_media || []).map(m => m.accessibility_caption)).filter(Boolean).join(' | '),
        likes: n.like_count ?? null, comments: n.comment_count ?? null, views: n.view_count || n.play_count || null,
        thumb: known.has(id) ? null : await BF.thumb(src)
      });
    }
    if (older || !conn.page_info.has_next_page) break;
    after = conn.page_info.end_cursor; await BF.sleep(1200);
  }
  return out;
};

BF.ig = async function ({ known = [] } = {}) {
  const k = new Set(known); const posts = []; const summary = {};
  for (const u of Object.keys(BF.IG_ACCOUNTS)) {
    try { const r = await BF.igUser(u, k); posts.push(...r); summary[u] = r.length; }
    catch (e) { summary[u] = 'ERROR: ' + e.message; }
  }
  window.__payload = JSON.stringify({ platform: 'Instagram', collected_at: new Date().toISOString(), posts });
  BF.copyButton();
  return { summary, bytes: window.__payload.length };
};

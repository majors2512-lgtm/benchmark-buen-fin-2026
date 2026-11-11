#!/usr/bin/env python3
"""Une los archivos incoming/*.json (pegados por el colector) en data/posts.json.

- Guarda cada miniatura (data URL) como thumbs/<id>.jpg (testigo permanente).
- Conserva publicaciones aunque después se borren de la red social.
- Lee texto dentro de la imagen (copy in) con OCR (tesseract) cuando está disponible.
- Detecta palabras clave en copy out (descripción) y copy in (texto en imagen).
- Clasifica cada post en 'previo' (1-12 nov) o 'durante' (13-17 nov), hora CDMX.
"""
import base64, json, os, re, shutil, subprocess, unicodedata
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'posts.json')
META = os.path.join(ROOT, 'data', 'meta.json')
THUMBS = os.path.join(ROOT, 'thumbs')
INCOMING = os.path.join(ROOT, 'incoming')
CDMX = timezone(timedelta(hours=-6))

KEYWORDS = [
    ('Nos adelantamos', r'\bnos adelantamos\b'),
    ('Aprovecha', r'\baprovech\w*'),
    ('MSI', r'\bmsi\b'),
    ('Descuento', r'\bdescuento\b'),
    ('descuentos', r'\bdescuentos\b'),
    ('meses', r'\bmeses\b'),
    ('noviembre', r'\bnoviembre\b'),
    ('buen fin', r'buen\s*fin'),
    ('oferta', r'\bofertas?\b'),
    ('promoción', r'\bpromocion\b'),
    ('promociones', r'\bpromociones\b'),
    ('aplica', r'\baplica(n|ble|bles)?\b'),
]
PATTERNS = [(k, re.compile(p)) for k, p in KEYWORDS]


def norm(s):
    s = unicodedata.normalize('NFD', (s or '').lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def match(text):
    t = norm(text)
    return [k for k, p in PATTERNS if p.search(t)]


def phase(iso):
    d = datetime.fromisoformat(iso.replace('Z', '+00:00')).astimezone(CDMX)
    if d.year == 2026 and d.month == 11 and 1 <= d.day <= 12:
        return 'previo'
    if d.year == 2026 and d.month == 11 and 13 <= d.day <= 17:
        return 'durante'
    return 'fuera'


def ocr(path):
    if not shutil.which('tesseract'):
        return None
    try:
        out = subprocess.run(['tesseract', path, '-', '-l', 'spa', '--psm', '11'],
                             capture_output=True, text=True, timeout=60).stdout
        words = [w for w in re.split(r'\s+', out) if len(re.sub(r'\W', '', w)) >= 2]
        return ' '.join(words)
    except Exception:
        return None


def main():
    os.makedirs(THUMBS, exist_ok=True)
    os.makedirs(INCOMING, exist_ok=True)
    posts = {}
    if os.path.exists(DATA):
        for p in json.load(open(DATA, encoding='utf-8')):
            posts[p['id']] = p
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    collected = {}
    for fn in sorted(os.listdir(INCOMING)):
        if not fn.endswith('.json'):
            continue
        try:
            payload = json.load(open(os.path.join(INCOMING, fn), encoding='utf-8'))
        except Exception as e:
            print('No se pudo leer', fn, e)
            continue
        if isinstance(payload, dict) and payload.get('platform'):
            collected[payload['platform']] = payload.get('collected_at')
        for p in (payload.get('posts', []) if isinstance(payload, dict) else []):
            pid = re.sub(r'[^A-Za-z0-9_-]', '_', p['id'])
            thumb = p.pop('thumb', None)
            if thumb and thumb.startswith('data:image'):
                path = os.path.join(THUMBS, pid + '.jpg')
                if not os.path.exists(path):
                    with open(path, 'wb') as f:
                        f.write(base64.b64decode(thumb.split(',', 1)[1]))
            old = posts.get(p['id'], {})
            merged = {**old, **{k: v for k, v in p.items() if v not in (None, '') or k not in old}}
            merged['first_seen'] = old.get('first_seen', now)
            merged['last_seen'] = now
            posts[p['id']] = merged

    for pid, p in posts.items():
        safe = re.sub(r'[^A-Za-z0-9_-]', '_', pid)
        tp = os.path.join(THUMBS, safe + '.jpg')
        p['thumb'] = 'thumbs/' + safe + '.jpg' if os.path.exists(tp) else None
        if p['thumb'] and 'ocr' not in p:
            text = ocr(tp)
            if text is not None:
                p['ocr'] = text
        p['phase'] = phase(p['date'])
        p['kw_out'] = match(p.get('copy_out'))
        p['kw_in'] = sorted(set(match(p.get('copy_in'))) | set(match(p.get('ocr'))),
                            key=[k for k, _ in KEYWORDS].index)
        p['keywords'] = [k for k, _ in KEYWORDS if k in p['kw_out'] or k in p['kw_in']]

    ordered = sorted(posts.values(), key=lambda x: x['date'], reverse=True)
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    json.dump(ordered, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    meta = json.load(open(META, encoding='utf-8')) if os.path.exists(META) else {}
    meta.setdefault('collected_at', {}).update({k: v for k, v in collected.items() if v})
    meta['updated_at'] = now
    meta['keywords'] = [k for k, _ in KEYWORDS]
    meta['total'] = len(ordered)
    json.dump(meta, open(META, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"{len(ordered)} publicaciones; con palabras clave: {sum(1 for p in ordered if p['keywords'])}")


if __name__ == '__main__':
    main()

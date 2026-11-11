# Benchmark Buen Fin 2026

Dashboard: https://majors2512-lgtm.github.io/benchmark-buen-fin-2026/

Seguimiento de publicaciones de **LG, Hisense, TCL, Whirlpool y Mabe** (Instagram, Facebook y TikTok) que usan alguna de estas palabras en el copy out (descripción) o copy in (texto dentro de la imagen):

> Nos adelantamos · Aprovecha · MSI · Descuento · meses · noviembre · buen fin · descuentos · oferta · promoción · promociones · aplica

Etapas (hora CDMX):
- **Previo al Buen Fin:** 1 al 12 de noviembre de 2026
- **Durante el Buen Fin:** 13 al 17 de noviembre de 2026

## Cómo se actualiza

1. Cada ~2 horas, Claude abre las cuentas en el Chrome del usuario (con sus sesiones) y corre los colectores de `collector/`.
2. Los datos se pegan en `incoming/instagram.json`, `incoming/facebook.json` e `incoming/tiktok.json`.
3. El workflow `.github/workflows/update.yml` corre `scripts/merge.py`: guarda las miniaturas en `thumbs/` (testigos), aplica OCR para el copy in, detecta palabras clave, actualiza `data/posts.json` y publica el sitio en GitHub Pages.

Cuentas:

| Marca | Instagram | Facebook | TikTok |
|---|---|---|---|
| LG | @lgmexico | LGMexico | @lg_mexico |
| Hisense | @hisensemex | HisenseMexico | @hisensemxoficial |
| TCL | @tclmex | TCLMEX | — |
| Whirlpool | @whirlpoollatam | WhirlpoolMX | — |
| Mabe | @mabe_global | — | — |

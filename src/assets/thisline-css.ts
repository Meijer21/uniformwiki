/** THISLINE tokens v2.0 — bron: merkwaarheidsdocument augustus 2026. Fonts via Bunny Fonts (privacy), niet Google. */
export const THISLINE_CSS = `/* THISLINE UniformWiki — tokens v2.0 */
:root {
  --tl-black: #000000;
  --tl-lime: #ccff00;
  --tl-white: #ffffff;
  --tl-surface-1: #000000;
  --tl-surface-2: #0d0d0d;
  --tl-surface-3: #1a1a1a;
  --tl-surface-hover: #222222;
  --tl-line: #2a2a2a;
  --tl-line-strong: #3a3a3a;
  --tl-text-hi: #ffffff;
  --tl-text-mid: #cccccc;
  --tl-text-lo: #888888;
  --tl-text-faint: #555555;
  --tl-on-lime: #000000;
  --tl-lime-hover: #d6ff33;
  --tl-lime-press: #b8e600;
  --tl-lime-dim: rgba(204,255,0,0.12);
  --tl-lime-line: rgba(204,255,0,0.35);
  --tl-danger: #ff3c3c;
  --tl-warning: #ffb020;
  --tl-success: var(--tl-lime);
  --tl-light: #e6e6e6;
  --tl-light-hover: #ffffff;
  --font-display: "Roboto Condensed", "Arial Narrow", sans-serif;
  --font-body: Inter, system-ui, -apple-system, sans-serif;
  --font-quote: Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, monospace;
  --fw-display: 900;
  --fw-heading: 700;
  --fw-quote: 600;
  --fw-body: 400;
  --fw-light: 300;
  --fw-medium: 500;
  --fs-h1: 40px;
  --fs-h2: 35px;
  --fs-h3: 30px;
  --fs-h4: 25px;
  --fs-h5: 20px;
  --fs-h6: 16px;
  --fs-hero: clamp(72px, 12vw, 112px);
  --fs-label: 14px;
  --fs-label-sm: 11px;
  --fs-body-lg: 19px;
  --fs-body: 17px;
  --fs-body-sm: 15px;
  --fs-meta: 14px;
  --fs-micro: 12px;
  --fs-button: 16px;
  --lh-tight: 0.92;
  --lh-head: 1.05;
  --lh-snug: 1.3;
  --lh-body: 1.6;
  --ls-hero: -0.03em;
  --ls-display: -0.02em;
  --ls-tight: -0.01em;
  --ls-eyebrow: 0.28em;
  --ls-label: 0.12em;
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;
  --sp-7: 48px;
  --sp-8: 64px;
  --sp-10: 100px;
  --radius-0: 0px;
  --radius-sm: 2px;
  --radius-pill: 999px;
  --bw-hair: 1px;
  --bw-mid: 2px;
  --bw-bold: 3px;
  --focus-ring: 0 0 0 2px #000000, 0 0 0 4px #ccff00;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --dur-fast: 120ms;
  --dur: 200ms;
  --container: 1100px;
  --gutter: 24px;
}

*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: dark; }
html, body { margin: 0; min-height: 100%; background: var(--tl-black); }
body {
  color: var(--tl-text-mid);
  font-family: var(--font-body);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-light);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
}
::selection { background: var(--tl-lime); color: var(--tl-on-lime); }
img { max-width: 100%; }
a { color: var(--tl-white); text-decoration: none; transition: color var(--dur) var(--ease); }
a:hover { color: var(--tl-lime); }
:focus-visible { outline: none; box-shadow: var(--focus-ring); }
code, pre { font-family: var(--font-mono); }

.skip {
  position: absolute;
  left: -999px;
  top: var(--sp-4);
}
.skip:focus {
  left: var(--sp-4);
  z-index: 20;
  background: var(--tl-lime);
  color: var(--tl-on-lime);
  padding: var(--sp-2) var(--sp-3);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
}

.shell { max-width: var(--container); margin: 0 auto; padding: 0 var(--gutter); }
.site-header { border-bottom: var(--bw-hair) solid var(--tl-line); }
.site-header-inner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4) var(--sp-6);
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5) 0;
}
.tl-rule { height: var(--bw-bold); background: var(--tl-lime); }

.wordmark { display: flex; flex-direction: column; gap: 6px; color: var(--tl-white); }
.wordmark:hover { color: var(--tl-white); }
.wordmark-name {
  font-family: var(--font-display);
  font-weight: var(--fw-display);
  font-size: 22px;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}
.wordmark-payoff {
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-micro);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--tl-text-lo);
}
.wordmark-product {
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-label-sm);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  color: var(--tl-lime);
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-5);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.nav a { color: var(--tl-text-lo); padding-bottom: 6px; border-bottom: 2px solid transparent; }
.nav a:hover { color: var(--tl-lime); }
.nav a.is-active { color: var(--tl-white); border-bottom-color: var(--tl-lime); }

.site-main { padding: var(--sp-8) 0 var(--sp-10); }
.site-footer { border-top: var(--bw-hair) solid var(--tl-line); }
.site-footer-inner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  justify-content: space-between;
  padding: var(--sp-6) 0;
  font-size: var(--fs-meta);
  color: var(--tl-text-lo);
}
.site-footer nav { display: flex; flex-wrap: wrap; gap: var(--sp-4) var(--sp-5); }
.site-footer a { color: var(--tl-text-lo); }
.site-footer a:hover { color: var(--tl-lime); }

.eyebrow {
  margin: 0;
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-label-sm);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--tl-lime);
}
h1, h2, h3, h4, h5, h6, .h1, .h2, .h3 {
  margin: 0;
  color: var(--tl-text-hi);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  text-transform: uppercase;
  line-height: var(--lh-head);
  letter-spacing: var(--ls-tight);
}
h1, .h1 { font-size: clamp(32px, 5vw, var(--fs-h1)); letter-spacing: var(--ls-display); line-height: 1; }
h2, .h2 { font-size: var(--fs-h2); }
h3, .h3 { font-size: var(--fs-h3); }
.lead {
  margin: var(--sp-5) 0 0;
  max-width: 42rem;
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-light);
  color: var(--tl-text-mid);
}
.meta { font-size: var(--fs-meta); color: var(--tl-text-lo); }
.stack { display: grid; gap: var(--sp-5); }
.stack-lg { display: grid; gap: var(--sp-7); }
.mt-3 { margin-top: var(--sp-3); }
.mt-4 { margin-top: var(--sp-4); }
.mt-5 { margin-top: var(--sp-5); }
.mt-6 { margin-top: var(--sp-6); }
.mt-8 { margin-top: var(--sp-8); }
.row { display: flex; flex-wrap: wrap; gap: var(--sp-3); align-items: center; }
.row-between { display: flex; flex-wrap: wrap; gap: var(--sp-4); align-items: flex-end; justify-content: space-between; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--bw-mid) solid transparent;
  border-radius: var(--radius-0);
  font-family: var(--font-display);
  font-weight: var(--fw-display);
  font-size: 14px;
  letter-spacing: var(--ls-label);
  line-height: 1;
  text-transform: uppercase;
  cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease), border-color var(--dur) var(--ease);
  padding: 12px 24px;
}
.btn:disabled { opacity: .4; cursor: not-allowed; }
.btn-primary { background: var(--tl-lime); color: var(--tl-on-lime); }
.btn-primary:hover { background: var(--tl-lime-hover); color: var(--tl-on-lime); }
.btn-primary:active { background: var(--tl-lime-press); }
.btn-secondary { background: transparent; color: var(--tl-white); border-color: var(--tl-line-strong); }
.btn-secondary:hover { background: var(--tl-lime); color: var(--tl-on-lime); border-color: var(--tl-lime); }
.btn-ghost { background: transparent; color: var(--tl-white); }
.btn-ghost:hover { background: var(--tl-surface-hover); color: var(--tl-lime); }
.btn-danger { background: transparent; color: var(--tl-danger); border-color: var(--tl-danger); }
.btn-danger:hover { background: var(--tl-danger); color: var(--tl-white); }
.btn-sm { padding: 8px 16px; font-size: 12px; }

.card {
  background: var(--tl-surface-3);
  border: var(--bw-hair) solid var(--tl-line);
  border-radius: var(--radius-0);
  padding: var(--sp-5);
}
a.card:hover { border-color: var(--tl-lime); color: inherit; }
.grid-3 { display: grid; gap: var(--sp-3); }
@media (min-width: 720px) { .grid-3 { grid-template-columns: repeat(3, 1fr); } }
.grid-2 { display: grid; gap: var(--sp-4); }
@media (min-width: 720px) { .grid-2 { grid-template-columns: 1fr 1fr; } }

.tag {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-sm);
  border: var(--bw-hair) solid var(--tl-lime-line);
  background: var(--tl-lime-dim);
  color: var(--tl-lime);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 5px 10px;
}
.badge {
  display: inline-flex;
  align-items: center;
  min-width: 18px;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-micro);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.badge-lime { background: var(--tl-lime); color: var(--tl-on-lime); }
.badge-ok { background: var(--tl-lime-dim); color: var(--tl-lime); }
.badge-wait { background: var(--tl-lime-dim); color: var(--tl-lime); }
.badge-off { background: var(--tl-line); color: var(--tl-white); }
.badge-danger { background: var(--tl-danger); color: var(--tl-white); }
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--tl-text-faint);
}
.dot-on { background: var(--tl-lime); }

.search {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-6);
}
@media (min-width: 640px) { .search { flex-direction: row; } }
.field { display: grid; gap: 6px; }
.field-label {
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-label-sm);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--tl-text-lo);
}
.input, .textarea, input, textarea {
  width: 100%;
  background: var(--tl-black);
  color: var(--tl-white);
  border: var(--bw-hair) solid var(--tl-line-strong);
  border-radius: var(--radius-0);
  padding: 12px 14px;
  font-family: var(--font-body);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-body);
}
.textarea, textarea { min-height: 96px; resize: vertical; }
input:focus, textarea:focus, .input:focus, .textarea:focus {
  outline: none;
  border-color: var(--tl-lime);
  box-shadow: none;
}
.hint { font-size: 13px; color: var(--tl-text-lo); }

.notice, .error, .ok {
  margin-top: var(--sp-5);
  padding: var(--sp-3) var(--sp-4);
  border: var(--bw-hair) solid var(--tl-line);
  background: var(--tl-surface-3);
  font-size: var(--fs-meta);
}
.ok { border-color: var(--tl-lime-line); color: var(--tl-lime); background: var(--tl-lime-dim); }
.error { border-color: var(--tl-danger); color: var(--tl-danger); background: rgba(255,60,60,0.1); }

.article-list { display: grid; }
.article-teaser {
  padding: var(--sp-5) 0;
  border-bottom: var(--bw-hair) solid var(--tl-line);
}
.article-teaser h2 { font-size: var(--fs-h3); }
.article-teaser p { margin: var(--sp-2) 0 0; max-width: 42rem; }
.empty {
  padding: var(--sp-7) var(--sp-5);
  text-align: center;
  border: var(--bw-hair) dashed var(--tl-line);
  color: var(--tl-text-lo);
}

.wiki-layout { display: grid; gap: var(--sp-7); }
@media (min-width: 960px) {
  .wiki-layout { grid-template-columns: minmax(0, 1fr) 16rem; }
}
.prose { max-width: 42rem; color: var(--tl-text-mid); font-size: var(--fs-body); font-weight: var(--fw-light); }
.prose p { margin: 0 0 var(--sp-4); }
.prose a { color: var(--tl-lime); }
.prose a:hover { color: var(--tl-lime-hover); }
.prose strong { color: var(--tl-white); font-weight: var(--fw-medium); }
.prose h1, .prose h2, .prose h3 { margin: var(--sp-6) 0 var(--sp-3); }
.prose ul, .prose ol { margin: 0 0 var(--sp-4); padding-left: var(--sp-5); }
.prose li { margin: var(--sp-1) 0; }
.prose code {
  background: var(--tl-surface-hover);
  padding: 0.1em 0.35em;
}
.prose pre {
  overflow-x: auto;
  background: var(--tl-surface-2);
  border: var(--bw-hair) solid var(--tl-line);
  padding: var(--sp-4);
  font-size: var(--fs-meta);
}
.prose pre code { background: transparent; padding: 0; }
.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--sp-4); }
.timeline li { position: relative; padding-left: var(--sp-5); }
.timeline .dot { position: absolute; left: 0; top: 8px; }
dl.meta-list { margin: 0; }
dl.meta-list > div {
  display: grid;
  gap: var(--sp-1);
  padding: var(--sp-3) 0;
  border-top: var(--bw-hair) solid var(--tl-line);
}
dl.meta-list dt {
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-label-sm);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  color: var(--tl-text-lo);
}
table.data { width: 100%; border-collapse: collapse; font-size: var(--fs-meta); text-align: left; }
table.data th {
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  color: var(--tl-text-lo);
  font-size: var(--fs-micro);
  padding-bottom: var(--sp-2);
}
table.data td { padding: var(--sp-2) var(--sp-3) var(--sp-2) 0; border-top: var(--bw-hair) solid var(--tl-line); vertical-align: top; }
.overflow { overflow-x: auto; }
code.k { background: var(--tl-surface-hover); padding: 0 6px; font-size: 0.9em; }
.steps { padding-left: var(--sp-5); }
.steps li { margin: var(--sp-3) 0; }
details summary {
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  font-size: var(--fs-label-sm);
  color: var(--tl-lime);
}
.span-2 { grid-column: 1 / -1; }

.kolom-grid { display: grid; gap: var(--sp-3); margin-top: var(--sp-6); }
@media (min-width: 720px) { .kolom-grid { grid-template-columns: repeat(5, 1fr); } }
@media (max-width: 719px) { .kolom-grid { grid-template-columns: 1fr 1fr; } }
.kolom-card .eyebrow { margin-bottom: var(--sp-2); }
.kolom-card p { margin: var(--sp-2) 0 0; font-size: var(--fs-meta); color: var(--tl-text-lo); }

.chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-4); }
.chip {
  display: inline-flex;
  align-items: center;
  border: var(--bw-hair) solid var(--tl-line);
  color: var(--tl-text-mid);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
}
.chip:hover, a.chip:hover { border-color: var(--tl-lime); color: var(--tl-lime); }
.chip-lime { border-color: var(--tl-lime-line); background: var(--tl-lime-dim); color: var(--tl-lime); }

.wikilink { color: var(--tl-lime); border-bottom: 1px solid var(--tl-lime-line); }
.wikilink.is-missing { color: var(--tl-text-lo); border-bottom-style: dashed; }
.tag-inline { color: var(--tl-lime); font-size: 0.95em; }

.promo-row { display: grid; gap: var(--sp-3); margin-top: var(--sp-6); }
@media (min-width: 720px) { .promo-row { grid-template-columns: 1fr 1fr; } }
.promo {
  background: var(--tl-surface-3);
  border: var(--bw-hair) solid var(--tl-line);
  border-left: var(--bw-bold) solid var(--tl-lime);
  padding: var(--sp-5);
}
.promo p { margin: var(--sp-2) 0 var(--sp-4); font-size: var(--fs-body-sm); }
.sponsor {
  margin-top: var(--sp-8);
  padding-top: var(--sp-5);
  border-top: var(--bw-hair) solid var(--tl-line);
  font-size: var(--fs-meta);
  color: var(--tl-text-lo);
}
.sponsor strong { color: var(--tl-white); font-weight: var(--fw-medium); }

.cite {
  margin-top: var(--sp-7);
  padding: var(--sp-5);
  background: var(--tl-surface-2);
  border: var(--bw-hair) solid var(--tl-line);
}
.cite ol { margin: var(--sp-3) 0 0; padding-left: var(--sp-5); font-size: var(--fs-body-sm); }
.cite li { margin: var(--sp-2) 0; }
.ai-note {
  margin-top: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: var(--bw-hair) solid var(--tl-lime-line);
  background: var(--tl-lime-dim);
  color: var(--tl-lime);
  font-size: var(--fs-meta);
}
.ai-note.is-missing, .cite.is-missing .hint {
  border-color: var(--tl-warning);
  color: var(--tl-warning);
  background: transparent;
}

.gap {
  margin-top: var(--sp-5);
  padding: var(--sp-5);
  border: var(--bw-hair) dashed var(--tl-line);
}
.gap p { margin: var(--sp-2) 0 var(--sp-4); }

.graph-wrap {
  margin-top: var(--sp-5);
  border: var(--bw-hair) solid var(--tl-line);
  background: var(--tl-black);
  min-height: 520px;
  position: relative;
}
#graaf { display: block; width: 100%; height: 520px; touch-action: none; cursor: grab; }
.graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  margin-top: var(--sp-3);
  font-size: var(--fs-micro);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  font-family: var(--font-display);
  color: var(--tl-text-lo);
}
.rel-list { list-style: none; margin: var(--sp-3) 0 0; padding: 0; display: grid; gap: var(--sp-3); }
.rel-list a { color: var(--tl-white); }
.rel-list span { display: block; color: var(--tl-text-lo); font-size: var(--fs-meta); }

.radio-row { display: grid; gap: var(--sp-2); }
.radio-row label { display: flex; gap: var(--sp-3); align-items: flex-start; font-size: var(--fs-body-sm); color: var(--tl-text-mid); }

.site-main { padding: var(--sp-7) 0 var(--sp-8); }
.lead { max-width: 36rem; }
.prose { max-width: 38rem; }
.wiki-layout { gap: var(--sp-6); }
@media (min-width: 960px) {
  .wiki-layout { grid-template-columns: minmax(0, 1fr) 14rem; }
}
.wiki-side .card { padding: var(--sp-4); }
.wiki-side h2 { font-size: var(--fs-h6); }
.promo-row { grid-template-columns: 1fr; max-width: 38rem; }
.gap { margin-top: var(--sp-6); max-width: 38rem; }
.home-tools { margin-top: var(--sp-6); }
.kolom-grid { margin-top: var(--sp-5); }

.home-start { max-width: 40rem; }
.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  margin: 0 0 var(--sp-6);
  font-size: var(--fs-meta);
  color: var(--tl-text-lo);
}
.crumbs a { color: var(--tl-text-lo); }
.crumbs a:hover { color: var(--tl-lime); }
.crumbs [aria-current="page"] { color: var(--tl-white); }
.crumbs-sep { color: var(--tl-text-faint); }

.choose-list {
  display: grid;
  margin-top: var(--sp-7);
  border-top: var(--bw-hair) solid var(--tl-line);
}
.choose-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--sp-4);
  align-items: center;
  min-height: 72px;
  padding: var(--sp-4) var(--sp-2) var(--sp-4) 0;
  border-bottom: var(--bw-hair) solid var(--tl-line);
  color: inherit;
}
.choose-row:hover { color: inherit; background: var(--tl-surface-2); }
.choose-row:focus-visible { background: var(--tl-surface-2); }
.choose-copy { min-width: 0; }
.choose-title {
  display: block;
  color: var(--tl-white);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-h5);
  letter-spacing: var(--ls-tight);
  text-transform: uppercase;
  line-height: var(--lh-head);
}
.choose-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 2;
  margin-top: var(--sp-1);
  color: var(--tl-text-lo);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-light);
  line-height: var(--lh-snug);
}
.choose-meta {
  color: var(--tl-text-faint);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-micro);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  white-space: nowrap;
}
.choose-go {
  color: var(--tl-lime);
  font-size: 28px;
  line-height: 1;
  font-weight: 300;
}

.search-quiet {
  display: grid;
  gap: var(--sp-3);
  margin-top: var(--sp-8);
  padding-top: var(--sp-6);
  border-top: var(--bw-hair) solid var(--tl-line);
}
@media (min-width: 640px) {
  .search-quiet {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }
}
.chooser-back {
  margin: var(--sp-6) 0 0;
  font-size: var(--fs-meta);
}
.chooser-back a { color: var(--tl-text-lo); }
.chooser-back a:hover { color: var(--tl-lime); }
.empty .btn { margin-top: var(--sp-4); }

fieldset.choice-set {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
  display: grid;
  gap: var(--sp-2);
}
fieldset.choice-set legend {
  padding: 0;
  margin-bottom: var(--sp-2);
}
.choice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--sp-3);
  align-items: start;
  width: 100%;
  margin: 0;
  padding: var(--sp-4);
  border: var(--bw-hair) solid var(--tl-line);
  background: var(--tl-black);
  color: var(--tl-text-mid);
  cursor: pointer;
}
.choice input {
  margin: 4px 0 0;
  accent-color: var(--tl-lime);
  flex-shrink: 0;
}
.choice strong {
  display: block;
  color: var(--tl-white);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: var(--fs-label-sm);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
}
.choice span {
  display: block;
  margin-top: 4px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-light);
  color: var(--tl-text-lo);
  line-height: var(--lh-snug);
  white-space: normal;
  overflow-wrap: anywhere;
}
.cite a { color: var(--tl-lime); }
.cite a:hover { color: var(--tl-lime-hover); }
.article-actions { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin-top: var(--sp-5); }
.kennisweb-block { margin-top: var(--sp-7); }
.graph-wrap-article { min-height: 360px; }
#kennisweb { display: block; width: 100%; height: 520px; touch-action: none; cursor: grab; }
.graph-wrap-article #kennisweb { height: 360px; }
.koppel-form { display: flex; flex-wrap: wrap; gap: var(--sp-3); align-items: flex-end; margin-top: var(--sp-4); }
.bron-row { display: grid; gap: var(--sp-3); }
@media (min-width: 640px) { .bron-row { grid-template-columns: 1fr 1fr; } }
.editor-bar { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-2); }
.choice:has(input:checked) {
  border-color: var(--tl-lime);
  background: var(--tl-lime-dim);
}
.choice:has(input:checked) strong { color: var(--tl-lime); }

.chip-pick {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.chip-toggle {
  display: inline-flex;
  align-items: center;
  border: var(--bw-hair) solid var(--tl-line);
  background: var(--tl-black);
  color: var(--tl-text-mid);
  font-family: var(--font-display);
  font-weight: var(--fw-heading);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 7px 10px;
  cursor: pointer;
}
.chip-toggle:hover { border-color: var(--tl-lime); color: var(--tl-lime); }
.chip-toggle.is-on {
  border-color: var(--tl-lime);
  background: var(--tl-lime);
  color: var(--tl-on-lime);
}
.chip-toggle.is-new {
  background: transparent;
  border-style: dashed;
  color: var(--tl-lime);
}
.tag-add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sp-2);
}
.mention-wrap { position: relative; }
.mention-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  margin-bottom: var(--sp-2);
  background: var(--tl-surface-3);
  border: var(--bw-hair) solid var(--tl-lime);
  z-index: 8;
  max-height: 240px;
  overflow: auto;
}
.mention-item {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: 0;
  color: var(--tl-white);
  text-align: left;
  cursor: pointer;
  font-size: var(--fs-body-sm);
}
.mention-item em {
  font-style: normal;
  color: var(--tl-text-lo);
  font-family: var(--font-display);
  font-size: var(--fs-micro);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.mention-item.is-active, .mention-item:hover { background: var(--tl-surface-hover); }
.form-narrow { max-width: 40rem; }
.lock-note {
  margin: 0;
  padding: var(--sp-3) var(--sp-4);
  border: var(--bw-hair) solid var(--tl-lime-line);
  background: var(--tl-lime-dim);
  color: var(--tl-lime);
  font-size: var(--fs-meta);
}
.contact-mail {
  display: inline-block;
  margin-top: var(--sp-5);
  color: var(--tl-lime);
  font-size: var(--fs-body);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; }
}
`;

/** UniformWiki — licht, Google Material-achtig. Lettertypes via Bunny Fonts. */
export const THISLINE_CSS = `/* UniformWiki layout */
:root {
  --bg: #f8f9fa;
  --surface: #ffffff;
  --ink: #202124;
  --muted: #5f6368;
  --faint: #80868b;
  --line: #dadce0;
  --line-strong: #bdc1c6;
  --primary: #188038;
  --primary-hover: #137333;
  --on-primary: #ffffff;
  --accent: #c6e377;
  --danger: #c5221f;
  --focus: #1a73e8;
  --header: #202124;
  --header-ink: #ffffff;
  --lime: #ccff00;
  --font: Inter, system-ui, -apple-system, sans-serif;
  --font-brand: "Roboto Condensed", Inter, sans-serif;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --container: 720px;
  --gutter: 20px;
}

*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: light; }
html, body { margin: 0; min-height: 100%; background: var(--bg); }
body {
  color: var(--ink);
  font-family: var(--font);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; }
a { color: var(--focus); text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

.skip {
  position: absolute;
  left: -999px;
  top: 12px;
}
.skip:focus {
  left: 12px;
  z-index: 20;
  background: var(--surface);
  color: var(--ink);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

.shell { max-width: var(--container); margin: 0 auto; padding: 0 var(--gutter); }
.shell-wide { max-width: 960px; }

.site-header {
  background: var(--header);
  color: var(--header-ink);
}
.site-header a { color: var(--header-ink); text-decoration: none; }
.site-header a:hover { color: var(--lime); text-decoration: none; }
.site-header-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}
.tl-rule { height: 4px; background: var(--lime); }

.wordmark { display: flex; flex-direction: column; gap: 2px; }
.wordmark-name {
  font-family: var(--font-brand);
  font-weight: 900;
  font-size: 20px;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}
.wordmark-payoff {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9aa0a6;
}
.wordmark-product {
  font-size: 12px;
  color: var(--lime);
  font-weight: 600;
}

.nav { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 14px; font-weight: 500; }
.nav a { color: #bdc1c6; padding: 6px 0; }
.nav a.is-active { color: var(--header-ink); box-shadow: inset 0 -2px 0 var(--lime); }

.site-main { padding: 32px 0 72px; }
.site-footer { border-top: 1px solid var(--line); background: var(--surface); }
.site-footer-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  justify-content: space-between;
  padding: 20px 0;
  font-size: 13px;
  color: var(--muted);
}
.site-footer a { color: var(--muted); }
.site-footer a:hover { color: var(--ink); }

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary);
}
h1, h2, h3, h4, h5, h6, .h1, .h2, .h3 {
  margin: 0;
  color: var(--ink);
  font-family: var(--font);
  font-weight: 500;
  letter-spacing: -0.02em;
  text-transform: none;
  line-height: 1.2;
}
h1, .h1 { font-size: clamp(28px, 5vw, 40px); font-weight: 400; }
h2, .h2 { font-size: 22px; }
h3, .h3 { font-size: 18px; }
.lead {
  margin: 8px 0 0;
  max-width: 38rem;
  font-size: 16px;
  color: var(--muted);
}
.meta { font-size: 13px; color: var(--muted); }
.stack { display: grid; gap: 16px; }
.stack-lg { display: grid; gap: 28px; }
.mt-3 { margin-top: 8px; }
.mt-4 { margin-top: 12px; }
.mt-5 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-8 { margin-top: 40px; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.row-between { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; justify-content: space-between; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 20px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--primary);
  font-family: var(--font);
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.01em;
  text-transform: none;
  text-decoration: none;
  cursor: pointer;
  transition: background 120ms var(--ease), box-shadow 120ms var(--ease);
}
.btn:hover { text-decoration: none; }
.btn-primary { background: var(--primary); color: var(--on-primary); }
.btn-primary:hover { background: var(--primary-hover); color: var(--on-primary); }
.btn-secondary { border-color: var(--line-strong); color: var(--ink); background: var(--surface); }
.btn-secondary:hover { background: #f1f3f4; color: var(--ink); }
.btn-ghost { color: var(--ink); }
.btn-ghost:hover { background: #f1f3f4; color: var(--ink); }
.btn-danger { border-color: var(--danger); color: var(--danger); }
.btn-sm { min-height: 32px; padding: 4px 14px; font-size: 13px; }
.btn:disabled { opacity: .4; cursor: not-allowed; }

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
}
a.card:hover { border-color: var(--focus); color: inherit; text-decoration: none; }
.grid-3, .grid-2 { display: grid; gap: 12px; }
@media (min-width: 720px) {
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-2 { grid-template-columns: 1fr 1fr; }
}

.tag, .chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}
a.tag:hover, a.chip:hover {
  border-color: var(--focus);
  color: var(--focus);
  text-decoration: none;
  background: #e8f0fe;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
.badge-lime, .badge-ok, .badge-wait { background: #e6f4ea; color: var(--primary); }
.badge-off { background: #f1f3f4; color: var(--muted); }
.badge-danger { background: #fce8e6; color: var(--danger); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; background: var(--faint); }
.dot-on { background: var(--primary); }

.search, .search-quiet {
  display: grid;
  gap: 12px;
  margin-top: 32px;
}
@media (min-width: 640px) {
  .search, .search-quiet {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }
}
.field { display: grid; gap: 6px; }
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
.input, .textarea, input, textarea, select {
  width: 100%;
  min-height: 44px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-family: var(--font);
  font-size: 16px;
}
textarea, .textarea { min-height: 120px; resize: vertical; }
input:focus, textarea:focus, select:focus, .input:focus {
  outline: none;
  border-color: var(--focus);
  box-shadow: 0 0 0 3px rgba(26,115,232,.2);
}
.hint { font-size: 13px; color: var(--muted); }

.notice, .error, .ok {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  font-size: 14px;
}
.ok { border-color: #ceead6; color: var(--primary); background: #e6f4ea; }
.error { border-color: #f9dedc; color: var(--danger); background: #fce8e6; }

.article-list { display: grid; }
.article-teaser {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.article-teaser h2 { font-size: 18px; font-weight: 500; }
.article-teaser h2 a { color: var(--ink); }
.article-teaser h2 a:hover { color: var(--focus); }
.article-teaser p { margin: 6px 0 0; max-width: 42rem; color: var(--muted); }
.empty {
  padding: 32px 16px;
  text-align: center;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius);
  color: var(--muted);
  background: var(--surface);
}
.empty .btn { margin-top: 12px; }

.wiki-layout { display: grid; gap: 32px; }
@media (min-width: 960px) {
  .wiki-layout { grid-template-columns: minmax(0, 1fr) 15rem; }
}
.prose { max-width: 40rem; color: #3c4043; font-size: 16px; }
.prose p { margin: 0 0 12px; }
.prose a { color: var(--focus); text-decoration: underline; }
.prose strong { color: var(--ink); font-weight: 600; }
.prose h1, .prose h2, .prose h3 { margin: 24px 0 8px; }
.prose ul, .prose ol { margin: 0 0 16px; padding-left: 1.4rem; }
.prose li { margin: 4px 0; }
.prose code {
  background: #f1f3f4;
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.timeline li { position: relative; padding-left: 20px; }
.timeline .dot { position: absolute; left: 0; top: 8px; }
dl.meta-list { margin: 0; }
dl.meta-list > div { padding: 10px 0; border-top: 1px solid var(--line); }
dl.meta-list dt { font-size: 12px; font-weight: 600; color: var(--muted); }
table.data { width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; }
table.data th { font-size: 12px; color: var(--muted); padding-bottom: 8px; }
table.data td { padding: 8px 12px 8px 0; border-top: 1px solid var(--line); vertical-align: top; }
.overflow { overflow-x: auto; }
details summary { cursor: pointer; font-weight: 600; color: var(--focus); }
.span-2 { grid-column: 1 / -1; }

.home-start { max-width: 40rem; }
.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  font-size: 13px;
  color: var(--muted);
}
.crumbs li { display: flex; align-items: center; }
.crumbs li + li::before {
  content: "/";
  padding: 0 8px;
  color: var(--faint);
}
.crumbs a { color: var(--muted); }
.crumbs a:hover { color: var(--ink); }
.crumbs [aria-current="page"] { color: var(--ink); }

.pick-list, .choose-list {
  list-style: none;
  margin: 28px 0 0;
  padding: 0;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
.pick-item, .choose-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 72px;
  padding: 16px 16px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
  background: var(--surface);
}
.pick-list > li:last-child .pick-item,
.choose-list > li:last-child .choose-row,
.choose-list .choose-row:last-child { border-bottom: 0; }
.pick-item:hover, .choose-row:hover {
  background: #f1f3f4;
  color: var(--ink);
  text-decoration: none;
}
.pick-main, .choose-copy { min-width: 0; flex: 1; }
.pick-title, .choose-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}
.pick-sub, .choose-text {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 14px;
}
.pick-meta, .choose-meta {
  color: var(--faint);
  font-size: 12px;
  white-space: nowrap;
}
.pick-go, .choose-go { color: var(--faint); font-size: 22px; line-height: 1; }
.chooser-back { margin: 20px 0 0; font-size: 14px; }

.header-search {
  display: flex;
  gap: 8px;
  align-items: center;
}
.header-search .input {
  min-height: 36px;
  background: #303134;
  border-color: #5f6368;
  color: #fff;
  min-width: 160px;
}
.header-search .btn { min-height: 36px; }

.kolom-grid { display: grid; gap: 8px; margin-top: 16px; }
.wikilink { color: var(--focus); text-decoration: underline; }
.wikilink.is-missing { color: var(--muted); text-decoration-style: dashed; }

.promo-row { margin-top: 32px; max-width: 24rem; }
.promo {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
}
.promo h2 { font-size: 16px; }
.promo p { color: var(--muted); font-size: 14px; }
.gap {
  margin-top: 24px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.sponsor { margin-top: 40px; font-size: 13px; color: var(--muted); }
.form-narrow { max-width: 40rem; }
.lock-note { padding: 10px 12px; background: #e8f0fe; border-radius: var(--radius-sm); color: #174ea6; }
.contact-mail { font-size: 18px; font-weight: 600; }

.cite { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line); }
.cite ol { padding-left: 1.2rem; }
.ai-note { color: var(--muted); font-size: 13px; }
.article-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.kennisweb-block { margin-top: 32px; }
.graph-wrap {
  margin-top: 12px;
  min-height: 420px;
  background: #000;
  border-radius: var(--radius);
  overflow: hidden;
}
.graph-wrap-article { min-height: 280px; }
#kennisweb { display: block; width: 100%; height: 520px; touch-action: none; cursor: grab; }
.graph-wrap-article #kennisweb { height: 280px; }
.graph-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 12px; color: var(--muted); }
.koppel-form { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-top: 12px; }
.bron-row { display: grid; gap: 12px; }
@media (min-width: 640px) { .bron-row { grid-template-columns: 1fr 1fr; } }
.editor-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.rel-list { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 8px; }
.rel-list a { color: var(--ink); }
.wiki-side .card { padding: 12px; }

fieldset.choice-set {
  margin: 0;
  padding: 0;
  border: 0;
  display: grid;
  gap: 8px;
}
.choice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink);
}
.choice:has(input:checked) {
  border-color: var(--primary);
  background: #e6f4ea;
}
.radio-row { display: grid; gap: 8px; }

.chip-pick { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-toggle, .md-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
  cursor: pointer;
}
.md-check input { width: 16px; height: 16px; min-height: 16px; accent-color: var(--primary); }
.md-check:has(input:checked), .chip-toggle.is-on {
  border-color: var(--primary);
  background: #e6f4ea;
  color: var(--primary);
}
.tag-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }

.when-new { display: none; }
.field-switch:has(option[value="__nieuw__"]:checked) .when-new { display: grid; gap: 6px; }

.mention-wrap { position: relative; }
.mention-menu {
  margin-top: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  z-index: 8;
  max-height: 240px;
  overflow: auto;
}
.mention-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: 0;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  font-size: 14px;
}
.mention-item em { font-style: normal; color: var(--muted); }
.mention-item:hover, .mention-item.is-active { background: #e8f0fe; }

.admin-grid { display: grid; gap: 12px; }
@media (min-width: 720px) { .admin-grid { grid-template-columns: 1fr 1fr; } }
.form-grid { display: grid; gap: 12px; }
@media (min-width: 720px) { .form-grid { grid-template-columns: 1fr 1fr; } }
code.k { background: #f1f3f4; padding: 0 6px; }
.privacy h2 { margin-top: 24px; }
`;

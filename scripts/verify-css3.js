const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const before = fs.readFileSync(process.env.TEMP + "/styles.before.css", "utf8");
const after = fs.readFileSync(path.join(root, "public", "assets", "css", "styles.css"), "utf8");

function esc(t) {
  return t.replace(/[.[\]/#:%!]/g, (c) => "\\" + c);
}

// Build map: className -> Set(declarations), considering every rule whose
// selector list contains that class (this is what the browser actually does).
function classDecls(css) {
  const map = new Map();
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let r;
  while ((r = ruleRe.exec(css))) {
    const selectorPart = r[1];
    const body = r[2];
    if (selectorPart.includes("@")) continue; // skip at-rules' inner content handled below
    const sels = selectorPart.split(",").map((s) => s.trim()).filter(Boolean);
    for (const sel of sels) {
      // only plain class selectors like .foo or .foo\:bar:hover
      const m = sel.match(/^\.(\\.|[a-zA-Z0-9_-]|\\.)+(:[a-z-]+(\([^)]*\))?)*$/);
      if (!m) continue;
      const cls = sel.replace(/^\./, "").replace(/\\/g, "").split(":")[0];
      if (!map.has(cls)) map.set(cls, new Set());
      for (const d of body.split(";")) {
        const t = d.trim();
        if (t) map.get(cls).add(t);
      }
    }
  }
  return map;
}

// Also pull in @media blocks (ruleRe above still matches inside them since
// media queries are `@media{...}` and inner rules match normally).
const bm = classDecls(before);
const am = classDecls(after);

let regressions = 0;
let checked = 0;
for (const [cls, bset] of bm) {
  checked++;
  const aset = am.get(cls);
  const lost = [...bset].filter((d) => !(aset && aset.has(d)));
  if (lost.length) {
    regressions++;
    console.log("REGRESSION ." + cls);
    lost.forEach((d) => console.log("    lost: " + d));
  }
}

console.log("classes compared:", checked);
console.log("classes with lost declarations:", regressions, "(must be 0)");

// And the inverse: how many classes are entirely new?
let added = 0;
for (const cls of am.keys()) if (!bm.has(cls)) added++;
console.log("brand-new classes:", added);

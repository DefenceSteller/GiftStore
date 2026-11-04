const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const before = fs.readFileSync(process.env.TEMP + "/styles.before.css", "utf8");
const after = fs.readFileSync(path.join(root, "public", "assets", "css", "styles.css"), "utf8");

function esc(t) {
  return t.replace(/[.[\]/#:%!]/g, (c) => "\\" + c);
}
function present(css, t) {
  const s = "." + esc(t);
  let i = css.indexOf(s);
  while (i !== -1) {
    const n = css[i + s.length];
    if (n === undefined || !/[a-zA-Z0-9_-]/.test(n)) return true;
    i = css.indexOf(s, i + 1);
  }
  return false;
}

// All class tokens used anywhere in TSX
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}
const files = [...walk(path.join(root, "app")), ...walk(path.join(root, "src"))];
const tokens = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/className=\{?"([^"]*)"/g)) {
    for (const tok of m[1].split(/\s+/)) {
      if (!tok || tok.includes("${") || tok.includes("`")) continue;
      if (!/^[a-z][a-zA-Z0-9:\[\]/_.%|-]*$/.test(tok)) continue;
      tokens.add(tok);
    }
  }
}

const stillMissing = [...tokens].filter((t) => !present(after, t)).sort();
const newlyAdded = [...tokens].filter((t) => present(after, t) && !present(before, t)).sort();

console.log("=== classes used in TSX still missing from CSS:", stillMissing.length, "===");
stillMissing.forEach((t) => console.log("   " + t));

console.log("\n=== newly added by this rebuild:", newlyAdded.length, "===");
newlyAdded.forEach((t) => console.log("   " + t));

// Design-safety: nothing that existed before should have disappeared.
// Compare raw rule bodies by extracting every `selector{...}` and checking
// that every before-rule substring still occurs in after.
function rules(css) {
  const out = [];
  const re = /[^{}]+\{[^{}]*\}/g;
  let m;
  while ((m = re.exec(css))) out.push(m[0].trim());
  return out;
}
const beforeRules = rules(before);
const lost = beforeRules.filter((r) => !after.includes(r));
console.log("\n=== rules present BEFORE but gone AFTER:", lost.length, "(must be 0) ===");
lost.slice(0, 20).forEach((r) => console.log("   " + r.slice(0, 120)));

console.log("\nsize:", before.length, "->", after.length);

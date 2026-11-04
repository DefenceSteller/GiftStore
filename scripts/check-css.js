const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "..", "public", "assets", "css", "styles.css"), "utf8");

function escapeClass(tok) {
  return tok.replace(/[.[\]/#:%!]/g, (c) => "\\" + c);
}

function present(tok) {
  const sel = "." + escapeClass(tok);
  let i = css.indexOf(sel);
  while (i !== -1) {
    const next = css[i + sel.length];
    // must be a selector boundary, not a prefix of a longer class name
    if (next === undefined || !/[a-zA-Z0-9_-]/.test(next)) return true;
    i = css.indexOf(sel, i + 1);
  }
  return false;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const root = path.join(__dirname, "..");
const files = [...walk(path.join(root, "app")), ...walk(path.join(root, "src"))];
const missing = new Map();

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const strs = [...src.matchAll(/className=\{?"([^"]*)"/g)].map((x) => x[1]);
  for (const s of strs) {
    for (const tok of s.split(/\s+/)) {
      if (!tok || tok.includes("${") || tok.includes("`")) continue;
      if (!/^[a-z][a-zA-Z0-9:\[\]/_.%|-]*$/.test(tok)) continue;
      if (!present(tok)) missing.set(tok, path.relative(root, f));
    }
  }
}

console.log("Files scanned:", files.length);
console.log("Class tokens NOT in compiled CSS:", missing.size);
for (const [k, v] of [...missing.entries()].sort()) console.log(k.padEnd(42), v);

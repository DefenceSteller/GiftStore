const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const before = fs.readFileSync(process.env.TEMP + "/styles.before.css", "utf8");
const after = fs.readFileSync(path.join(root, "public", "assets", "css", "styles.css"), "utf8");

function esc(t) {
  return t.replace(/[.[\]/#:%!]/g, (c) => "\\" + c);
}

// For each selector used in the "lost" rules, confirm the class still exists
// AND its declarations are unchanged.
const suspects = [
  "line-clamp-1",
  "-translate-y-1/2",
  "translate-x-full",
  "-rotate-3",
  "-rotate-6",
  "blur-3xl",
  "filter",
  "backdrop-blur-lg",
  "backdrop-blur-sm",
  "backdrop-blur-xl",
  "hover:-translate-y-0.5",
  "hover:-translate-y-1.5",
  "hover:-translate-y-2",
];

// Extract declaration block for a given selector from a css string
function declFor(css, sel) {
  const s = "." + esc(sel);
  let i = css.indexOf(s);
  while (i !== -1) {
    const n = css[i + s.length];
    if (n === undefined || !/[a-zA-Z0-9_-]/.test(n)) {
      // find the { after this selector list
      const brace = css.indexOf("{", i);
      const end = css.indexOf("}", brace);
      if (brace !== -1 && end !== -1) {
        const seg = css.slice(i, end + 1);
        // only if our selector is in the selector part before {
        const selPart = seg.slice(0, seg.indexOf("{"));
        if (new RegExp("(^|[,{])" + esc(sel).replace(/\\\\/g, "\\") + "([,{]|$)").test(selPart) ||
            selPart.includes(s)) {
          return seg;
        }
      }
    }
    i = css.indexOf(s, i + 1);
  }
  return null;
}

console.log("selector | present_after | decl_same");
let allOk = true;
for (const sel of suspects) {
  const b = declFor(before, sel);
  const a = declFor(after, sel);
  const same = b !== null && a !== null && b === a;
  if (!same) allOk = false;
  console.log(
    (same ? "OK   " : "DIFF ") + sel.padEnd(24) +
    " before=" + (b ? "yes" : "NO") + " after=" + (a ? "yes" : "NO") +
    (b && a && b !== a ? "\n   BEFORE: " + b.slice(0, 300) + "\n   AFTER : " + a.slice(0, 300) : "")
  );
}
console.log("\nALL IDENTICAL:", allOk);

// Also: are there any declarations in `before` that vanished entirely from `after`?
// Compare sets of "prop:value" pairs.
function decls(css) {
  const out = new Set();
  const re = /[^{}]+\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    for (const d of m[1].split(";")) {
      const t = d.trim();
      if (t) out.add(t);
    }
  }
  return out;
}
const bd = decls(before);
const ad = decls(after);
const lostDecls = [...bd].filter((d) => !ad.has(d));
console.log("\nindividual declarations lost:", lostDecls.length);
lostDecls.forEach((d) => console.log("   " + d));

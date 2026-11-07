const fs = require("fs");
const css = fs.readFileSync("C:\\Users\\Admin\\Desktop\\giftshop\\public\\assets\\css\\styles.css", "utf8");
const classes = new Set();
const re = /\.([a-zA-Z][\w-]*)\s*{/g;
let m;
while ((m = re.exec(css)) !== null) classes.add(m[1]);
const needed = ["max-h-96","bg-ink/60","text-ink/40","text-ink/45","text-ink/50","text-ink/55","text-ink/60","text-ink/70","text-ink/80","border-ink/8","border-ink/10","bg-mist/40","rounded-t-2xl","rounded-b-2xl","rounded-l-2xl","rounded-r-2xl","rounded-[28px]","rounded-[26px]","rounded-b","rounded-s","rounded-e","rounded-3xl","rounded-2xl","rounded-xl","rounded-lg","rounded-md","rounded-full","rounded-t","rounded"];
for (const c of needed) {
  console.log(c, classes.has(c) ? "FOUND" : "MISSING");
}
console.log("Total classes:", classes.size);
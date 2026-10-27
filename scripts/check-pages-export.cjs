const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Validate real build output, including Next.js-generated favicon links and scripts.
const basePath = (process.argv[2] ?? "").replace(/\/+$/, "");
const output = path.resolve("out");
const html = fs.readFileSync(path.join(output, "index.html"), "utf8");
const references = [];
let foundLogo = false;
let foundIcon = false;
for (const [tag] of html.matchAll(/<(?:img|link|script)\b[^>]*>/gi)) {
  const match = tag.match(/(?:src|href)="([^"]+)"/);
  if (!match) continue;
  const value = match[1].replace(/&amp;/g, "&");
  const url = new URL(value, "https://pages-preview.invalid");
  if (url.origin !== "https://pages-preview.invalid") continue;
  assert.ok(url.pathname.startsWith(`${basePath}/`), `Asset points outside the site: ${value}`);
  assert.ok(!url.pathname.includes("/_next/image"), "Static exports cannot use the server image optimizer.");
  const localPath = path.resolve(output, `.${decodeURIComponent(url.pathname.slice(basePath.length))}`);
  assert.ok(localPath.startsWith(output + path.sep), `Asset escapes the export directory: ${value}`);
  assert.ok(fs.existsSync(localPath), `Exported asset is missing: ${value}`);
  if (url.pathname.endsWith("/todolizt-logo.png")) foundLogo = true;
  if (url.pathname.endsWith("/todolizt-icon-32.png") && /rel="icon"/.test(tag)) foundIcon = true;
  references.push(value);
}
assert.ok(foundLogo, "The exported page must include the TodoLizt logo.");
assert.ok(foundIcon, "The exported page must declare the TodoLizt favicon.");
console.log(`Verified ${references.length} exported asset references under ${basePath || "/"}.`);

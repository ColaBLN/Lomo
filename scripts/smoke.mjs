import { readFileSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "manifest.webmanifest",
  "src/main.jsx",
  "src/services/camera.js",
  "src/services/lomo.js",
  "src/styles.css",
];

for (const file of requiredFiles) {
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

const app = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const camera = readFileSync(new URL("../src/services/camera.js", import.meta.url), "utf8");
const lomo = readFileSync(new URL("../src/services/lomo.js", import.meta.url), "utf8");

const checks = [
  ["UI avoids preview elements", !app.includes("<img") && !app.includes("<canvas")],
  ["capture API exported", camera.includes("export async function captureBlindPhoto")],
  ["stream tracks are stopped", camera.includes("track.stop()")],
  ["JPEG export present", camera.includes('"image/jpeg"')],
  ["auto download path present", app.includes("triggerAutomaticDownload") && app.includes("link.download")],
  ["portrait crop present", camera.includes("const PORTRAIT_RATIO = 9 / 16")],
  ["lomo API exported", lomo.includes("export function applyRandomLomoEffect")],
  ["film profile randomizer present", lomo.includes("chooseFilmProfile") && lomo.includes("addFilmBurn")],
];

const failed = checks.filter(([, passed]) => !passed);

if (failed.length) {
  for (const [name] of failed) {
    console.error(`failed: ${name}`);
  }
  process.exit(1);
}

console.log("smoke checks passed");

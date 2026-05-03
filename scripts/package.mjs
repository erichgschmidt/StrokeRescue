// Build a sideload-ready plugin folder + .ccx (zip) in dist/.
//
// Output layout:
//   dist/StrokeRescue/
//     manifest.json
//     index.html
//     index.js
//   dist/StrokeRescue.ccx
//
// Strips the icons block from the bundled manifest because icon files don't
// yet exist in the repo (otherwise UDT shows a "missing icon" warning).

import { execSync } from "node:child_process";
import { mkdirSync, rmSync, copyFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const pluginDir = join(distDir, "StrokeRescue");
const ccxPath = join(distDir, "StrokeRescue.ccx");

console.log("[package] running webpack build…");
execSync("npm run build", { cwd: root, stdio: "inherit" });

console.log("[package] preparing dist folder…");
rmSync(distDir, { recursive: true, force: true });
mkdirSync(pluginDir, { recursive: true });

const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
delete manifest.icons;
writeFileSync(join(pluginDir, "manifest.json"), JSON.stringify(manifest, null, 2));

copyFileSync(join(root, "index.html"), join(pluginDir, "index.html"));
copyFileSync(join(root, "index.js"), join(pluginDir, "index.js"));

console.log("[package] zipping → .ccx…");
// .ccx is just a zip with a different extension. PowerShell Compress-Archive
// won't accept .ccx as a destination, so zip then rename.
const tmpZip = join(distDir, "StrokeRescue.zip");
const psCmd = `Compress-Archive -Path '${pluginDir}\\*' -DestinationPath '${tmpZip}' -Force`;
execSync(`powershell -NoProfile -Command "${psCmd}"`, { cwd: root, stdio: "inherit" });
execSync(`powershell -NoProfile -Command "Move-Item -Force '${tmpZip}' '${ccxPath}'"`, { cwd: root, stdio: "inherit" });

if (!existsSync(ccxPath)) {
  console.error("[package] ccx build failed");
  process.exit(1);
}

console.log(`[package] done.`);
console.log(`  folder: ${pluginDir}`);
console.log(`  ccx:    ${ccxPath}`);

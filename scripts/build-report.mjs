import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist", "assets");

if (!existsSync(assetsDir)) {
  console.log("No dist/assets directory found. Run npm run build first.");
  process.exit(0);
}

const rows = readdirSync(assetsDir)
  .filter((file) => file.endsWith(".js"))
  .map((file) => {
    const bytes = statSync(join(assetsDir, file)).size;
    const kb = bytes / 1024;
    const category = file.includes("three-r3f") ? "known three-r3f exception" : kb > 250 ? "review" : "ok";
    return { file, kb, category };
  })
  .sort((a, b) => b.kb - a.kb);

const total = rows.reduce((sum, row) => sum + row.kb, 0);
console.log("Franchise Ice lite bundle report");
console.log(`Total JS: ${total.toFixed(1)} kB`);
rows.forEach((row) => {
  console.log(`${row.file}: ${row.kb.toFixed(1)} kB (${row.category})`);
});

const manifestPath = join(process.cwd(), "dist", ".vite", "manifest.json");
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  console.log(`Manifest entries: ${Object.keys(manifest).length}`);
}

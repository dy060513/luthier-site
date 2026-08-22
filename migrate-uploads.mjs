// One-shot migration: extract base64 images from instruments.json into assets/uploads/
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const dataPath = path.join(ROOT, "data", "instruments.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const uploadDir = path.join(ROOT, "assets", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

let moved = 0;
for (const item of data.instruments || []) {
  if (!Array.isArray(item.images)) continue;
  item.images = item.images.map((src, i) => {
    if (typeof src !== "string" || !src.startsWith("data:image")) return src;
    const m = src.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) return src;
    const ext = m[1].includes("png") ? "png" : m[1].includes("webp") ? "webp" : "jpg";
    const name = `img-${item.id}-${i + 1}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, name), Buffer.from(m[2], "base64"));
    moved++;
    return `assets/uploads/${name}`;
  });
  if (item.image && typeof item.image === "string" && item.image.startsWith("data:image")) {
    const m = item.image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (m) {
      const ext = m[1].includes("png") ? "png" : m[1].includes("webp") ? "webp" : "jpg";
      const name = `img-${item.id}-main.${ext}`;
      fs.writeFileSync(path.join(uploadDir, name), Buffer.from(m[2], "base64"));
      item.image = `assets/uploads/${name}`;
      moved++;
    }
  }
}
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
console.log(`moved ${moved} images to assets/uploads/; json size: ${Math.round(fs.statSync(dataPath).size / 1024)}KB`);

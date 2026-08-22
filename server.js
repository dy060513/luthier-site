// 本地预览服务器：node server.js  →  http://localhost:8080
// 部署到 Vercel / GitHub Pages 时不需要本文件。
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);

    // Admin write-back: POST /api/save  →  updates data/instruments.json
    // (local preview server only; static hosts ignore this and use export/import)
    if (req.method === "POST" && p === "/api/save") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        try {
          const d = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (!d || !Array.isArray(d.instruments) || !d.site) throw new Error("bad payload");
          fs.writeFile(path.join(ROOT, "data", "instruments.json"), JSON.stringify(d, null, 2), "utf8", (err) => {
            res.writeHead(err ? 500 : 200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: !err }));
          });
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "bad payload" }));
        }
      });
      return;
    }

    // Admin image upload: POST /api/upload (image bytes) → saved under assets/uploads/
    if (req.method === "POST" && p === "/api/upload") {
      const ext = /png/i.test(req.headers["content-type"] || "") ? "png" : (/webp/i.test(req.headers["content-type"] || "") ? "webp" : "jpg");
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const buf = Buffer.concat(chunks);
        const dir = path.join(ROOT, "assets", "uploads");
        fs.mkdir(dir, { recursive: true }, (err) => {
          if (err) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false })); return; }
          const name = "img-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6) + "." + ext;
          fs.writeFile(path.join(dir, name), buf, (err2) => {
            if (err2) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false })); return; }
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: true, path: "assets/uploads/" + name }));
          });
        });
      });
      return;
    }

    if (p === "/") p = "/index.html";
    const file = path.join(ROOT, p);
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found: " + p);
        return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log("luthier-site 预览地址: http://127.0.0.1:" + PORT + "  （局域网: http://<本机IP>:" + PORT + "）");
  });

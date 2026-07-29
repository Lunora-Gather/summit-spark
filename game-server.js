const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const csp = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self' https://fra.cloud.appwrite.io",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "worker-src 'none'"
].join("; ");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8"
};
const publicFiles = new Map([
  ["/index.html", path.join("public", "index.html")],
  ["/summit-spark.css", path.join("public", "summit-spark.css")],
  ["/summit-spark.js", path.join("public", "summit-spark.js")],
  ["/modules/core/format.mjs", path.join("public", "modules", "core", "format.mjs")],
  ["/modules/core/math.mjs", path.join("public", "modules", "core", "math.mjs")],
  ["/modules/game/room-data.mjs", path.join("public", "modules", "game", "room-data.mjs")],
  ["/modules/systems/storage.mjs", path.join("public", "modules", "systems", "storage.mjs")],
  ["/modules/systems/input.mjs", path.join("public", "modules", "systems", "input.mjs")],
  ["/vendor/appwrite-26.2.0.js", path.join("public", "vendor", "appwrite-26.2.0.js")],
  ["/vendor/APPWRITE-LICENSE", path.join("public", "vendor", "APPWRITE-LICENSE")]
]);
const securityHeaders = {
  "cache-control": "no-store",
  "content-security-policy": csp,
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
};

function respond(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { ...securityHeaders, ...extraHeaders });
  if (body !== null) res.end(body);
  else res.end();
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    respond(res, 405, "Method not allowed", { allow: "GET, HEAD" });
    return;
  }

  let requested;
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    requested = decodeURIComponent(url.pathname);
  } catch {
    respond(res, 400, "Bad request");
    return;
  }
  if (requested === "/") requested = "/index.html";
  const relative = publicFiles.get(requested);
  if (!relative) {
    respond(res, 404, "Not found");
    return;
  }
  const file = path.join(root, relative);

  fs.readFile(file, (error, data) => {
    if (error) {
      respond(res, 404, "Not found");
      return;
    }
    respond(
      res,
      200,
      req.method === "HEAD" ? null : data,
      { "content-type": types[path.extname(file)] || "text/plain; charset=utf-8" }
    );
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`山巅微光: http://127.0.0.1:${port}/`);
});

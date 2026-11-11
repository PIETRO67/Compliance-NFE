import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

const root = resolve("out");
const port = Number(process.env.PORT || 3003);
const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
createServer(async (request, response) => {
  const relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const path = resolve(root, "." + relative);
  if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  for (const candidate of [path, path + ".html", resolve(path, "index.html")]) {
    try {
      if (!(await stat(candidate)).isFile()) continue;
      response.writeHead(200, { "Content-Type": mime[extname(candidate)] || "application/octet-stream" });
      response.end(await readFile(candidate));
      return;
    } catch { /* Try the next exported path. */ }
  }
  response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  response.end(await readFile(resolve(root, "404.html")));
}).listen(port, "127.0.0.1", () => console.log(`DEMO exportado: http://127.0.0.1:${port}`));

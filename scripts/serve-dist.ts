/// <reference types="node" />
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

// Serves dist/client as `pnpm run deploy` configures convex-hosting: a file, else the
// shell for navigations, else 404. `vite preview` server-renders each route instead.
const root = path.resolve("dist/client");
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer((request, response) => {
  // URL parsing removes dot segments and keeps percent-encoding, so the path stays in root.
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  let file = path.join(root, pathname);
  if (!statSync(file, { throwIfNoEntry: false })?.isFile()) {
    if (request.headers["sec-fetch-mode"] !== "navigate") {
      response.writeHead(404).end();
      return;
    }
    file = path.join(root, "index.html");
  }
  response.writeHead(200, {
    "Content-Type":
      contentTypes[path.extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
}).listen(8787);

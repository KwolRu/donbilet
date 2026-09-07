const express = require("express");
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Dev-сервер фронта с проксированием /api → gateway.
 *
 * Нужен, чтобы в локальной разработке фронт и API были на одном origin: иначе
 * httpOnly-cookies с access/refresh не долетают (cross-site на localhost).
 * В проде ту же роль выполняет nginx (deploy/nginx/app.conf), и этот файл не
 * используется — там `next start`.
 */

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const gatewayUrl = process.env.GATEWAY_PROXY_URL || "http://127.0.0.1:5000";

// Единый прокси: HTTP и WebSocket. Тенант-заголовки не проставляются —
// workspace резолвится из JWT на gateway (см. ADR-0002).
const apiProxy = createProxyMiddleware({
  target: gatewayUrl,
  changeOrigin: true,
  ws: true,
  pathFilter: (pathname) => pathname.startsWith("/api"),
  onProxyReq: (proxyReq, req) => {
    const cookie = req.headers.cookie;
    if (cookie) {
      proxyReq.setHeader("Cookie", cookie);
    }
  },
  onProxyReqWs: (proxyReq, req) => {
    const cookie = req.headers.cookie;
    if (cookie) {
      proxyReq.setHeader("Cookie", cookie);
    }
  },
});

app.prepare().then(() => {
  const expressApp = express();

  expressApp.use(apiProxy);

  expressApp.use((req, res) => {
    const parsedUrl = parse(req.url, true);
    return handle(req, res, parsedUrl);
  });

  const server = createServer(expressApp);
  // Upgrade-запросы не проходят через обычный pipeline Express —
  // регистрируем прокси явно, иначе WebSocket в dev не работает.
  server.on("upgrade", apiProxy.upgrade);

  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> API proxy → ${gatewayUrl}`);
  });
});

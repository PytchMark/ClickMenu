// Simple proxy to forward port 3000 requests to backend on port 8001
const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});
const PORT = 3000;
const BACKEND = 'http://127.0.0.1:8001';

const server = http.createServer((req, res) => {
  proxy.web(req, res, { target: BACKEND }, (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  });
});

server.listen(PORT, () => {
  console.log(`Frontend proxy listening on port ${PORT}, forwarding to ${BACKEND}`);
});

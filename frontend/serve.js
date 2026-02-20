const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const NODE_URL = process.env.NODE_SERVER_URL || 'http://localhost:8080';

// Proxy everything to the Node.js server
app.use('/', createProxyMiddleware({
  target: NODE_URL,
  changeOrigin: true,
  ws: true,
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend proxy running on port ${PORT} -> ${NODE_URL}`);
});

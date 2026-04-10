// Vercel Serverless Function — Express handles API; serves React SPA fallback
const path = require('path');
const app = require('../server-server');

// Serve React static assets (CSS, JS, images) — Vercel CDN handles these
// but express.static is the fallback for anything not matched by CDN
app.use(require('express').static(path.join(__dirname, '../build')));

// SPA fallback — all non-API paths return index.html for React Router
app.use((req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../build', 'index.html'));
});

module.exports = app;


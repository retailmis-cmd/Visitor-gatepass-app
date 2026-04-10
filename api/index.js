// Vercel Serverless Function — Express handles API + serves React build
const path = require('path');
const express = require('express');
const app = require('../server-server');

// Serve React static files (CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, '../build')));

// SPA fallback — React router handles all non-API paths
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

module.exports = app;


// Vercel Serverless Function — explicit handler to avoid Express 5 routing quirks
const app = require('../server-server');

module.exports = (req, res) => app(req, res);


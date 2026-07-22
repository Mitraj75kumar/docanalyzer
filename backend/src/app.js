const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security & core middleware
// Helmet's default CSP blocks inline scripts/styles that Vite's build output needs,
// so it's relaxed here since we're serving our own trusted frontend build, not
// arbitrary third-party content.
app.use(helmet({ contentSecurityPolicy: false, hsts: false }));
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(compression({
  filter: (req, res) => {
    if (req.path.includes('/chat/stream')) return false;
    return compression.filter(req, res);
  },
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use('/api', apiLimiter);

// Routes
app.use('/api', routes);

// Serve the built frontend (frontend/dist copied into backend/public at deploy time)
// if present. In local dev, this folder won't exist and the frontend runs separately
// via its own Vite dev server instead - this only matters for combined production
// deployment (e.g. AWS Elastic Beanstalk single-instance setup).
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback: any non-API route serves index.html so React Router can handle it
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// 404 + centralized error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;


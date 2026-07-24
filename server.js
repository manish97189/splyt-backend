/**
 * server.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: The Express application entry point.
 *
 * This file:
 *   1. Loads environment variables from .env (must be first, before any other
 *      import that reads process.env).
 *   2. Creates the Express app and attaches global middleware (JSON parser,
 *      CORS).
 *   3. Mounts all route groups under their URL prefixes.
 *   4. Connects to the database (Sequelize) and syncs models to create/update
 *      tables automatically.
 *   5. Starts the HTTP server.
 *
 * EXPRESS MIDDLEWARE EXPLAINED:
 *   Middleware is a function that runs on every request BEFORE it reaches
 *   your route handler. Middleware functions receive (req, res, next) and
 *   either respond immediately or call next() to pass control onward.
 *   - express.json() parses request bodies with Content-Type: application/json
 *   - cors() adds CORS headers so the browser allows cross-origin requests
 *     from the React dev server (localhost:5173 → localhost:5000)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// MUST be the very first line — loads .env values into process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import all route handlers (we'll create these files next)
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const settlementRoutes = require('./routes/settlements');

// models/index.js exports the sequelize instance + all models.
// Importing it here triggers model registration with Sequelize.
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ────────────────────────────────────────────────────────

// Parse incoming request bodies as JSON. Without this, req.body is undefined.
app.use(express.json());

// CORS (Cross-Origin Resource Sharing): browsers block requests from one
// origin (localhost:5173) to a different origin (localhost:5000) by default.
// This middleware adds the necessary response headers to allow it.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
// Each router handles a group of related endpoints.
// We prefix all routes with /api/ to clearly distinguish the REST API from
// any static file serving we might add later.

app.use('/api/auth', authRoutes);

// Groups and expenses share the /api/groups prefix.
// expenseRoutes uses mergeParams: true so it can access :id from the parent.
app.use('/api/groups', groupRoutes);
app.use('/api/groups', expenseRoutes);
app.use('/api/groups', settlementRoutes);

// Health check — a quick endpoint to verify the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// If no route matched, return a clean JSON 404 instead of Express's HTML error.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// Any middleware/route that calls next(err) ends up here.
// Must have 4 parameters — Express detects it's an error handler by arity.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ─── Database Connection + Server Start ──────────────────────────────────────
// sequelize.authenticate() sends a test query to Postgres to verify credentials.
// sequelize.sync() creates any tables that don't exist yet (based on models).
//   { alter: true } will also add new columns/indexes to existing tables,
//   but won't drop columns — safe for development. Use migrations in production.

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully.');

    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronised.');

    app.listen(PORT, () => {
      console.log(`🚀 SplitSquare API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error.message);
    process.exit(1); // non-zero exit tells the OS something went wrong
  }
})();

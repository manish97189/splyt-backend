/**
 * routes/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Define HTTP endpoints for authentication (register / login).
 *
 * These routes are PUBLIC — no JWT required. They are mounted at /api/auth
 * in server.js, so the full URLs become:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *
 * Express Router creates a mini-app with its own middleware and route table.
 * We export it and mount it in server.js with app.use('/api/auth', authRoutes).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();
const { register, login } = require('../controllers/authController');

// Public routes — no auth middleware attached
router.post('/register', register);
router.post('/login',    login);

module.exports = router;

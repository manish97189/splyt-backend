/**
 * controllers/authController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Business logic for user registration and login.
 *
 * CONTROLLER PATTERN:
 *   Routes (routes/auth.js) define URL endpoints and HTTP methods.
 *   Controllers contain the actual logic — DB queries, password hashing, etc.
 *   Keeping these separate makes controllers independently testable and routes
 *   clean/readable.
 *
 * BCRYPT EXPLAINED:
 *   bcrypt is a password-hashing algorithm. It's deliberately *slow* — this
 *   makes brute-forcing stolen hashes impractical. The "salt rounds" (10)
 *   controls how many rounds of hashing to do. 10 is a good balance between
 *   security and performance (≈100ms per hash on modern hardware).
 *
 * JWT PAYLOAD:
 *   We embed only { id, name, email } in the token — the minimum needed for
 *   the frontend to display the user's name and for the middleware to
 *   identify who made a request. Never embed the password hash.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { User } = require('../models');

// ─── Register ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Expects body: { name, email, password }
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if email is already registered
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    // Hash the password before storing. bcrypt.hash() is async; we await it.
    // saltRounds = 10 means 2^10 = 1024 hashing iterations.
    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password_hash });

    // Issue a JWT token immediately so the user is logged in after registering
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email }, // payload
      process.env.JWT_SECRET,                               // signing secret
      { expiresIn: '7d' }                                   // expiry
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Expects body: { email, password }
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Return a generic message — don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // bcrypt.compare() hashes the provided password with the stored salt and
    // checks whether the result matches the stored hash.
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

module.exports = { register, login };

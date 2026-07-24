/**
 * middleware/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: JWT authentication middleware — protects all routes that require
 * the user to be logged in.
 *
 * HOW JWT AUTHENTICATION WORKS:
 *   1. On login, the server creates a signed token containing the user's id
 *      and name. The client stores this token (in memory / localStorage).
 *   2. On every subsequent request, the client sends the token in the
 *      Authorization header: "Bearer <token>"
 *   3. This middleware extracts the token, verifies its signature using the
 *      same secret that was used to sign it, and decodes the payload.
 *   4. If valid, it attaches the decoded payload to req.user so route
 *      handlers can read req.user.id without hitting the database.
 *   5. If invalid/missing, it short-circuits with 401 Unauthorized.
 *
 * This is a "guard" — attach it to any router or individual route to protect it:
 *   router.get('/protected', authMiddleware, handler)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // The Authorization header should look like: "Bearer eyJhbGci..."
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  // Split "Bearer <token>" → take the second part
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token format must be: Bearer <token>' });
  }

  const token = parts[1];

  try {
    // jwt.verify() does two things:
    //   1. Validates the signature (was this token created with our secret?)
    //   2. Checks the expiry claim (has the token expired?)
    // If either check fails it throws an error — caught below.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded payload (id, name, email, iat, exp) to the request
    // so downstream handlers can use req.user.id without another DB query.
    req.user = decoded;

    next(); // pass control to the next middleware / route handler
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
};

module.exports = authMiddleware;

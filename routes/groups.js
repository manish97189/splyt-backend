/**
 * routes/groups.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: HTTP endpoints for Group and GroupMember management.
 *
 * All routes here are PROTECTED — the authMiddleware runs before every handler,
 * so req.user is always populated when a controller runs.
 *
 * Mounted at /api/groups in server.js:
 *   POST   /api/groups              → createGroup
 *   GET    /api/groups              → listGroups
 *   GET    /api/groups/:id          → getGroup
 *   POST   /api/groups/:id/members  → addMember
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createGroup,
  listGroups,
  getGroup,
  addMember,
} = require('../controllers/groupController');

// Attach auth middleware to ALL routes in this router
router.use(auth);

router.post('/', createGroup);
router.get('/', listGroups);
router.get('/:id', getGroup);
router.post('/:id/members', addMember);

module.exports = router;

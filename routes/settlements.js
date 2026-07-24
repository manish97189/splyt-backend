/**
 * routes/settlements.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: HTTP endpoints for balances and settlements within a group.
 *
 * Mounted at /api/groups in server.js:
 *   GET  /api/groups/:id/balances     → getBalances
 *   GET  /api/groups/:id/settlements  → getSettlements
 *   POST /api/groups/:id/settle       → settle (run algorithm + persist)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router({ mergeParams: true });
const auth    = require('../middleware/auth');
const {
  getBalances,
  getSettlements,
  settle,
} = require('../controllers/settlementController');

router.use(auth);

router.get('/:id/balances',    getBalances);
router.get('/:id/settlements', getSettlements);
router.post('/:id/settle',     settle);

module.exports = router;

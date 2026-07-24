/**
 * routes/expenses.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: HTTP endpoints for Expense operations within a Group.
 *
 * { mergeParams: true } is REQUIRED here because this router is mounted as a
 * child of /api/groups in server.js. Without it, req.params.id (the group id)
 * would be undefined — mergeParams tells Express to inherit URL params from
 * the parent router.
 *
 * Mounted at /api/groups in server.js:
 *   POST /api/groups/:id/expenses  → createExpense
 *   GET  /api/groups/:id/expenses  → listExpenses
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router({ mergeParams: true }); // inherit :id from parent
const auth    = require('../middleware/auth');
const { createExpense, listExpenses } = require('../controllers/expenseController');

router.use(auth);

router.post('/:id/expenses', createExpense);
router.get('/:id/expenses',  listExpenses);

module.exports = router;

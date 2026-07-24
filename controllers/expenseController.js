/**
 * controllers/expenseController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Business logic for creating and listing expenses within a group.
 *
 * EQUAL SPLIT LOGIC:
 *   When an expense is created, we fetch the current group member list and
 *   divide the total amount equally. We use `parseFloat(...toFixed(2))` to
 *   round to cents, then adjust the payer's share by any rounding remainder
 *   so that all splits sum exactly to the total.
 *
 *   Example: $100 split among 3 people
 *     each = 33.33  (33.333... rounded to 2dp)
 *     remainder = 100 - (33.33 * 3) = 0.01
 *     payer's share = 33.33 + 0.01 = 33.34
 *     → splits: [33.34, 33.33, 33.33] = 100.00 ✓
 *
 * WHY store splits at creation time?
 *   If we recalculate splits dynamically we'd get wrong results when new
 *   members are added after an expense was created. Storing them as rows
 *   freezes the split at the moment of creation — the source of truth.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Expense, ExpenseSplit, GroupMember, Group, User, sequelize } = require('../models');

// ─── Create Expense ───────────────────────────────────────────────────────────
// POST /api/groups/:id/expenses
// Body: { description, amount }
const createExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const groupId = parseInt(req.params.id);
    const { description, amount } = req.body;

    // Validate inputs
    if (!description || !amount) {
      await t.rollback();
      return res.status(400).json({ error: 'description and amount are required.' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'amount must be a positive number.' });
    }

    // Verify group exists
    const group = await Group.findByPk(groupId);
    if (!group) {
      await t.rollback();
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Verify the requester is a member of this group
    const requesterMembership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: req.user.id },
    });
    if (!requesterMembership) {
      await t.rollback();
      return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
    }

    // Fetch all current group members to split the expense among
    const memberships = await GroupMember.findAll({
      where: { group_id: groupId },
    });

    if (memberships.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Group has no members.' });
    }

    // ── Create the Expense row ──────────────────────────────────────────────
    const expense = await Expense.create(
      {
        group_id:    groupId,
        paid_by:     req.user.id,
        description: description.trim(),
        amount:      numAmount,
      },
      { transaction: t }
    );

    // ── Compute equal splits ────────────────────────────────────────────────
    const memberCount = memberships.length;
    const baseShare   = parseFloat((numAmount / memberCount).toFixed(2));

    // Calculate the remainder caused by rounding (e.g., $0.01 for 3-person split)
    const remainder = parseFloat(
      (numAmount - baseShare * memberCount).toFixed(2)
    );

    // Build the array of split rows. We give the remainder to the payer's share
    // because they already know the exact total they paid.
    const splitRows = memberships.map((m, idx) => {
      const isPayerRow = m.user_id === req.user.id;
      const share = isPayerRow
        ? parseFloat((baseShare + remainder).toFixed(2))
        : baseShare;

      return {
        expense_id:   expense.id,
        user_id:      m.user_id,
        share_amount: share,
      };
    });

    await ExpenseSplit.bulkCreate(splitRows, { transaction: t });

    await t.commit();

    // Fetch the created expense with payer info for the response
    const expenseWithDetails = await Expense.findByPk(expense.id, {
      include: [
        { model: User, as: 'payer', attributes: ['id', 'name', 'email'] },
        { model: ExpenseSplit, as: 'splits' },
      ],
    });

    res.status(201).json(expenseWithDetails);
  } catch (err) {
    await t.rollback();
    console.error('createExpense error:', err);
    res.status(500).json({ error: 'Failed to create expense.' });
  }
};

// ─── List Expenses ────────────────────────────────────────────────────────────
// GET /api/groups/:id/expenses
const listExpenses = async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    // Verify the requester is a member
    const membership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: req.user.id },
    });
    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const expenses = await Expense.findAll({
      where: { group_id: groupId },
      include: [
        { model: User, as: 'payer', attributes: ['id', 'name', 'email'] },
        {
          model: ExpenseSplit,
          as: 'splits',
          include: [{ model: User, as: 'debtor', attributes: ['id', 'name'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(expenses);
  } catch (err) {
    console.error('listExpenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
};

module.exports = { createExpense, listExpenses };

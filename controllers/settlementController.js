/**
 * controllers/settlementController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Compute and persist settlement suggestions for a group.
 *
 * THREE ENDPOINTS:
 *
 * 1. GET /api/groups/:id/balances
 *    Returns each member's net balance (what they're owed or owe).
 *    Net balance = (sum of expenses paid by them) − (sum of their expense splits)
 *    Positive → they are owed money; Negative → they owe money.
 *
 * 2. GET /api/groups/:id/settlements
 *    Returns the most recently persisted Settlement rows for the group.
 *    These were written by the settle endpoint below.
 *
 * 3. POST /api/groups/:id/settle
 *    Recalculates all balances, runs the settleUp algorithm, DELETES old
 *    Settlement rows, and INSERTs fresh ones. Idempotent: safe to call
 *    multiple times — you always get the current optimum.
 *
 * WHY AGGREGATE IN JS, NOT PURE SQL?
 *    We could write a single complex GROUP BY query, but doing the aggregation
 *    in JavaScript after fetching raw rows is clearer for learning purposes
 *    and performs fine at the scale of a portfolio project.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  Group,
  GroupMember,
  Expense,
  ExpenseSplit,
  Settlement,
  User,
  sequelize,
} = require('../models');
const settleUp = require('../utils/settleUp');

// ─── Helper: compute net balances for a group ─────────────────────────────────
// Returns { userId: netBalance, ... } for every member
async function computeBalances(groupId) {
  // Fetch all members
  const memberships = await GroupMember.findAll({
    where: { group_id: groupId },
    include: [{ model: User, as: 'member', attributes: ['id', 'name', 'email'] }],
  });

  // Initialise each member's balance to 0
  const balances = {};
  const memberMap = {}; // userId → user object (for response enrichment)
  for (const m of memberships) {
    balances[m.user_id] = 0;
    memberMap[m.user_id] = m.member;
  }

  // Fetch all expenses with their splits in one query
  const expenses = await Expense.findAll({
    where: { group_id: groupId },
    include: [{ model: ExpenseSplit, as: 'splits' }],
  });

  for (const expense of expenses) {
    const paidBy = expense.paid_by;
    const amount = parseFloat(expense.amount);

    // The payer gets credit for the full amount they fronted
    if (balances[paidBy] !== undefined) {
      balances[paidBy] += amount;
    }

    // Every member's split is subtracted from their balance
    for (const split of expense.splits) {
      if (balances[split.user_id] !== undefined) {
        balances[split.user_id] -= parseFloat(split.share_amount);
      }
    }
  }

  // Round to 2dp to eliminate floating-point dust
  for (const userId of Object.keys(balances)) {
    balances[userId] = parseFloat(balances[userId].toFixed(2));
  }

  return { balances, memberMap };
}

// ─── GET /api/groups/:id/balances ─────────────────────────────────────────────
const getBalances = async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    // Access control: requester must be a member
    const membership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: req.user.id },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied.' });

    const { balances, memberMap } = await computeBalances(groupId);

    // Enrich response: attach user info to each balance entry
    const result = Object.entries(balances).map(([userId, balance]) => ({
      user: memberMap[userId],
      balance,
    }));

    res.json(result);
  } catch (err) {
    console.error('getBalances error:', err);
    res.status(500).json({ error: 'Failed to compute balances.' });
  }
};

// ─── GET /api/groups/:id/settlements ──────────────────────────────────────────
const getSettlements = async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const membership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: req.user.id },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied.' });

    const settlements = await Settlement.findAll({
      where: { group_id: groupId },
      include: [
        { model: User, as: 'settler', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'settlee', attributes: ['id', 'name', 'email'] },
      ],
      order: [['settled_at', 'DESC']],
    });

    res.json(settlements);
  } catch (err) {
    console.error('getSettlements error:', err);
    res.status(500).json({ error: 'Failed to fetch settlements.' });
  }
};

// ─── POST /api/groups/:id/settle ──────────────────────────────────────────────
const settle = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const groupId = parseInt(req.params.id);

    const group = await Group.findByPk(groupId);
    if (!group) {
      await t.rollback();
      return res.status(404).json({ error: 'Group not found.' });
    }

    const membership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: req.user.id },
    });
    if (!membership) {
      await t.rollback();
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Compute current balances
    const { balances, memberMap } = await computeBalances(groupId);

    // Run the pure settle-up algorithm
    const transactions = settleUp(balances);

    // Delete existing settlement rows for this group (idempotent overwrite)
    await Settlement.destroy({ where: { group_id: groupId }, transaction: t });

    // Persist fresh settlement rows
    if (transactions.length > 0) {
      const settlementRows = transactions.map((tx) => ({
        group_id:  groupId,
        paid_by:   parseInt(tx.from),
        paid_to:   parseInt(tx.to),
        amount:    tx.amount,
        settled_at: new Date(),
      }));
      await Settlement.bulkCreate(settlementRows, { transaction: t });
    }

    await t.commit();

    // Build a human-readable response with user names
    const result = transactions.map((tx) => ({
      from:   memberMap[tx.from],
      to:     memberMap[tx.to],
      amount: tx.amount,
    }));

    res.json({
      message: transactions.length === 0
        ? 'All balances are settled — no transactions needed!'
        : `${transactions.length} settlement transaction(s) computed.`,
      transactions: result,
    });
  } catch (err) {
    await t.rollback();
    console.error('settle error:', err);
    res.status(500).json({ error: 'Failed to compute settlements.' });
  }
};

module.exports = { getBalances, getSettlements, settle };

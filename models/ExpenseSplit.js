/**
 * models/ExpenseSplit.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Records how much of a given Expense each member owes.
 *
 * For an equal split of a $120 expense among 3 members:
 *   ExpenseSplit { expense_id: 7, user_id: 1, share_amount: 40.00 }
 *   ExpenseSplit { expense_id: 7, user_id: 2, share_amount: 40.00 }
 *   ExpenseSplit { expense_id: 7, user_id: 3, share_amount: 40.00 }
 *
 * To calculate a user's net balance in a group:
 *   net = (SUM of Expenses.amount WHERE paid_by = me)
 *       - (SUM of ExpenseSplits.share_amount WHERE user_id = me)
 *
 * If net > 0 → others owe you money (creditor)
 * If net < 0 → you owe others money (debtor)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ExpenseSplit = sequelize.define(
  'ExpenseSplit',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    expense_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'expenses', key: 'id' },
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },

    // This user's share of the expense amount
    share_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    underscored: true,
    timestamps: false, // splits are immutable once created; no need for timestamps
  }
);

module.exports = ExpenseSplit;

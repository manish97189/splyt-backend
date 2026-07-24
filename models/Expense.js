/**
 * models/Expense.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Represents a single shared expense within a group.
 *
 * When someone pays for dinner, they record an Expense with the total amount.
 * The individual shares each member owes are stored separately in ExpenseSplit
 * rows — one per member. This separation lets us:
 *   • Support unequal splits in the future (today we only do equal).
 *   • Query "what did this group spend?" without loading split details.
 *   • Aggregate per-user owed amounts efficiently via SQL JOIN.
 *
 * `amount` is stored as DECIMAL(10, 2) — 10 total digits, 2 after the decimal
 * point — which avoids floating-point rounding errors that FLOAT would cause
 * (e.g., 33.333... splits causing cents discrepancies).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define(
  'Expense',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'groups', key: 'id' },
    },

    // FK: which User paid the bill upfront
    paid_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },

    // Short description: "Pizza night", "Uber to airport", etc.
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Total amount paid (e.g., 120.00). Splits must sum to this.
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01, // reject zero or negative expenses
      },
    },
  },
  {
    underscored: true, // uses created_at / updated_at
  }
);

module.exports = Expense;

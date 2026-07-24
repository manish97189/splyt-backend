/**
 * models/Settlement.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Records a "settle up" transaction — one user paying another to
 * clear their debt within a group.
 *
 * When the settle-up algorithm runs it produces a minimum list of transfers
 * like: "Alice pays Bob $45". We persist each of those as a Settlement row.
 *
 * These rows are the *output* of the settle-up algorithm. They are computed
 * fresh each time POST /api/groups/:id/settle is called (old rows for the
 * group are deleted and replaced) — so they always reflect the current state
 * of expenses.
 *
 * Note: Two separate FK aliases are needed on the `paid_by` and `paid_to`
 * columns because both reference the same Users table. Without aliases,
 * Sequelize/Postgres would complain about ambiguous foreign keys.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Settlement = sequelize.define(
  'Settlement',
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

    // The user who is sending money
    paid_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },

    // The user who is receiving money
    paid_to: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },

    // How much is being transferred
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    // When was this settlement record created (i.e., when did they run settle-up)
    settled_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    underscored: true,
    timestamps: false,
  }
);

module.exports = Settlement;

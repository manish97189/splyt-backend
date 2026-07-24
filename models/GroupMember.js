/**
 * models/GroupMember.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Join table that links Users ↔ Groups.
 *
 * A User can belong to many Groups, and a Group can have many Users — this is
 * a classic many-to-many relationship. We model it with an explicit join table
 * (GroupMember) rather than Sequelize's implicit through-table so that we can:
 *   1. Store extra data on the relationship (joined_at timestamp).
 *   2. Query members directly (e.g. "who is in group X?").
 *
 * Unique constraint on (group_id, user_id) prevents duplicate memberships.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GroupMember = sequelize.define(
  'GroupMember',
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

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },

    // When did this user join the group? Defaults to now.
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    underscored: true,
    timestamps: false, // we manage joined_at manually; no need for createdAt/updatedAt

    // Composite unique constraint: one membership record per (group, user) pair
    indexes: [
      {
        unique: true,
        fields: ['group_id', 'user_id'],
      },
    ],
  }
);

module.exports = GroupMember;

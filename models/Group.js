/**
 * models/Group.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Defines the Group table — a named collection of users who share
 * expenses together (e.g., "Goa Trip", "Apartment 4B").
 *
 * The `created_by` column is a FOREIGN KEY that references the User table.
 * A foreign key enforces referential integrity at the database level: you
 * cannot insert a Group with a `created_by` that doesn't exist in Users.
 *
 * The actual Sequelize `.belongsTo()` / `.hasMany()` association calls live in
 * models/index.js (not here) to avoid circular-require issues.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Group = sequelize.define(
  'Group',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Human-readable group name, e.g. "Weekend Hike"
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // FK to User.id — which user created this group.
    // The association (Group.belongsTo(User)) in index.js wires this column
    // to the actual User row so we can do group.getCreator() etc.
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',  // must match the actual table name Sequelize creates (underscored: true → lowercase)
        key: 'id',
      },
    },
  },
  {
    underscored: true, // created_at / updated_at instead of camelCase
  }
);

module.exports = Group;

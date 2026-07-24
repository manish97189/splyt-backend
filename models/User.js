/**
 * models/User.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Define the User table schema using Sequelize's Model class.
 *
 * In Sequelize, a "Model" is a class that represents a database table. Each
 * property in the model definition maps to a column. Sequelize uses this
 * definition to:
 *   1. Create the table with `sequelize.sync()`.
 *   2. Validate data before inserting/updating.
 *   3. Map query results back to JavaScript objects.
 *
 * WHY no `password` column? We store only the *hash* of the password (computed
 * with bcrypt). The plaintext password is never persisted — this way, even if
 * the database is leaked, user passwords are not directly exposed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define(
  'User',      // Model name — Sequelize pluralises this to "Users" for the table
  {
    // Auto-incrementing integer primary key. Sequelize adds this by default
    // but we declare it explicitly for clarity.
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Display name (not required to be unique — two people can share a name)
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Email acts as the login identifier; must be unique across all users.
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true, // Sequelize will reject obviously malformed addresses
      },
    },

    // bcrypt hash of the user's password. Never store plaintext.
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    // "timestamps: true" (the default) adds createdAt and updatedAt columns
    // automatically. We use underscored: true to name them created_at /
    // updated_at (snake_case) instead of camelCase — matches PostgreSQL style.
    underscored: true,
  }
);

module.exports = User;

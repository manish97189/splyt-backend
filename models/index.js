/**
 * models/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Central hub that imports every model and wires up ALL associations
 * (relationships) between them.
 *
 * WHY centralise associations here?
 * If we put User.hasMany(Group) inside User.js and Group.belongsTo(User)
 * inside Group.js, Node's require() cache can cause circular-import issues
 * (User imports Group which imports User...). Putting all associations in one
 * file — loaded after all models — avoids that entirely.
 *
 * ASSOCIATION VOCABULARY:
 *   belongsTo  → adds a FK on THIS model pointing to the target
 *   hasMany    → the OTHER model holds the FK pointing back to this one
 *   hasOne     → like hasMany but enforces a 1-to-1 relationship
 *
 * After wiring associations, we export every model so any file in the project
 * only needs one import: const { User, Group } = require('../models');
 * ─────────────────────────────────────────────────────────────────────────────
 */

const sequelize = require('../config/db');

// Import every model
const User        = require('./User');
const Group       = require('./Group');
const GroupMember = require('./GroupMember');
const Expense     = require('./Expense');
const ExpenseSplit= require('./ExpenseSplit');
const Settlement  = require('./Settlement');

// ─── User ↔ Group (creator relationship) ─────────────────────────────────────
// A User can create many Groups (one-to-many via created_by FK on Group).
User.hasMany(Group,  { foreignKey: 'created_by', as: 'createdGroups' });
Group.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ─── Group ↔ User (membership — many-to-many through GroupMember) ─────────────
// A Group has many members (via GroupMember join table)
Group.hasMany(GroupMember, { foreignKey: 'group_id', as: 'memberships' });
GroupMember.belongsTo(Group, { foreignKey: 'group_id' });

// A User belongs to many groups (via GroupMember join table)
User.hasMany(GroupMember,  { foreignKey: 'user_id' });
GroupMember.belongsTo(User, { foreignKey: 'user_id', as: 'member' });

// ─── Group ↔ Expense ──────────────────────────────────────────────────────────
// A Group contains many Expenses
Group.hasMany(Expense,   { foreignKey: 'group_id', as: 'expenses' });
Expense.belongsTo(Group, { foreignKey: 'group_id' });

// Which User paid for a given Expense (payer relationship)
User.hasMany(Expense,    { foreignKey: 'paid_by', as: 'paidExpenses' });
Expense.belongsTo(User,  { foreignKey: 'paid_by', as: 'payer' });

// ─── Expense ↔ ExpenseSplit ───────────────────────────────────────────────────
// An Expense is split into many ExpenseSplit rows (one per member)
Expense.hasMany(ExpenseSplit,     { foreignKey: 'expense_id', as: 'splits' });
ExpenseSplit.belongsTo(Expense,   { foreignKey: 'expense_id' });

// Each split belongs to a User (who owes that share)
User.hasMany(ExpenseSplit,        { foreignKey: 'user_id', as: 'expenseSplits' });
ExpenseSplit.belongsTo(User,      { foreignKey: 'user_id', as: 'debtor' });

// ─── Group ↔ Settlement ───────────────────────────────────────────────────────
// A Group can have many Settlement records
Group.hasMany(Settlement,      { foreignKey: 'group_id', as: 'settlements' });
Settlement.belongsTo(Group,    { foreignKey: 'group_id' });

// Settlement has two FK relationships to User: payer and payee.
// We use different aliases ('settler' / 'settlee') to avoid ambiguity.
User.hasMany(Settlement,       { foreignKey: 'paid_by', as: 'madeSettlements' });
Settlement.belongsTo(User,     { foreignKey: 'paid_by', as: 'settler' });

User.hasMany(Settlement,       { foreignKey: 'paid_to', as: 'receivedSettlements' });
Settlement.belongsTo(User,     { foreignKey: 'paid_to', as: 'settlee' });

// ─── Export everything ────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseSplit,
  Settlement,
};

/**
 * controllers/groupController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Business logic for Group and GroupMember operations.
 *
 * Key patterns used here:
 *   - req.user.id — injected by the auth middleware. No additional DB query
 *     needed to know who made the request.
 *   - Sequelize includes — equivalent to SQL JOINs. When we fetch a Group we
 *     also include its members (and their User details) in one query.
 *   - Transaction safety — creating a group + adding the creator as a member
 *     should be atomic: either both succeed or neither does. We use a Sequelize
 *     transaction to guarantee this.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Group, GroupMember, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// ─── Create Group ─────────────────────────────────────────────────────────────
// POST /api/groups
// Body: { name }
const createGroup = async (req, res) => {
  const t = await sequelize.transaction(); // start a DB transaction
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      await t.rollback();
      return res.status(400).json({ error: 'Group name is required.' });
    }

    // Create the group row
    const group = await Group.create(
      { name: name.trim(), created_by: req.user.id },
      { transaction: t }
    );

    // Automatically add the creator as the first member
    await GroupMember.create(
      { group_id: group.id, user_id: req.user.id },
      { transaction: t }
    );

    await t.commit(); // persist both inserts together

    res.status(201).json(group);
  } catch (err) {
    await t.rollback(); // undo both inserts if anything failed
    console.error('createGroup error:', err);
    res.status(500).json({ error: 'Failed to create group.' });
  }
};

// ─── List Groups for current user ─────────────────────────────────────────────
// GET /api/groups
// Returns all groups where req.user is a member
const listGroups = async (req, res) => {
  try {
    // Find all GroupMember rows for this user, then include the associated Group
    const memberships = await GroupMember.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Group,
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email'], // don't expose password_hash
            },
          ],
        },
      ],
    });

    // Extract just the Group objects
    const groups = memberships.map((m) => m.Group);
    res.json(groups);
  } catch (err) {
    console.error('listGroups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
};

// ─── Get Group Detail ─────────────────────────────────────────────────────────
// GET /api/groups/:id
// Returns group info + full members list
const getGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
        },
        {
          // Include memberships and, for each membership, the User details
          model: GroupMember,
          as: 'memberships',
          include: [
            {
              model: User,
              as: 'member',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Verify the requesting user is actually a member of this group
    const isMember = group.memberships.some(
      (m) => m.user_id === req.user.id
    );
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
    }

    res.json(group);
  } catch (err) {
    console.error('getGroup error:', err);
    res.status(500).json({ error: 'Failed to fetch group.' });
  }
};

// ─── Add Member ───────────────────────────────────────────────────────────────
// POST /api/groups/:id/members
// Body: { email }  — add a user to the group by their email address
const addMember = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required.' });
    }

    // Find the group
    const group = await Group.findByPk(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Verify requester is a member (only members can add others)
    const requesterMembership = await GroupMember.findOne({
      where: { group_id: group.id, user_id: req.user.id },
    });
    if (!requesterMembership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Find the user to add
    const userToAdd = await User.findOne({ where: { email } });
    if (!userToAdd) {
      return res.status(404).json({ error: 'No user found with that email.' });
    }

    // Check for duplicate membership — GroupMember.create() would throw a
    // unique constraint error otherwise, so we check first for a nicer message.
    const alreadyMember = await GroupMember.findOne({
      where: { group_id: group.id, user_id: userToAdd.id },
    });
    if (alreadyMember) {
      return res.status(409).json({ error: 'User is already a member of this group.' });
    }

    const membership = await GroupMember.create({
      group_id: group.id,
      user_id: userToAdd.id,
    });

    res.status(201).json({
      message: `${userToAdd.name} added to the group.`,
      member: { id: userToAdd.id, name: userToAdd.name, email: userToAdd.email },
      membership,
    });
  } catch (err) {
    console.error('addMember error:', err);
    res.status(500).json({ error: 'Failed to add member.' });
  }
};

module.exports = { createGroup, listGroups, getGroup, addMember };

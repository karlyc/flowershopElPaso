// src/routes/staff.js — admin-only staff management
const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma } = require('../db/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toPublicStaff(staff) {
  const { pin, ...rest } = staff;
  return rest;
}

// GET /api/staff — everyone authenticated can see the roster (used by dropdowns)
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({ orderBy: { name: 'asc' } });
    res.json(staff.map(toPublicStaff));
  } catch (err) {
    next(err);
  }
});

// POST /api/staff/:id/verify-pin — { pin } — confirms a staff member's PIN without issuing
// a session, used to attribute "assisted by" on an order without switching who's logged in
router.post('/:id/verify-pin', requireAuth, async (req, res, next) => {
  try {
    const { pin } = req.body;
    const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!staff || !staff.active) return res.status(404).json({ error: 'Staff not found' });

    const valid = await bcrypt.compare(pin || '', staff.pin);
    res.json({ valid });
  } catch (err) {
    next(err);
  }
});

// POST /api/staff — { name, pin, role }
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, pin, role } = req.body;
    if (!name || !pin || !role) {
      return res.status(400).json({ error: 'name, pin, and role are required' });
    }
    const hashed = await bcrypt.hash(pin, 10);
    const staff = await prisma.staff.create({ data: { name, pin: hashed, role } });
    res.status(201).json(toPublicStaff(staff));
  } catch (err) {
    next(err);
  }
});

// PUT /api/staff/:id — edit name/role, optionally reset pin
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, role, pin } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (pin) data.pin = await bcrypt.hash(pin, 10);

    const staff = await prisma.staff.update({ where: { id: req.params.id }, data });
    res.json(toPublicStaff(staff));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/staff/:id/active — { active: boolean } — suspend/restore access
router.patch('/:id/active', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { active } = req.body;
    const staff = await prisma.staff.update({
      where: { id: req.params.id },
      data: { active: !!active },
    });
    res.json(toPublicStaff(staff));
  } catch (err) {
    next(err);
  }
});

module.exports = router;

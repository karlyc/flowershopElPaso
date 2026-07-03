// src/routes/auth.js — staff login via PIN
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toPublicStaff(staff) {
  const { pin, ...rest } = staff;
  return rest;
}

// GET /api/auth/staff — minimal active-staff roster for the login screen (id + name only, no auth)
router.get('/staff', async (_req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(staff);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — { staffId, pin }
router.post('/login', async (req, res, next) => {
  try {
    const { staffId, pin } = req.body;
    if (!staffId || !pin) {
      return res.status(400).json({ error: 'staffId and pin are required' });
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(pin, staff.pin);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ staffId: staff.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, staff: toPublicStaff(staff) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(toPublicStaff(req.staff));
});

// PUT /api/auth/pin — { currentPin, newPin }
router.put('/pin', requireAuth, async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) {
      return res.status(400).json({ error: 'currentPin and newPin are required' });
    }

    const valid = await bcrypt.compare(currentPin, req.staff.pin);
    if (!valid) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }

    const hashed = await bcrypt.hash(newPin, 10);
    await prisma.staff.update({ where: { id: req.staff.id }, data: { pin: hashed } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

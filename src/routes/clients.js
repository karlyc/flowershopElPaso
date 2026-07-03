// src/routes/clients.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/clients?search= — search by phone or name
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { phone: { contains: search } },
            { phone2: { contains: search } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const clients = await prisma.client.findMany({ where, orderBy: { firstName: 'asc' }, take: 50 });
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id — detail + order history
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { orders: { orderBy: { createdAt: 'desc' }, include: { items: true } } },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

// POST /api/clients
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { phone, phone2, firstName, secondName, lastName, email, company, notes, referral } = req.body;
    if (!phone || !firstName || !lastName) {
      return res.status(400).json({ error: 'phone, firstName, and lastName are required' });
    }

    const client = await prisma.client.create({
      data: { phone, phone2, firstName, secondName, lastName, email, company, notes, referral },
    });
    res.status(201).json(client);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A client with this phone already exists' });
    next(err);
  }
});

// PUT /api/clients/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { phone, phone2, firstName, secondName, lastName, email, company, notes, referral } = req.body;
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { phone, phone2, firstName, secondName, lastName, email, company, notes, referral },
    });
    res.json(client);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A client with this phone already exists' });
    next(err);
  }
});

module.exports = router;

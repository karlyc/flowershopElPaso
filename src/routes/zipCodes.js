// src/routes/zipCodes.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireOffice } = require('../middleware/auth');

const router = express.Router();

// GET /api/zip-codes?active=true
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active !== undefined) where.active = active === 'true';

    const zipCodes = await prisma.zipCode.findMany({
      where,
      orderBy: [{ type: 'asc' }, { zip: 'asc' }, { city: 'asc' }],
    });
    res.json(zipCodes);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { type, zip, city, state, price, active } = req.body;
    if (price === undefined) return res.status(400).json({ error: 'price is required' });
    if (type === 'CITY' && !city) return res.status(400).json({ error: 'city is required for a city zone' });
    if (type !== 'CITY' && !zip) return res.status(400).json({ error: 'zip is required for a zip code zone' });

    const zipCode = await prisma.zipCode.create({
      data: {
        type: type === 'CITY' ? 'CITY' : 'ZIP',
        zip: type === 'CITY' ? undefined : zip,
        city: type === 'CITY' ? city : undefined,
        state: type === 'CITY' ? state : undefined,
        price,
        active: active === undefined ? true : !!active,
      },
    });
    res.status(201).json(zipCode);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'This zip code already exists' });
    next(err);
  }
});

router.put('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { type, zip, city, state, price, active } = req.body;
    const data = { price };
    if (type !== undefined) {
      data.type = type === 'CITY' ? 'CITY' : 'ZIP';
      data.zip = data.type === 'CITY' ? null : zip;
      data.city = data.type === 'CITY' ? city : null;
      data.state = data.type === 'CITY' ? state : null;
    }
    if (active !== undefined) data.active = !!active;

    const zipCode = await prisma.zipCode.update({ where: { id: req.params.id }, data });
    res.json(zipCode);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'This zip code already exists' });
    next(err);
  }
});

router.delete('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    await prisma.zipCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

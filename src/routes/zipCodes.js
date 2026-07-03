// src/routes/zipCodes.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireOffice } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const zipCodes = await prisma.zipCode.findMany({ orderBy: { zip: 'asc' } });
    res.json(zipCodes);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { zip, price } = req.body;
    if (!zip || price === undefined) return res.status(400).json({ error: 'zip and price are required' });

    const zipCode = await prisma.zipCode.create({ data: { zip, price } });
    res.status(201).json(zipCode);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'This zip code already exists' });
    next(err);
  }
});

router.put('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { zip, price } = req.body;
    const zipCode = await prisma.zipCode.update({ where: { id: req.params.id }, data: { zip, price } });
    res.json(zipCode);
  } catch (err) {
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

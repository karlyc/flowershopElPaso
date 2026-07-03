// src/routes/expenditures.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireOffice } = require('../middleware/auth');

const router = express.Router();

// GET /api/expenditures?from=&to=
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(`${from}T00:00:00`);
      if (to) where.date.lte = new Date(`${to}T23:59:59.999`);
    }

    const expenditures = await prisma.expenditure.findMany({ where, orderBy: { date: 'desc' } });
    res.json(expenditures);
  } catch (err) {
    next(err);
  }
});

// POST /api/expenditures — { name, category, frequency, paymentType, description, amount, date }
router.post('/', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { name, category, frequency, paymentType, description, amount, date } = req.body;
    if (!name || amount === undefined) return res.status(400).json({ error: 'name and amount are required' });

    const expenditure = await prisma.expenditure.create({
      data: {
        name,
        category: category || 'OTHER',
        frequency: frequency || 'ONE_TIME',
        paymentType,
        description,
        amount,
        date: date ? new Date(date) : undefined,
      },
    });
    res.status(201).json(expenditure);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { name, category, frequency, paymentType, description, amount, date } = req.body;
    const data = { name, category, frequency, paymentType, description, amount };
    if (date !== undefined) data.date = new Date(date);

    const expenditure = await prisma.expenditure.update({ where: { id: req.params.id }, data });
    res.json(expenditure);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    await prisma.expenditure.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

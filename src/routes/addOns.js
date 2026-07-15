// src/routes/addOns.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireOffice } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const addOns = await prisma.addOn.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] });
    res.json(addOns);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const addOn = await prisma.addOn.findUnique({ where: { id: req.params.id } });
    if (!addOn) return res.status(404).json({ error: 'Add-on not found' });
    res.json(addOn);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { kind, name, size, price, visible } = req.body;
    if (!kind || !name || price === undefined) {
      return res.status(400).json({ error: 'kind, name, and price are required' });
    }

    const addOn = await prisma.addOn.create({
      data: { kind, name, size: size || undefined, price, visible: visible === undefined ? true : !!visible },
    });
    res.status(201).json(addOn);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { kind, name, size, price, visible } = req.body;
    const data = { kind, name, price };
    if (size !== undefined) data.size = size || null;
    if (visible !== undefined) data.visible = !!visible;

    const addOn = await prisma.addOn.update({ where: { id: req.params.id }, data });
    res.json(addOn);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    await prisma.addOn.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

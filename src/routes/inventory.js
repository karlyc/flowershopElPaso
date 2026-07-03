// src/routes/inventory.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadInventoryPhoto } = require('../middleware/upload');

const router = express.Router();

// GET /api/inventory?search=&category=
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const where = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireAdmin, uploadInventoryPhoto.single('photo'), async (req, res, next) => {
  try {
    const { code, name, category, widthIn, heightIn, unit, unitsPerPurchase, price, quantity, provider, notes } =
      req.body;
    if (!name || !price) return res.status(400).json({ error: 'name and price are required' });

    const item = await prisma.inventoryItem.create({
      data: {
        code: code || undefined,
        name,
        category: category || undefined,
        widthIn: widthIn || undefined,
        heightIn: heightIn || undefined,
        unit: unit || undefined,
        unitsPerPurchase: unitsPerPurchase || undefined,
        price,
        quantity: quantity || 0,
        provider,
        notes,
        photoUrl: req.file ? `/uploads/inventory/${req.file.filename}` : undefined,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireAdmin, uploadInventoryPhoto.single('photo'), async (req, res, next) => {
  try {
    const { code, name, category, widthIn, heightIn, unit, unitsPerPurchase, price, provider, notes } = req.body;
    const data = { code, name, category, unit, provider, notes };
    if (widthIn !== undefined) data.widthIn = widthIn || null;
    if (heightIn !== undefined) data.heightIn = heightIn || null;
    if (unitsPerPurchase !== undefined) data.unitsPerPurchase = unitsPerPurchase;
    if (price !== undefined) data.price = price;
    if (req.file) data.photoUrl = `/uploads/inventory/${req.file.filename}`;

    const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/inventory/:id/quantity — { quantity }
router.patch('/:id/quantity', requireAuth, async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) return res.status(400).json({ error: 'quantity is required' });

    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { quantity },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

// src/routes/categories.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireOffice } = require('../middleware/auth');
const { uploadProductPhoto } = require('../middleware/upload');

const router = express.Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { products: true },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireOffice, uploadProductPhoto.single('photo'), async (req, res, next) => {
  try {
    const { name, description, visible } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const category = await prisma.category.create({
      data: {
        name,
        description,
        visible: visible === undefined ? true : visible === 'true' || visible === true,
        photoUrl: req.file ? `/uploads/products/${req.file.filename}` : undefined,
      },
    });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireOffice, uploadProductPhoto.single('photo'), async (req, res, next) => {
  try {
    const { name, description, visible } = req.body;
    const data = { name, description };
    if (visible !== undefined) data.visible = visible === 'true' || visible === true;
    if (req.file) data.photoUrl = `/uploads/products/${req.file.filename}`;

    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

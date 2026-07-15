// src/routes/products.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireOffice } = require('../middleware/auth');
const { uploadProductPhoto } = require('../middleware/upload');

const router = express.Router();

const photoFields = [
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 },
  { name: 'photo3', maxCount: 1 },
];

// GET /api/products?search=&categoryId=
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, categoryId } = req.query;
    const where = {};
    if (categoryId) where.categories = { some: { id: categoryId } };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { recipe: { some: { inventoryItem: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: { categories: true },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { categories: true, recipe: { include: { inventoryItem: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireOffice, uploadProductPhoto.fields(photoFields), async (req, res, next) => {
  try {
    const { code, name, description, price, widthIn, heightIn, visible, categoryIds } = req.body;
    if (!code || !name || !price) {
      return res.status(400).json({ error: 'code, name, and price are required' });
    }
    const ids = categoryIds ? JSON.parse(categoryIds) : [];

    const files = req.files || {};
    const product = await prisma.product.create({
      data: {
        code,
        name,
        description,
        price,
        widthIn: widthIn || undefined,
        heightIn: heightIn || undefined,
        visible: visible === undefined ? true : visible === 'true' || visible === true,
        categories: { connect: ids.map((id) => ({ id })) },
        photo1Url: files.photo1?.[0] ? `/uploads/products/${files.photo1[0].filename}` : undefined,
        photo2Url: files.photo2?.[0] ? `/uploads/products/${files.photo2[0].filename}` : undefined,
        photo3Url: files.photo3?.[0] ? `/uploads/products/${files.photo3[0].filename}` : undefined,
      },
      include: { categories: true },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A product with this code already exists' });
    next(err);
  }
});

router.put('/:id', requireAuth, requireOffice, uploadProductPhoto.fields(photoFields), async (req, res, next) => {
  try {
    const { code, name, description, price, widthIn, heightIn, visible, categoryIds } = req.body;
    const files = req.files || {};

    const data = { code, name, description, price };
    if (categoryIds !== undefined) {
      data.categories = { set: JSON.parse(categoryIds).map((id) => ({ id })) };
    }
    if (widthIn !== undefined) data.widthIn = widthIn || null;
    if (heightIn !== undefined) data.heightIn = heightIn || null;
    if (visible !== undefined) data.visible = visible === 'true' || visible === true;
    if (files.photo1?.[0]) data.photo1Url = `/uploads/products/${files.photo1[0].filename}`;
    if (files.photo2?.[0]) data.photo2Url = `/uploads/products/${files.photo2[0].filename}`;
    if (files.photo3?.[0]) data.photo3Url = `/uploads/products/${files.photo3[0].filename}`;

    const product = await prisma.product.update({ where: { id: req.params.id }, data, include: { categories: true } });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A product with this code already exists' });
    next(err);
  }
});

router.delete('/:id', requireAuth, requireOffice, async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Recipe (product ↔ inventory items) ──

router.put('/:id/recipe', requireAuth, requireOffice, async (req, res, next) => {
  try {
    const { items } = req.body; // [{ inventoryItemId, quantity, notes }]
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });

    await prisma.$transaction([
      prisma.recipeItem.deleteMany({ where: { productId: req.params.id } }),
      prisma.recipeItem.createMany({
        data: items.map((i) => ({
          productId: req.params.id,
          inventoryItemId: i.inventoryItemId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      }),
    ]);

    const recipe = await prisma.recipeItem.findMany({
      where: { productId: req.params.id },
      include: { inventoryItem: true },
    });
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

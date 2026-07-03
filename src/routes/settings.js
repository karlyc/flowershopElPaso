// src/routes/settings.js — shop info & operational settings (singleton)
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadProductPhoto } = require('../middleware/upload');

const router = express.Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 'settings' },
      update: {},
      create: { id: 'settings' },
    });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, requireAdmin, uploadProductPhoto.single('logo'), async (req, res, next) => {
  try {
    const { name, address, website, phone, phone2, taxRate, hoursOfOperation } = req.body;
    const data = { name, address, website, phone, phone2 };
    if (taxRate !== undefined) data.taxRate = taxRate;
    if (hoursOfOperation !== undefined) {
      data.hoursOfOperation = typeof hoursOfOperation === 'string' ? JSON.parse(hoursOfOperation) : hoursOfOperation;
    }
    if (req.file) data.logoUrl = `/uploads/products/${req.file.filename}`;

    const settings = await prisma.settings.upsert({
      where: { id: 'settings' },
      update: data,
      create: { id: 'settings', ...data },
    });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

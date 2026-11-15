// src/routes/settings.js — shop info & operational settings (singleton)
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');

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

router.put('/', requireAuth, requireAdmin, uploadLogo.single('logo'), async (req, res, next) => {
  try {
    const { name, address, website, phone, phone2, taxRate, hoursOfOperation } = req.body;
    const data = { name, address, website, phone, phone2 };
    if (taxRate !== undefined) data.taxRate = taxRate;
    if (hoursOfOperation !== undefined) {
      data.hoursOfOperation = typeof hoursOfOperation === 'string' ? JSON.parse(hoursOfOperation) : hoursOfOperation;
    }
    // Stored in the DB (not on disk) so the logo persists across deploys.
    if (req.file) {
      data.logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.removeLogo === 'true') {
      data.logoUrl = null;
    }

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

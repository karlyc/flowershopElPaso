// src/routes/deliveries.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth } = require('../middleware/auth');
const { uploadDeliveryPhoto } = require('../middleware/upload');

const router = express.Router();

// Orders with a physical delivery pending (excludes pickup)
const pendingDeliveryWhere = {
  orderStatus: 'PENDING_DELIVERY',
  deliveryOption: { in: ['HOUSE', 'BUSINESS'] },
};

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: pendingDeliveryWhere,
      include: { client: true, items: { include: { product: true } } },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }],
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/deliveries/assigned/:staffId
router.get('/assigned/:staffId', requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { ...pendingDeliveryWhere, assignedDriverId: req.params.staffId },
      include: { client: true, items: { include: { product: true } } },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }],
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/deliveries/:orderId/assign — { staffId }
router.patch('/:orderId/assign', requireAuth, async (req, res, next) => {
  try {
    const { staffId } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: { assignedDriverId: staffId },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST /api/deliveries/:orderId/confirm — { receivedByName } + photo
router.post('/:orderId/confirm', requireAuth, uploadDeliveryPhoto.single('photo'), async (req, res, next) => {
  try {
    const { receivedByName } = req.body;
    if (!receivedByName) return res.status(400).json({ error: 'receivedByName is required' });

    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: {
        receivedByName,
        deliveryPhotoUrl: req.file ? `/uploads/deliveries/${req.file.filename}` : undefined,
        deliveredAt: new Date(),
        orderStatus: 'COMPLETED',
      },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

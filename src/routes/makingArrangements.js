// src/routes/makingArrangements.js — queue of orders that still need to be built
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/making-arrangements — sorted by nearest delivery date/time
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { orderStatus: 'MAKING_ARRANGEMENT' },
      include: {
        client: true,
        items: { include: { product: { include: { recipe: { include: { inventoryItem: true } } } } } },
        addOns: { include: { addOn: true } },
      },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }],
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/making-arrangements/:orderId/complete — moves order to pending delivery
router.patch('/:orderId/complete', requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: { orderStatus: 'PENDING_DELIVERY' },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

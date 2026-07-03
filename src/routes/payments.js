// src/routes/payments.js — admin payment confirmation workflow
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const PAYMENT_TYPE_ORDER = ['CASH', 'CARD', 'ZELLE', 'CASHAPP', 'CHECK'];

// GET /api/payments/submitted — awaiting admin confirmation
router.get('/submitted', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'SUBMITTED' },
      include: { client: true },
    });
    orders.sort((a, b) => PAYMENT_TYPE_ORDER.indexOf(a.paymentType) - PAYMENT_TYPE_ORDER.indexOf(b.paymentType));
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/payments/:orderId/confirm
router.patch('/:orderId/confirm', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: { paymentStatus: 'CONFIRMED', paymentConfirmedAt: new Date() },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/not-submitted — today's orders with no payment submitted yet
router.get('/not-submitted', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'PENDING', createdAt: { gte: start, lte: end } },
      include: { client: true },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/pending — no submitted payment for longer than a day
router.get('/pending', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);

    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'PENDING', createdAt: { lt: cutoff } },
      include: { client: true },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

const SNOOZE_DAYS = { next_day: 1, one_week: 7, two_weeks: 14, one_month: 30 };

// PATCH /api/payments/:orderId/reminder — { snooze: 'next_day'|'one_week'|'two_weeks'|'one_month' }
// Sets a follow-up date and surfaces a task on the dashboard for admin/office
router.patch('/:orderId/reminder', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { snooze } = req.body;
    const days = SNOOZE_DAYS[snooze];
    if (!days) return res.status(400).json({ error: 'snooze must be one of next_day, one_week, two_weeks, one_month' });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: { paymentReminderAt: dueDate },
    });

    await prisma.task.create({
      data: {
        description: `Order ${order.orderNumber}: payment photo has not been received`,
        dueDate,
        orderId: order.id,
      },
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

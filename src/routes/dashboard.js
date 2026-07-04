// src/routes/dashboard.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function dayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function deliveriesFor(date) {
  const { start, end } = dayRange(date);
  return prisma.order.findMany({
    where: {
      deliveryDate: { gte: start, lte: end },
      orderStatus: { in: ['MAKING_ARRANGEMENT', 'PENDING_DELIVERY'] },
    },
    include: { client: true, items: { include: { product: true } } },
    orderBy: { deliveryTime: 'asc' },
  });
}

router.get('/deliveries/today', requireAuth, async (_req, res, next) => {
  try {
    res.json(await deliveriesFor(new Date()));
  } catch (err) {
    next(err);
  }
});

router.get('/deliveries/tomorrow', requireAuth, async (_req, res, next) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    res.json(await deliveriesFor(tomorrow));
  } catch (err) {
    next(err);
  }
});

// Incomplete tasks: due today or with no due date set
router.get('/tasks', requireAuth, async (_req, res, next) => {
  try {
    const { end } = dayRange(new Date());
    const tasks = await prisma.task.findMany({
      where: { completed: false, OR: [{ dueDate: null }, { dueDate: { lte: end } }] },
      include: { assignedTo: true, order: true },
      orderBy: { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// Birthday/anniversary orders delivered ~1 year ago, 2 days before their anniversary
router.get('/reminders', requireAuth, async (_req, res, next) => {
  try {
    const target = new Date();
    target.setDate(target.getDate() + 2);
    target.setFullYear(target.getFullYear() - 1);
    const { start, end } = dayRange(target);

    const orders = await prisma.order.findMany({
      where: {
        occasion: { in: ['BIRTHDAY', 'ANNIVERSARY'] },
        orderStatus: 'COMPLETED',
        deliveryDate: { gte: start, lte: end },
      },
      include: { client: true, items: { include: { product: true } } },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Orders that haven't gone through the completed payment process
router.get('/pending-payments', requireAuth, async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { paymentStatus: { in: ['PENDING', 'SUBMITTED'] }, orderStatus: { not: 'CANCELLED' } },
      include: { client: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Convenience: everything the dashboard needs in one call
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const target = new Date();
    target.setDate(target.getDate() + 2);
    target.setFullYear(target.getFullYear() - 1);
    const { start: remStart, end: remEnd } = dayRange(target);
    const { start: todayStart, end: taskEnd } = dayRange(new Date());

    const [
      todayDeliveries,
      tomorrowDeliveries,
      tasks,
      reminders,
      pendingPayments,
      ordersToday,
      toArrangeCount,
      outForDeliveryCount,
    ] = await Promise.all([
      deliveriesFor(new Date()),
      deliveriesFor(tomorrow),
      prisma.task.findMany({
        where: { completed: false, OR: [{ dueDate: null }, { dueDate: { lte: taskEnd } }] },
        include: { assignedTo: true, order: true },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.order.findMany({
        where: {
          occasion: { in: ['BIRTHDAY', 'ANNIVERSARY'] },
          orderStatus: 'COMPLETED',
          deliveryDate: { gte: remStart, lte: remEnd },
        },
        include: { client: true, items: { include: { product: true } } },
      }),
      prisma.order.findMany({
        where: { paymentStatus: { in: ['PENDING', 'SUBMITTED'] }, orderStatus: { not: 'CANCELLED' } },
        include: { client: true },
        orderBy: { createdAt: 'asc' },
      }),
      // Orders placed today (by creation time), for the "Today's Sales" / "Orders Today" KPIs
      prisma.order.findMany({
        where: { createdAt: { gte: todayStart, lte: taskEnd }, orderStatus: { not: 'CANCELLED' } },
      }),
      prisma.order.count({ where: { orderStatus: 'MAKING_ARRANGEMENT' } }),
      prisma.order.count({ where: { orderStatus: 'PENDING_DELIVERY', deliveryOption: { in: ['HOUSE', 'BUSINESS'] } } }),
    ]);

    const salesToday = ordersToday.reduce((sum, o) => sum + Number(o.total), 0);

    res.json({
      todayDeliveries,
      tomorrowDeliveries,
      tasks,
      reminders,
      pendingPayments,
      orderCountToday: ordersToday.length,
      salesToday,
      toArrangeCount,
      outForDeliveryCount,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

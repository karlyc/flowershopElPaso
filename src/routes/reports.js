// src/routes/reports.js — admin-only sales & financial reports
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const PAID_STATUSES = ['SUBMITTED', 'CONFIRMED'];

// GET /api/reports/daily?date=YYYY-MM-DD (defaults to today)
router.get('/daily', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(`${req.query.date}T00:00:00`) : new Date();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, orderStatus: { not: 'CANCELLED' } },
    });

    const total = orders.reduce((sum, o) => sum + Number(o.total), 0);
    res.json({ date: start.toISOString().slice(0, 10), orderCount: orders.length, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/monthly?year=&month= (1-12)
router.get('/monthly', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const prevStart = new Date(year, month - 2, 1);
    const prevEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);

    const [orders, prevOrders, newClients, expenditures] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start, lte: end }, orderStatus: { not: 'CANCELLED' } },
        include: { items: { include: { product: true } } },
      }),
      prisma.order.count({ where: { createdAt: { gte: prevStart, lte: prevEnd }, orderStatus: { not: 'CANCELLED' } } }),
      prisma.client.count({ where: { clientSince: { gte: start, lte: end } } }),
      prisma.expenditure.findMany({ where: { date: { gte: start, lte: end } } }),
    ]);

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalTax = orders.reduce((sum, o) => sum + Number(o.tax), 0);

    const byMethod = {};
    for (const o of orders) {
      if (!o.paymentType) continue;
      const preTax = Number(o.total) - Number(o.tax);
      byMethod[o.paymentType] = (byMethod[o.paymentType] || 0) + preTax;
    }

    const productTotals = {};
    for (const o of orders) {
      for (const item of o.items) {
        const key = item.product?.name || item.customName || 'Custom item';
        productTotals[key] = (productTotals[key] || 0) + item.quantity;
      }
    }
    const topProducts = Object.entries(productTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, quantity]) => ({ name, quantity }));

    const totalExpenses = expenditures.reduce((sum, e) => sum + Number(e.amount), 0);

    // Revenue is pre-tax sales (tax collected isn't shop income). Without a distinct
    // operating-vs-non-operating expense split in the spec, both margins are computed
    // the same way for now — see README for how to refine this if that distinction is added.
    const revenue = totalSales - totalTax;
    const netProfit = revenue - totalExpenses;
    const netProfitMargin = revenue ? netProfit / revenue : 0;
    const operatingProfitMargin = revenue ? netProfit / revenue : 0;

    res.json({
      year,
      month,
      totalSales,
      totalTax,
      byPaymentMethod: byMethod,
      newClientCount: newClients,
      topProducts,
      orderCountThisMonth: orders.length,
      orderCountLastMonth: prevOrders,
      monthlyExpenses: totalExpenses,
      netProfitMargin,
      operatingProfitMargin,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/range?from=&to=
router.get('/range', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required (YYYY-MM-DD)' });

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, orderStatus: { not: 'CANCELLED' } },
    });

    const total = orders.reduce((sum, o) => sum + Number(o.total), 0);
    res.json({ from, to, orderCount: orders.length, total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

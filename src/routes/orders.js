// src/routes/orders.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth, requireOffice, requireAdmin } = require('../middleware/auth');
const { uploadPaymentProof } = require('../middleware/upload');
const { generateOrderNumber } = require('../utils/orderNumber');
const { tierForOrderCount } = require('../utils/clientTier');

const router = express.Router();

async function getTaxRate() {
  const settings = await prisma.settings.findUnique({ where: { id: 'settings' } });
  return settings ? Number(settings.taxRate) : 1.0825;
}

// GET /api/orders?search=&orderStatus=&paymentStatus=&date=
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, orderStatus, paymentStatus, date } = req.query;
    const where = {};
    if (orderStatus) where.orderStatus = orderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      where.deliveryDate = { gte: start, lte: end };
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
        { client: { phone: { contains: search } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: true,
        items: { include: { product: true } },
        addOns: { include: { addOn: true } },
        assistedBy: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        items: { include: { product: true } },
        addOns: { include: { addOn: true } },
        assistedBy: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id/receipt
router.get('/:id/receipt', requireAuth, async (req, res, next) => {
  try {
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
          client: true,
          items: { include: { product: true } },
          addOns: { include: { addOn: true } },
        },
      }),
      prisma.settings.findUnique({ where: { id: 'settings' } }),
    ]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order, shop: settings });
  } catch (err) {
    next(err);
  }
});

async function computeTotals({ items, addOns, deliveryFee, taxExempt }) {
  const itemsTotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * (i.quantity || 1), 0);
  const addOnsTotal = (addOns || []).reduce((sum, a) => sum + Number(a.unitPrice) * (a.quantity || 1), 0);
  const subtotal = itemsTotal + addOnsTotal;
  const fee = Number(deliveryFee) || 0;
  const taxRate = await getTaxRate();
  const tax = taxExempt ? 0 : Math.round((subtotal + fee) * (taxRate - 1) * 100) / 100;
  const total = Math.round((subtotal + fee + tax) * 100) / 100;
  return { subtotal, tax, total };
}

// POST /api/orders
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      clientId,
      deliveryDate,
      deliveryTimeType,
      deliveryTime,
      occasion,
      messageText,
      messageFrom,
      messageAnon,
      deliveryOption,
      recipientName,
      recipientPhone,
      address,
      zip,
      businessName,
      businessDept,
      deliveryNotes,
      pickupSelf,
      pickupPersonName,
      paymentType,
      deliveryFee,
      taxExempt,
      notifyVia,
      assistedById,
      items,
      addOns,
    } = req.body;

    if (!clientId || !deliveryDate || !deliveryTime || !deliveryOption || !Array.isArray(items) || !items.length) {
      return res
        .status(400)
        .json({ error: 'clientId, deliveryDate, deliveryTime, deliveryOption, and items are required' });
    }

    const { subtotal, tax, total } = await computeTotals({ items, addOns, deliveryFee, taxExempt });
    const orderNumber = await generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          clientId,
          deliveryDate: new Date(deliveryDate),
          deliveryTimeType,
          deliveryTime,
          occasion,
          messageText,
          messageFrom,
          messageAnon: !!messageAnon,
          deliveryOption,
          recipientName,
          recipientPhone,
          address,
          zip,
          businessName,
          businessDept,
          deliveryNotes,
          pickupSelf: !!pickupSelf,
          pickupPersonName,
          paymentType,
          deliveryFee: deliveryFee || 0,
          subtotal,
          taxExempt: !!taxExempt,
          tax,
          total,
          notifyVia,
          assistedById,
          items: {
            create: items.map((i) => ({
              productId: i.productId || undefined,
              customName: i.customName,
              quantity: i.quantity || 1,
              unitPrice: i.unitPrice,
              notes: i.notes,
            })),
          },
          addOns: {
            create: (addOns || []).map((a) => ({
              addOnId: a.addOnId,
              kind: a.kind,
              name: a.name,
              quantity: a.quantity || 1,
              unitPrice: a.unitPrice,
              bannerColor: a.bannerColor,
              bannerMessage: a.bannerMessage,
              balloonOccasion: a.balloonOccasion,
            })),
          },
        },
        include: { client: true, items: { include: { product: true } }, addOns: { include: { addOn: true } } },
      });

      const newCount = created.client.orderCount + 1;
      await tx.client.update({
        where: { id: clientId },
        data: { orderCount: newCount, tier: tierForOrderCount(newCount) },
      });

      return created;
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id — edit order details (while still in progress)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const {
      deliveryDate,
      deliveryTimeType,
      deliveryTime,
      occasion,
      messageText,
      messageFrom,
      messageAnon,
      deliveryOption,
      recipientName,
      recipientPhone,
      address,
      zip,
      businessName,
      businessDept,
      deliveryNotes,
      pickupSelf,
      pickupPersonName,
      paymentType,
      deliveryFee,
      taxExempt,
      notifyVia,
      assistedById,
      items,
      addOns,
    } = req.body;

    const data = {
      deliveryTimeType,
      deliveryTime,
      occasion,
      messageText,
      messageFrom,
      deliveryOption,
      recipientName,
      recipientPhone,
      address,
      zip,
      businessName,
      businessDept,
      deliveryNotes,
      pickupPersonName,
      paymentType,
      notifyVia,
      assistedById,
    };
    if (deliveryDate !== undefined) data.deliveryDate = new Date(deliveryDate);
    if (messageAnon !== undefined) data.messageAnon = !!messageAnon;
    if (pickupSelf !== undefined) data.pickupSelf = !!pickupSelf;

    if (Array.isArray(items) || Array.isArray(addOns)) {
      const currentItems = Array.isArray(items)
        ? items
        : await prisma.orderItem.findMany({ where: { orderId: req.params.id } });
      const currentAddOns = Array.isArray(addOns)
        ? addOns
        : await prisma.orderAddOn.findMany({ where: { orderId: req.params.id } });

      const { subtotal, tax, total } = await computeTotals({
        items: currentItems,
        addOns: currentAddOns,
        deliveryFee: deliveryFee ?? existing.deliveryFee,
        taxExempt: taxExempt ?? existing.taxExempt,
      });
      data.subtotal = subtotal;
      data.tax = tax;
      data.total = total;
      if (deliveryFee !== undefined) data.deliveryFee = deliveryFee;
      if (taxExempt !== undefined) data.taxExempt = !!taxExempt;

      if (Array.isArray(items)) {
        await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
        data.items = {
          create: items.map((i) => ({
            productId: i.productId || undefined,
            customName: i.customName,
            quantity: i.quantity || 1,
            unitPrice: i.unitPrice,
            notes: i.notes,
          })),
        };
      }
      if (Array.isArray(addOns)) {
        await prisma.orderAddOn.deleteMany({ where: { orderId: req.params.id } });
        data.addOns = {
          create: addOns.map((a) => ({
            addOnId: a.addOnId,
            kind: a.kind,
            name: a.name,
            quantity: a.quantity || 1,
            unitPrice: a.unitPrice,
            bannerColor: a.bannerColor,
            bannerMessage: a.bannerMessage,
            balloonOccasion: a.balloonOccasion,
          })),
        };
      }
    } else if (deliveryFee !== undefined || taxExempt !== undefined) {
      const [currentItems, currentAddOns] = await Promise.all([
        prisma.orderItem.findMany({ where: { orderId: req.params.id } }),
        prisma.orderAddOn.findMany({ where: { orderId: req.params.id } }),
      ]);
      const { subtotal, tax, total } = await computeTotals({
        items: currentItems,
        addOns: currentAddOns,
        deliveryFee: deliveryFee ?? existing.deliveryFee,
        taxExempt: taxExempt ?? existing.taxExempt,
      });
      data.subtotal = subtotal;
      data.tax = tax;
      data.total = total;
      if (deliveryFee !== undefined) data.deliveryFee = deliveryFee;
      if (taxExempt !== undefined) data.taxExempt = !!taxExempt;
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data,
      include: { client: true, items: { include: { product: true } }, addOns: { include: { addOn: true } } },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status — { orderStatus }
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    if (!orderStatus) return res.status(400).json({ error: 'orderStatus is required' });

    const order = await prisma.order.update({ where: { id: req.params.id }, data: { orderStatus } });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/submit-payment — proof photo (+ cash bill breakdown)
router.post('/:id/submit-payment', requireAuth, uploadPaymentProof.single('proof'), async (req, res, next) => {
  try {
    const { cashBillBreakdown } = req.body;
    const data = { paymentStatus: 'SUBMITTED' };
    if (req.file) data.paymentProofUrl = `/uploads/payments/${req.file.filename}`;
    if (cashBillBreakdown) {
      data.cashBillBreakdown = typeof cashBillBreakdown === 'string' ? JSON.parse(cashBillBreakdown) : cashBillBreakdown;
    }

    const order = await prisma.order.update({ where: { id: req.params.id }, data });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orders/:id — cancel (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { orderStatus: 'CANCELLED' },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

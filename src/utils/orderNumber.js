// src/utils/orderNumber.js
const { prisma } = require('../db/prisma');

// Sequential, day-scoped order numbers, e.g. 20260703-0007
async function generateOrderNumber() {
  const today = new Date();
  const prefix = today.toISOString().slice(0, 10).replace(/-/g, '');

  const count = await prisma.order.count({
    where: { orderNumber: { startsWith: prefix } },
  });

  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

module.exports = { generateOrderNumber };

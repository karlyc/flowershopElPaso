// src/utils/orderNumber.js
const { prisma } = require('../db/prisma');

const PREFIX = 'KE';
const START = 100;

// Sequential order numbers, e.g. KE-100, KE-101, KE-102…
async function generateOrderNumber() {
  const count = await prisma.order.count();
  return `${PREFIX}-${START + count}`;
}

module.exports = { generateOrderNumber };

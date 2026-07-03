// src/utils/clientTier.js — system-only tier, derived from completed order count
function tierForOrderCount(orderCount) {
  if (orderCount >= 30) return 'DIAMOND';
  if (orderCount >= 20) return 'GOLD';
  if (orderCount >= 10) return 'SILVER';
  return 'REGULAR';
}

module.exports = { tierForOrderCount };

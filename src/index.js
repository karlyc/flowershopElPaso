// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { prisma } = require('./db/prisma');
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const clientRoutes = require('./routes/clients');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const zipCodeRoutes = require('./routes/zipCodes');
const orderRoutes = require('./routes/orders');
const taskRoutes = require('./routes/tasks');
const deliveryRoutes = require('./routes/deliveries');
const makingArrangementsRoutes = require('./routes/makingArrangements');
const dashboardRoutes = require('./routes/dashboard');
const paymentsRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');
const expenditureRoutes = require('./routes/expenditures');
const settingsRoutes = require('./routes/settings');

const app = express();

// Ensure upload directories exist
['products', 'inventory', 'payments', 'deliveries'].forEach((dir) => {
  const full = path.join(__dirname, '..', 'uploads', dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// ── CORS — supports multiple origins via comma-separated CORS_ORIGIN env var ──
const rawOrigin = process.env.CORS_ORIGIN || '*';
const allowedOrigins = rawOrigin === '*' ? '*' : rawOrigin.split(',').map((o) => o.trim());

function corsOriginFn(origin, callback) {
  if (!origin) return callback(null, true); // mobile apps, curl, Postman
  if (allowedOrigins === '*') return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error(`CORS blocked: ${origin}`));
}

const corsOptions = {
  origin: corsOriginFn,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/zip-codes', zipCodeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/making-arrangements', makingArrangementsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/expenditures', expenditureRoutes);
app.use('/api/settings', settingsRoutes);

// ── Health check ──
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ── 404 handler ──
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌹 Karel's Flowers backend running on port ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

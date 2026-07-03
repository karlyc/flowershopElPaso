// src/routes/tasks.js
const express = require('express');
const { prisma } = require('../db/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks?completed=true|false
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { completed } = req.query;
    const where = {};
    if (completed !== undefined) where.completed = completed === 'true';

    const tasks = await prisma.task.findMany({
      where,
      include: { assignedTo: true, order: true },
      orderBy: completed === 'true' ? { completedAt: 'desc' } : { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks — { description, frequency, dueDate, assignedToId, orderId? }
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { description, frequency, dueDate, assignedToId, orderId } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    const task = await prisma.task.create({
      data: {
        description,
        frequency: frequency || 'ONE_TIME',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedToId,
        orderId,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { description, frequency, dueDate, assignedToId } = req.body;
    const data = { description, frequency, assignedToId };
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.task.update({ where: { id: req.params.id }, data });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { completed: true, completedAt: new Date() },
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

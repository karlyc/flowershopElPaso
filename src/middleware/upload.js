// src/middleware/upload.js — local-disk photo uploads (products, inventory, payments, deliveries)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

function makeUploader(subdir) {
  const dest = path.join(__dirname, '../../uploads', subdir);
  fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image uploads are allowed'));
      }
      cb(null, true);
    },
  });
}

module.exports = {
  uploadProductPhoto: makeUploader('products'),
  uploadInventoryPhoto: makeUploader('inventory'),
  uploadPaymentProof: makeUploader('payments'),
  uploadDeliveryPhoto: makeUploader('deliveries'),
};

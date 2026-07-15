// prisma/importZipCodes.js — one-off import of delivery zones from a CSV export
// Usage: node prisma/importZipCodes.js /path/to/zipcodesCSV.csv
//
// Expected columns (header row can be anywhere in the first few lines):
// FEE ID,TYPE,VALUE,CITY,STATE,ZIPCODE,STATUS,DELIVERY FEE
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Minimal CSV line parser that respects double-quoted fields (handles embedded commas).
function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields.map((f) => f.trim());
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node prisma/importZipCodes.js /path/to/zipcodesCSV.csv');
    process.exit(1);
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const headerIdx = lines.findIndex((l) => l.startsWith('FEE ID,'));
  if (headerIdx === -1) throw new Error('Could not find header row starting with "FEE ID,"');

  const header = parseCsvLine(lines[headerIdx]);
  const col = (name) => header.indexOf(name);
  const idxType = col('TYPE');
  const idxCity = col('CITY');
  const idxState = col('STATE');
  const idxZip = col('ZIPCODE');
  const idxStatus = col('STATUS');
  const idxFee = col('DELIVERY FEE');

  const rows = lines.slice(headerIdx + 1).map(parseCsvLine);

  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const rawType = row[idxType];
    const isCity = rawType === 'City';
    const zip = (row[idxZip] || '').trim();
    const city = (row[idxCity] || '').replace(/^NULL$/i, '').trim();
    const state = (row[idxState] || '').replace(/^NULL$/i, '').trim();
    const price = Number(row[idxFee]);
    const active = (row[idxStatus] || '').toUpperCase() === 'ON';

    if (Number.isNaN(price)) {
      console.warn('Skipping row with invalid price:', row);
      skipped++;
      continue;
    }

    const data = {
      type: isCity ? 'CITY' : 'ZIP',
      zip: isCity ? null : zip || null,
      city: isCity ? city : null,
      state: isCity ? state : null,
      price,
      active,
    };

    try {
      await prisma.zipCode.create({ data });
      created++;
    } catch (err) {
      if (err.code === 'P2002') {
        console.warn(`Skipping duplicate zone: ${isCity ? city : zip}`);
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`Imported ${created} delivery zones (${skipped} skipped).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

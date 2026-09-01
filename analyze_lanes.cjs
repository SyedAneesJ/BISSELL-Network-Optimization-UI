const fs = require('fs');
const content = fs.readFileSync('Lane_Level_Spend (1).csv', 'utf8');

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/);
  const rows = [];
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    if (!line) continue;
    if (line.indexOf('"') === -1) {
      rows.push(line.split(','));
      continue;
    }
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);
    rows.push(cells);
  }
  return rows;
}

const rows = parseCsv(content);
const headers = rows[0].map(h => h.trim());
const objects = rows.slice(1).map(cells => {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = (cells[idx] || '').trim();
  });
  return obj;
});

console.log('Total data rows:', objects.length);

const defaultWh = {};
const costingWh = {};
const uniqueZips = new Set();
objects.forEach(r => {
  const def = r['Default Warehouse'] || 'EMPTY';
  const cost = r['Costing Warehouse'] || 'EMPTY';
  const zip = r['Destination_3Zip'] || 'EMPTY';
  defaultWh[def] = (defaultWh[def] || 0) + 1;
  costingWh[cost] = (costingWh[cost] || 0) + 1;
  uniqueZips.add(zip);
});
console.log('Default Warehouse distribution:', defaultWh);
console.log('Costing Warehouse distribution:', costingWh);
console.log('Unique 3Zips:', uniqueZips.size);

const defaultRows = objects.filter(r => r['Default Warehouse'] && r['Costing Warehouse'] && r['Default Warehouse'].toLowerCase() === r['Costing Warehouse'].toLowerCase());
console.log('Default rows count (Default == Costing):', defaultRows.length);

const spaceByDefWh = {};
const costByDefWh = {};
let totalBaselineSpace = 0;
let totalBaselineCost = 0;

defaultRows.forEach(r => {
  const wh = r['Default Warehouse'];
  const space = parseFloat(r['Lane_Space']) || 0;
  const cost = parseFloat(r['3zip_scenario cost']) || 0;
  spaceByDefWh[wh] = (spaceByDefWh[wh] || 0) + space;
  costByDefWh[wh] = (costByDefWh[wh] || 0) + cost;
  totalBaselineSpace += space;
  totalBaselineCost += cost;
});

console.log('Baseline Lane_Space by Warehouse:', spaceByDefWh);
console.log('Total Baseline Lane_Space:', totalBaselineSpace);
console.log('Baseline 3zip_scenario cost by Warehouse:', costByDefWh);
console.log('Total Baseline Cost (3zip_scenario cost):', totalBaselineCost);

const zipGroups = {};
objects.forEach(r => {
  const zip = r['Destination_3Zip'];
  const terms = r['freight_terms'];
  const key = zip + '|' + terms;
  if (!zipGroups[key]) zipGroups[key] = [];
  zipGroups[key].push(r);
});

console.log('Total unique (3Zip, terms) groups:', Object.keys(zipGroups).length);

let sumUniqueLaneSpace = 0;
let sumUniqueDefaultCost = 0;
let sumCheapestCost = 0;
const cheapestDcCounts = {};
const cheapestDcCostSums = {};
const cheapestDcSpaceSums = {};

Object.entries(zipGroups).forEach(([key, groupRows]) => {
  const firstRow = groupRows[0];
  const space = parseFloat(firstRow['Lane_Space']) || 0;
  sumUniqueLaneSpace += space;

  const defRow = groupRows.find(r => r['Default Warehouse'] && r['Costing Warehouse'] && r['Default Warehouse'].toLowerCase() === r['Costing Warehouse'].toLowerCase()) || firstRow;
  sumUniqueDefaultCost += parseFloat(defRow['3zip_scenario cost']) || 0;

  const sorted = [...groupRows].filter(r => parseFloat(r['3zip_scenario cost']) > 0).sort((a, b) => parseFloat(a['3zip_scenario cost']) - parseFloat(b['3zip_scenario cost']));
  if (sorted.length > 0) {
    const cheap = sorted[0];
    const cCost = parseFloat(cheap['3zip_scenario cost']);
    sumCheapestCost += cCost;
    const cDc = cheap['Costing Warehouse'] || 'UNKNOWN';
    cheapestDcCounts[cDc] = (cheapestDcCounts[cDc] || 0) + 1;
    cheapestDcCostSums[cDc] = (cheapestDcCostSums[cDc] || 0) + cCost;
    cheapestDcSpaceSums[cDc] = (cheapestDcSpaceSums[cDc] || 0) + space;
  }
});

console.log('--- Summary of Unique Groups ---');
console.log('Total Unique Groups Lane_Space Sum:', sumUniqueLaneSpace);
console.log('Total Unique Groups Default Cost Sum:', sumUniqueDefaultCost);
console.log('Total Unique Groups Pure Cheapest Cost Sum:', sumCheapestCost);
console.log('Pure Cheapest DC selection counts:', cheapestDcCounts);
console.log('Pure Cheapest DC cost sums:', cheapestDcCostSums);
console.log('Pure Cheapest DC space sums (if unconstrained):', cheapestDcSpaceSums);

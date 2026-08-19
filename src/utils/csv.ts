export const parseCsv = (csvText: string): string[][] => {
  if (!csvText) return [];
  const lines = csvText.split(/\r?\n/);
  const rows: string[][] = [];

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    if (!line) continue;

    if (!line.includes('"')) {
      rows.push(line.split(','));
      continue;
    }

    const cells: string[] = [];
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
};

export const csvToObjects = (csvText: string): Array<Record<string, string>> => {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] ?? '').trim();
    });
    return obj;
  });
};

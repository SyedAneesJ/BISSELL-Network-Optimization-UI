export const downloadBlob = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const escapeCSV = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const toCSV = (rows: Array<Record<string, unknown>>): string => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCSV(row[h])).join(',')),
  ];
  return lines.join('\n');
};

export const openPrintableReport = (title: string, bodyHtml: string) => {
  const reportWindow = window.open('', '_blank', 'width=900,height=700');
  if (!reportWindow) return;
  reportWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
          h1 { font-size: 20px; margin-bottom: 12px; }
          h2 { font-size: 16px; margin-top: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f8fafc; }
          .muted { color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
};

const escapePdfText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

export const createSimplePdf = (lines: string[], title = 'Report'): string => {
  const fontSize = 12;
  const lineHeight = 16;
  const startX = 50;
  const startY = 770;

  const contentLines = [
    `BT`,
    `/F1 ${fontSize} Tf`,
    `${startX} ${startY} Td`,
    ...lines.map((line, idx) => {
      const text = escapePdfText(line);
      return `${idx === 0 ? '' : `0 -${lineHeight} Td`}\n(${text}) Tj`;
    }),
    `ET`,
  ].join('\n');

  const objects: string[] = [];
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
  objects.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`);
  objects.push(`4 0 obj\n<< /Length ${contentLines.length} >>\nstream\n${contentLines}\nendstream\nendobj`);
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  const xrefOffsets: number[] = [];
  let pdf = `%PDF-1.4\n`;
  objects.forEach((obj) => {
    xrefOffsets.push(pdf.length);
    pdf += `${obj}\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  xrefOffsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${escapePdfText(title)}) >> >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
};

type PdfText = { x: number; y: number; size: number; text: string; color?: [number, number, number]; font?: string };

const escapePdf = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const rgb = (color?: [number, number, number]) => (color ? `${color[0]} ${color[1]} ${color[2]}` : '0 0 0');

const wrapText = (text: string, maxChars: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
};

export const createDataHealthPdf = (
  snapshot: {
    SnapshotTime: string;
    ForecastFreshness: string;
    RatesCoveragePct: number;
    MissingRatesLaneCount: number;
    CapacityFreshness: string;
    MissingCapacityDCCount: number;
    BCVDimsAvailability: string;
    Notes: string;
  },
  lanes: Array<{
    Dest3Zip: string;
    DestState: string;
    Channel: string;
    Terms: string;
    CustomerGroup: string;
    AssignedDC: string;
    SLABreachFlag: string;
  }>
): string => {
  const pageW = 612;
  const pageH = 792;
  const margin = 28;

  const yTop = (t: number) => pageH - t;

  const statusScore = (status: string) =>
    status === 'OK' ? 100 : status === 'Warn' ? 80 : 60;

  const bcvScore =
    snapshot.BCVDimsAvailability === 'OK'
      ? 100
      : snapshot.BCVDimsAvailability === 'Assumed'
        ? 80
        : 60;

  const qualityScore = Math.round(
    (snapshot.RatesCoveragePct + statusScore(snapshot.ForecastFreshness) + statusScore(snapshot.CapacityFreshness) + bcvScore) /
      4
  );

  const statusColor = (status: string): [number, number, number] =>
    status === 'OK' ? [0.13, 0.55, 0.32] : status === 'Warn' ? [0.8, 0.55, 0.1] : [0.74, 0.17, 0.2];

  const pages: string[][] = [];

  const createPage = () => {
    const content: string[] = [];
    const rect = (x: number, y: number, w: number, h: number, fill: [number, number, number]) => {
      content.push(`q ${fill[0]} ${fill[1]} ${fill[2]} rg ${x} ${y} ${w} ${h} re f Q`);
    };
    const strokeRect = (x: number, y: number, w: number, h: number, stroke: [number, number, number]) => {
      content.push(`q ${stroke[0]} ${stroke[1]} ${stroke[2]} RG ${x} ${y} ${w} ${h} re S Q`);
    };
    const text = ({ x, y, size, text: t, color }: PdfText) => {
      content.push(`BT /F1 ${size} Tf ${rgb(color)} rg 1 0 0 1 ${x} ${y} Tm (${escapePdf(t)}) Tj ET`);
    };
    return { content, rect, strokeRect, text };
  };

  const page1 = createPage();

  // Header band
  page1.rect(0, yTop(78), pageW, 78, [0.05, 0.08, 0.14]);
  page1.text({ x: margin, y: yTop(34), size: 18, text: 'Data Health Report', color: [1, 1, 1] });
  page1.text({
    x: margin,
    y: yTop(54),
    size: 10,
    text: `Generated: ${new Date().toLocaleString()}  |  Snapshot: ${new Date(snapshot.SnapshotTime).toLocaleString()}`,
    color: [0.85, 0.9, 1],
  });

  // Summary panel
  const summaryTop = 96;
  page1.rect(margin, yTop(summaryTop + 58) - 58, pageW - margin * 2, 58, [0.96, 0.97, 0.99]);
  page1.strokeRect(margin, yTop(summaryTop + 58) - 58, pageW - margin * 2, 58, [0.84, 0.88, 0.93]);
  page1.text({ x: margin + 12, y: yTop(summaryTop + 20), size: 10, text: 'Data Quality Score', color: [0.25, 0.3, 0.35] });
  page1.text({ x: margin + 12, y: yTop(summaryTop + 42), size: 20, text: `${qualityScore}`, color: [0.06, 0.09, 0.16] });
  page1.text({ x: margin + 120, y: yTop(summaryTop + 20), size: 10, text: 'Coverage Target', color: [0.25, 0.3, 0.35] });
  page1.text({ x: margin + 120, y: yTop(summaryTop + 42), size: 12, text: '>= 95% (Preferred)', color: [0.06, 0.09, 0.16] });

  // Coverage bar
  const barX = margin + 320;
  const barY = yTop(summaryTop + 40);
  const barW = 220;
  const barH = 10;
  page1.rect(barX, barY, barW, barH, [0.9, 0.93, 0.96]);
  const barFill = Math.max(0, Math.min(100, snapshot.RatesCoveragePct));
  page1.rect(barX, barY, (barW * barFill) / 100, barH, barFill >= 95 ? [0.13, 0.55, 0.32] : barFill >= 85 ? [0.8, 0.55, 0.1] : [0.74, 0.17, 0.2]);
  page1.strokeRect(barX, barY, barW, barH, [0.75, 0.8, 0.86]);
  page1.text({ x: barX, y: barY + 14, size: 9, text: `Rates Coverage: ${snapshot.RatesCoveragePct}%`, color: [0.25, 0.3, 0.35] });

  // KPI cards
  const cardTop = summaryTop + 80;
  const gap = 10;
  const cols = 3;
  const cardW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = 60;
  const cards = [
    { label: 'Forecast Freshness', value: snapshot.ForecastFreshness },
    { label: 'Capacity Freshness', value: snapshot.CapacityFreshness },
    { label: 'BCV Dimensions', value: snapshot.BCVDimsAvailability },
    { label: 'Missing Rates (Lanes)', value: `${snapshot.MissingRatesLaneCount}` },
    { label: 'Missing Capacity (DCs)', value: `${snapshot.MissingCapacityDCCount}` },
    { label: 'Rates Coverage', value: `${snapshot.RatesCoveragePct}%` },
  ];

  cards.forEach((card, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = margin + col * (cardW + gap);
    const y = yTop(cardTop + row * (cardH + gap)) - cardH;
    page1.rect(x, y, cardW, cardH, [0.98, 0.985, 0.995]);
    page1.strokeRect(x, y, cardW, cardH, [0.86, 0.89, 0.93]);
    page1.text({ x: x + 10, y: y + cardH - 18, size: 9, text: card.label, color: [0.4, 0.45, 0.5] });
    const isStatus = ['Forecast Freshness', 'Capacity Freshness'].includes(card.label);
    const status = isStatus ? card.value : '';
    if (isStatus) {
      page1.rect(x + 10, y + 10, 8, 8, statusColor(status));
      page1.text({ x: x + 24, y: y + 10, size: 12, text: card.value, color: [0.06, 0.09, 0.16] });
    } else {
      page1.text({ x: x + 10, y: y + 10, size: 12, text: card.value, color: [0.06, 0.09, 0.16] });
    }
  });

  // Notes and issues
  const notesTop = cardTop + 2 * (cardH + gap) + 20;
  page1.text({ x: margin, y: yTop(notesTop), size: 12, text: 'Notes & Observations', color: [0.06, 0.09, 0.16] });
  const noteLines = wrapText(snapshot.Notes || 'No notes provided.', 92);
  noteLines.slice(0, 4).forEach((line, idx) => {
    page1.text({ x: margin, y: yTop(notesTop + 16 + idx * 12), size: 9.5, text: line, color: [0.35, 0.4, 0.45] });
  });

  const issuesTop = notesTop + 72;
  page1.text({ x: margin, y: yTop(issuesTop), size: 12, text: 'Key Signals', color: [0.06, 0.09, 0.16] });
  const signals = [
    `Rates coverage at ${snapshot.RatesCoveragePct}% with ${snapshot.MissingRatesLaneCount} missing lanes`,
    `Capacity freshness is ${snapshot.CapacityFreshness} with ${snapshot.MissingCapacityDCCount} missing DCs`,
    `BCV dimensions marked as ${snapshot.BCVDimsAvailability}`,
  ];
  signals.forEach((line, idx) => {
    page1.text({ x: margin, y: yTop(issuesTop + 16 + idx * 12), size: 9.5, text: `- ${line}`, color: [0.35, 0.4, 0.45] });
  });

  // Table
  const tableTop = issuesTop + 70;
  page1.text({ x: margin, y: yTop(tableTop), size: 12, text: 'Missing / Flagged Lanes (Sample)', color: [0.06, 0.09, 0.16] });
  const tableY = yTop(tableTop + 16) - 16;
  const tableW = pageW - margin * 2;
  const rowH = 16;
  const headers = ['3-Zip', 'State', 'Channel', 'Terms', 'Customer', 'Assigned DC', 'SLA'];
  const colWs = [50, 40, 55, 50, 130, 95, 40];

  page1.rect(margin, tableY, tableW, rowH, [0.93, 0.95, 0.98]);
  page1.strokeRect(margin, tableY, tableW, rowH, [0.82, 0.86, 0.9]);
  let cx = margin + 6;
  headers.forEach((h, idx) => {
    page1.text({ x: cx, y: tableY + 5, size: 9, text: h, color: [0.25, 0.3, 0.35] });
    cx += colWs[idx];
  });

  const rowsPerPage = 12;
  const rows = lanes.slice(0, rowsPerPage);
  rows.forEach((lane, i) => {
    const y = tableY - rowH * (i + 1);
    if (i % 2 === 0) page1.rect(margin, y, tableW, rowH, [0.98, 0.99, 1]);
    page1.strokeRect(margin, y, tableW, rowH, [0.9, 0.92, 0.95]);
    let x = margin + 6;
    const cells = [
      lane.Dest3Zip,
      lane.DestState,
      lane.Channel,
      lane.Terms,
      lane.CustomerGroup,
      lane.AssignedDC,
      lane.SLABreachFlag,
    ];
    cells.forEach((cell, idx) => {
      page1.text({ x, y: y + 5, size: 8.5, text: cell || '-', color: [0.2, 0.25, 0.3] });
      x += colWs[idx];
    });
  });

  page1.text({
    x: margin,
    y: 18,
    size: 8.5,
    text: `Report generated for operational planning. Page 1`,
    color: [0.45, 0.5, 0.55],
  });

  pages.push(page1.content);

  if (lanes.length > rowsPerPage) {
    const page2 = createPage();
    page2.rect(0, yTop(78), pageW, 78, [0.05, 0.08, 0.14]);
    page2.text({ x: margin, y: yTop(34), size: 18, text: 'Data Health Report (cont.)', color: [1, 1, 1] });
    page2.text({
      x: margin,
      y: yTop(54),
      size: 10,
      text: `Generated: ${new Date().toLocaleString()}  |  Snapshot: ${new Date(snapshot.SnapshotTime).toLocaleString()}`,
      color: [0.85, 0.9, 1],
    });

    const tableTop2 = 110;
    page2.text({ x: margin, y: yTop(tableTop2), size: 12, text: 'Missing / Flagged Lanes (continued)', color: [0.06, 0.09, 0.16] });
    const tableY2 = yTop(tableTop2 + 16) - 16;
    page2.rect(margin, tableY2, tableW, rowH, [0.93, 0.95, 0.98]);
    page2.strokeRect(margin, tableY2, tableW, rowH, [0.82, 0.86, 0.9]);
    let cx2 = margin + 6;
    headers.forEach((h, idx) => {
      page2.text({ x: cx2, y: tableY2 + 5, size: 9, text: h, color: [0.25, 0.3, 0.35] });
      cx2 += colWs[idx];
    });

    const rows2 = lanes.slice(rowsPerPage, rowsPerPage * 2);
    rows2.forEach((lane, i) => {
      const y = tableY2 - rowH * (i + 1);
      if (i % 2 === 0) page2.rect(margin, y, tableW, rowH, [0.98, 0.99, 1]);
      page2.strokeRect(margin, y, tableW, rowH, [0.9, 0.92, 0.95]);
      let x = margin + 6;
      const cells = [
        lane.Dest3Zip,
        lane.DestState,
        lane.Channel,
        lane.Terms,
        lane.CustomerGroup,
        lane.AssignedDC,
        lane.SLABreachFlag,
      ];
      cells.forEach((cell, idx) => {
        page2.text({ x, y: y + 5, size: 8.5, text: cell || '-', color: [0.2, 0.25, 0.3] });
        x += colWs[idx];
      });
    });

    page2.text({
      x: margin,
      y: 18,
      size: 8.5,
      text: `Report generated for operational planning. Page 2`,
      color: [0.45, 0.5, 0.55],
    });

    pages.push(page2.content);
  }

  // Build PDF
  const objectsByNum: Array<{ num: number; body: string }> = [];
  objectsByNum.push({ num: 1, body: `<< /Type /Catalog /Pages 2 0 R >>` });

  const pageRefs: string[] = [];
  let objectIndex = 3;
  const fontObjNum = 3 + pages.length * 2;

  pages.forEach((pageContent) => {
    const pageObjNum = objectIndex++;
    const contentObjNum = objectIndex++;
    pageRefs.push(`${pageObjNum} 0 R`);
    objectsByNum.push({
      num: pageObjNum,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>`,
    });
    const contentStream = pageContent.join('\n');
    objectsByNum.push({
      num: contentObjNum,
      body: `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
    });
  });

  objectsByNum.push({ num: 2, body: `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>` });
  objectsByNum.push({ num: fontObjNum, body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>` });

  const objects = objectsByNum
    .sort((a, b) => a.num - b.num)
    .map((obj) => `${obj.num} 0 obj\n${obj.body}\nendobj`);

  const xrefOffsets: number[] = [];
  let pdf = `%PDF-1.4\n`;
  objects.forEach((obj) => {
    xrefOffsets.push(pdf.length);
    pdf += `${obj}\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  xrefOffsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${escapePdf('Data Health Report')}) >> >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
};

/**
 * NordInvest — Google Sheets Export
 * ─────────────────────────────────────────────────────────────────────
 * WHAT THIS DOES
 *   Creates a beautifully formatted Google Sheet from a NordInvest property
 *   analysis payload. Returns a shareable URL. The receiving user opens it
 *   in Google Sheets — professionally formatted, ready to send to a
 *   lender, advisor, or partner.
 *
 * DEPLOY (one time, ~30 seconds)
 *   1. Go to https://script.google.com/ → New project.
 *   2. Delete the placeholder code, paste this entire file.
 *   3. Save (⌘S). Name the project "NordInvest Sheets Export".
 *   4. Click "Deploy" → "New deployment".
 *   5. Type = "Web app".
 *   6. Execute as = "Me". Who has access = "Anyone".
 *   7. Click "Deploy" → authorize when prompted.
 *   8. Copy the Web app URL (ends in /exec).
 *   9. In index.html, replace SHEETS_EXPORT_ENDPOINT with that URL.
 *
 * SECURITY NOTE
 *   Sheets are created in the deployer's Google Drive with "Anyone with the
 *   link can view" permission. Users get a URL they can view (and can File →
 *   Make a Copy to edit in their own Drive). Volume: budget ~1 sheet per user
 *   per property; clean up in Drive periodically or wire a TTL if it grows.
 */

// ═══════════════════════════════════════════════════════════════════════
//  ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = createFormattedSheet(payload);
    return jsonResponse({ ok: true, url: sheet.url, id: sheet.id });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, message: 'NordInvest Sheets Export API. POST an analysis payload to create a sheet.' });
}

/**
 * TEST HELPER — Run this ONCE from the Apps Script editor after first deploy.
 * ─────────────────────────────────────────────────────────────────────
 * Google won't grant Drive + Sheets scopes until a function actually uses
 * them. The initial deploy dialog authorizes basic web app access only.
 * Running this manually forces the full scope grant so doPost works when
 * called from the website.
 *
 * HOW TO RUN:
 *   1. In Apps Script editor, click the function dropdown (top toolbar).
 *   2. Select "testCreate".
 *   3. Click ▶ Run.
 *   4. Approve any permission prompts (Drive access, Sheets access).
 *   5. Check the Execution log for the URL — a test sheet will exist in
 *      your Drive, safe to delete.
 *   6. Now the doPost call from nordinvest.io will work.
 */
function testCreate() {
  const result = createFormattedSheet({
    location: 'Test Copenhagen 2200',
    strategy: 'appreciation',
    price: 500000,
    rent: 1800,
    rate: 4.5,
    downPct: 20,
    downAmount: 100000,
    loanAmount: 400000,
    expenses: 300,
    rentalYield: 4.32,
    monthlyMortgage: 2027,
    monthlyCashFlow: -527,
    roi: -5.5,
    score: 42,
    marketAvgPrice: 8500,
    marketAvgRent: 210,
    marketSource: 'DST EJ55',
    appreciationRate: 5.0,
    oneLineVerdict: 'Test verdict — appreciation play works long-term.',
    biggestRisk: 'Rate sensitivity',
    classification: 'Appreciation Asset',
    lang: 'en'
  });
  Logger.log('Sheet created: ' + result.url);
  return result;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════
//  SHEET CREATION
// ═══════════════════════════════════════════════════════════════════════

const COL = {
  NAVY:      '#0F1F3D',
  NAVY_LT:   '#1a3360',
  BLUE:      '#2563EB',
  BLUE_PALE: '#EFF6FF',
  GREEN:     '#10B981',
  GREEN_PALE:'#ECFDF5',
  AMBER:     '#F59E0B',
  AMBER_PALE:'#FFFBEB',
  RED:       '#EF4444',
  RED_PALE:  '#FEF2F2',
  GREY_50:   '#F8F9FA',
  GREY_100:  '#F1F5F9',
  GREY_300:  '#E5E7EB',
  TEXT:      '#111827',
  MUTED:     '#6B7280',
  WHITE:     '#FFFFFF'
};

function createFormattedSheet(p) {
  const location = (p.location || 'Property').toString().slice(0, 80);
  const dateStr  = new Date().toISOString().slice(0, 10);
  const name = `NordInvest — ${location} — ${dateStr}`;

  const ss = SpreadsheetApp.create(name);
  const sheet = ss.getActiveSheet();
  sheet.setName('Analysis');

  // Column widths
  sheet.setColumnWidth(1, 260); // Metric
  sheet.setColumnWidth(2, 180); // Value
  sheet.setColumnWidth(3, 380); // Note
  // Hide/reduce extra columns for cleanliness
  sheet.setColumnWidth(4, 20);
  sheet.setColumnWidth(5, 20);

  let row = 1;

  // ─── TITLE ROW ─────────────────────────────────────────────
  row = writeTitle(sheet, row, 'NordInvest — Property Investment Analysis');
  row = writeSubtitle(sheet, row, `${location} · Generated ${dateStr}`);
  row = spacer(sheet, row);

  // ─── PROPERTY ──────────────────────────────────────────────
  row = writeSection(sheet, row, 'PROPERTY');
  row = writeRow(sheet, row, 'Location',        p.location || '',            '');
  row = writeRow(sheet, row, 'Purchase Price',  fmtMoney(p.price),           'Listing price');
  row = writeRow(sheet, row, 'Strategy',        strategyLabel(p.strategy),   'Investor intent');
  row = spacer(sheet, row);

  // ─── INPUTS ────────────────────────────────────────────────
  row = writeSection(sheet, row, 'INPUTS');
  row = writeRow(sheet, row, 'Monthly Rent',       fmtMoney(p.rent),                  '');
  row = writeRow(sheet, row, 'Down Payment',       p.downPct != null ? p.downPct + ' %' : '',  fmtMoney(p.downAmount) + ' cash');
  row = writeRow(sheet, row, 'Loan Amount',        fmtMoney(p.loanAmount),            'Price − Down Payment');
  row = writeRow(sheet, row, 'Mortgage Rate',      p.rate != null ? p.rate + ' %' : '', 'Annual');
  row = writeRow(sheet, row, 'Monthly Expenses',   fmtMoney(p.expenses),              'Insurance, tax, maintenance');
  row = spacer(sheet, row);

  // ─── CORE METRICS ──────────────────────────────────────────
  row = writeSection(sheet, row, 'CORE METRICS');
  row = writeRow(sheet, row, 'Gross Rental Yield',       fmtPct(p.rentalYield),         '(Annual Rent ÷ Price) × 100');
  row = writeRow(sheet, row, 'Monthly Mortgage Payment', fmtMoney(p.monthlyMortgage),   '30-year amortization');
  row = writeMoneyRow(sheet, row, 'Monthly Cash Flow',   p.monthlyCashFlow,             'Rent − Mortgage − Expenses');
  row = writeMoneyRow(sheet, row, 'Annual Cash Flow',    (p.monthlyCashFlow || 0) * 12, 'Monthly × 12');
  row = writeSignedPctRow(sheet, row, 'Cash-on-Cash ROI', p.roi,                        '(Annual CF ÷ Cash Invested) × 100');
  row = writeScoreRow(sheet, row, p.score);
  row = spacer(sheet, row);

  // ─── BREAK-EVEN ────────────────────────────────────────────
  const breakEven = (p.monthlyMortgage || 0) + (p.expenses || 0);
  const margin = (p.rent || 0) - breakEven;
  row = writeSection(sheet, row, 'BREAK-EVEN');
  row = writeRow(sheet, row, 'Break-Even Rent',        fmtMoney(breakEven), 'Mortgage + Expenses');
  row = writeMoneyRow(sheet, row, 'Margin vs. Current Rent', margin,        'Buffer before losses');
  row = spacer(sheet, row);

  // ─── MARKET CONTEXT ────────────────────────────────────────
  row = writeSection(sheet, row, 'MARKET CONTEXT');
  row = writeRow(sheet, row, 'Area Avg Price per m²',      p.marketAvgPrice != null ? fmtMoney(p.marketAvgPrice) : 'Not available', p.marketSource || '');
  row = writeRow(sheet, row, 'Area Avg Rent per m²/month', p.marketAvgRent  != null ? fmtMoney(p.marketAvgRent)  : 'Not available', p.marketSource || '');
  row = writeRow(sheet, row, '5-Year Appreciation (CAGR)', p.appreciationRate != null ? p.appreciationRate + ' %' : '', 'Historical trend');
  row = spacer(sheet, row);

  // ─── VERDICT ───────────────────────────────────────────────
  row = writeSection(sheet, row, 'VERDICT');
  row = writeRow(sheet, row, 'One-Line Verdict', p.oneLineVerdict || '', '');
  row = writeRow(sheet, row, 'Biggest Risk',     p.biggestRisk    || '', '');
  row = writeRow(sheet, row, 'Classification',   p.classification || '', '');
  row = spacer(sheet, row);

  // ─── NOTES ─────────────────────────────────────────────────
  row = writeSection(sheet, row, 'NOTES');
  row = writeNotesBlock(sheet, row);
  row = spacer(sheet, row);

  // ─── FOOTER ────────────────────────────────────────────────
  row = writeFooter(sheet, row);

  // Freeze title row, hide gridlines
  sheet.setFrozenRows(2);
  sheet.setHiddenGridlines(true);

  // Public share
  const file = DriveApp.getFileById(ss.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return { id: ss.getId(), url: ss.getUrl() };
}

// ═══════════════════════════════════════════════════════════════════════
//  WRITERS  (each returns the next available row)
// ═══════════════════════════════════════════════════════════════════════

function writeTitle(sheet, row, text) {
  const range = sheet.getRange(row, 1, 1, 3).merge();
  range.setValue(text)
    .setFontFamily('Inter')
    .setFontWeight('bold')
    .setFontSize(18)
    .setFontColor(COL.WHITE)
    .setBackground(COL.NAVY)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('left');
  sheet.setRowHeight(row, 42);
  // Padding via a left space + a border strip
  return row + 1;
}

function writeSubtitle(sheet, row, text) {
  const range = sheet.getRange(row, 1, 1, 3).merge();
  range.setValue(text)
    .setFontFamily('Inter')
    .setFontSize(11)
    .setFontColor(COL.MUTED)
    .setBackground(COL.GREY_50)
    .setVerticalAlignment('middle')
    .setBorder(false, false, true, false, false, false, COL.GREY_300, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(row, 26);
  return row + 1;
}

function writeSection(sheet, row, label) {
  const range = sheet.getRange(row, 1, 1, 3).merge();
  range.setValue(label)
    .setFontFamily('Inter')
    .setFontWeight('bold')
    .setFontSize(10)
    .setFontColor(COL.BLUE)
    .setBackground(COL.BLUE_PALE)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(row, 30);
  return row + 1;
}

function writeRow(sheet, row, label, value, note) {
  sheet.getRange(row, 1).setValue(label)
    .setFontFamily('Inter').setFontSize(11).setFontWeight('600').setFontColor(COL.TEXT)
    .setVerticalAlignment('middle');
  sheet.getRange(row, 2).setValue(value)
    .setFontFamily('JetBrains Mono').setFontSize(11).setFontColor(COL.NAVY)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  sheet.getRange(row, 3).setValue(note || '')
    .setFontFamily('Inter').setFontSize(10).setFontColor(COL.MUTED)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(row, 24);
  sheet.getRange(row, 1, 1, 3)
    .setBorder(false, false, true, false, false, false, COL.GREY_300, SpreadsheetApp.BorderStyle.SOLID);
  return row + 1;
}

// Money row with red/green sign coloring
function writeMoneyRow(sheet, row, label, value, note) {
  writeRow(sheet, row, label, fmtMoney(value), note);
  const cell = sheet.getRange(row, 2);
  if (typeof value === 'number') {
    if (value > 0) cell.setFontColor(COL.GREEN).setFontWeight('bold');
    else if (value < 0) cell.setFontColor(COL.RED).setFontWeight('bold');
  }
  return row + 1;
}

function writeSignedPctRow(sheet, row, label, value, note) {
  const txt = (value == null || !isFinite(value)) ? '' : (value >= 0 ? '+' : '') + Number(value).toFixed(2) + ' %';
  writeRow(sheet, row, label, txt, note);
  const cell = sheet.getRange(row, 2);
  if (typeof value === 'number') {
    if (value > 0) cell.setFontColor(COL.GREEN).setFontWeight('bold');
    else if (value < 0) cell.setFontColor(COL.RED).setFontWeight('bold');
  }
  return row + 1;
}

function writeScoreRow(sheet, row, score) {
  const s = Number(score);
  const label = 'Investment Score (0–100)';
  writeRow(sheet, row, label, isFinite(s) ? s : '', 'Composite: yield + cash flow + ROI');
  const cell = sheet.getRange(row, 2);
  cell.setFontSize(14).setFontWeight('bold');
  if (isFinite(s)) {
    if (s >= 70) { cell.setFontColor(COL.GREEN).setBackground(COL.GREEN_PALE); }
    else if (s >= 40) { cell.setFontColor('#92590e').setBackground(COL.AMBER_PALE); }
    else { cell.setFontColor(COL.RED).setBackground(COL.RED_PALE); }
  }
  sheet.setRowHeight(row, 34);
  return row + 1;
}

function writeNotesBlock(sheet, row) {
  const range = sheet.getRange(row, 1, 4, 3).merge();
  range.setValue('Free space for your own notes.')
    .setFontFamily('Inter').setFontSize(10).setFontColor(COL.MUTED)
    .setBackground(COL.GREY_50)
    .setVerticalAlignment('top').setHorizontalAlignment('left')
    .setWrap(true);
  for (let i = 0; i < 4; i++) sheet.setRowHeight(row + i, 24);
  return row + 4;
}

function writeFooter(sheet, row) {
  const range = sheet.getRange(row, 1, 1, 3).merge();
  range.setValue('Analyzed with NordInvest · https://nordinvest.io · Free property investment analyzer for Nordic real estate')
    .setFontFamily('Inter').setFontSize(9).setFontColor(COL.MUTED)
    .setBackground(COL.GREY_50)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(row, 28);
  return row + 1;
}

function spacer(sheet, row) {
  sheet.setRowHeight(row, 12);
  return row + 1;
}

// ═══════════════════════════════════════════════════════════════════════
//  FORMATTERS
// ═══════════════════════════════════════════════════════════════════════

function fmtMoney(v) {
  if (v == null || v === '' || !isFinite(v)) return '';
  const n = Number(v);
  const sign = n < 0 ? '−' : '';
  const abs  = Math.abs(n);
  // Thousands separator, no currency symbol so it works globally
  return sign + abs.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function fmtPct(v) {
  if (v == null || !isFinite(v)) return '';
  return Number(v).toFixed(2) + ' %';
}

function strategyLabel(s) {
  return { cashflow: 'Cash Flow', appreciation: 'Appreciation', valueadd: 'Value-Add / Renovation' }[s] || s || '';
}

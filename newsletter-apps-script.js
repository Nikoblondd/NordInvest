/**
 * NordInvest Newsletter — Google Apps Script Backend
 * --------------------------------------------------
 * Receives signups from nordinvest.io and appends them to this Sheet.
 * Prevents duplicate emails (updates existing row instead).
 *
 * SETUP (60 seconds):
 *  1. Create a new Google Sheet → name it "NordInvest Subscribers"
 *  2. In the Sheet, click: Extensions → Apps Script
 *  3. Delete the default code and paste THIS entire file
 *  4. Click Deploy → New deployment → Type: Web app
 *       - Description: NordInvest Newsletter
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Click "Deploy", authorize, and copy the Web app URL
 *  6. Paste that URL into index.html → NEWSLETTER_ENDPOINT constant
 */

const SHEET_NAME = 'Subscribers';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const email = String(data.email || '').toLowerCase().trim();
    const name = String(data.name || '').trim();
    const country = String(data.country || '').trim();
    const propertiesAnalyzed = parseInt(data.propertiesAnalyzed || 0, 10);
    const date = String(data.date || '').trim() || formatToday();

    if (!email || !email.includes('@')) {
      return jsonResponse({ success: false, error: 'Invalid email' });
    }

    const sheet = getOrCreateSheet();
    const values = sheet.getDataRange().getValues();

    // Columns: A=Email, B=Name, C=Country, D=Properties Analyzed, E=Date
    let existingRow = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase() === email) {
        existingRow = i + 1; // 1-indexed
        break;
      }
    }

    if (existingRow > -1) {
      // Update existing row — keep filled fields, refresh count + date
      if (name)    sheet.getRange(existingRow, 2).setValue(name);
      if (country) sheet.getRange(existingRow, 3).setValue(country);
      sheet.getRange(existingRow, 4).setValue(propertiesAnalyzed);
      sheet.getRange(existingRow, 5).setValue(date);
      return jsonResponse({ success: true, status: 'updated' });
    }

    // New subscriber
    sheet.appendRow([email, name, country, propertiesAnalyzed, date]);
    return jsonResponse({ success: true, status: 'created' });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function doGet() {
  return jsonResponse({ status: 'NordInvest Newsletter API is running' });
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Email', 'Name', 'Country', 'Properties Analyzed', 'Date']);
    sheet.getRange(1, 1, 1, 5)
      .setFontWeight('bold')
      .setBackground('#0F1F3D')
      .setFontColor('#FFFFFF');
    sheet.setColumnWidth(1, 240);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 140);
    sheet.setColumnWidth(4, 160);
    sheet.setColumnWidth(5, 120);
    sheet.setFrozenRows(1);
  } else {
    // Migration: if existing sheet has only 4 columns, insert a Name column.
    const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    if (headers.length < 5 || headers[1] !== 'Name') {
      sheet.insertColumnAfter(1);
      sheet.getRange(1, 2).setValue('Name')
        .setFontWeight('bold').setBackground('#0F1F3D').setFontColor('#FFFFFF');
      sheet.setColumnWidth(2, 180);
    }
  }
  return sheet;
}

function formatToday() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

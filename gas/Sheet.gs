/**
 * Google Sheet 當資料庫。
 *
 * 「sheet 匯出」在這個架構裡的定位：Sheet 就是資料庫本身，
 * 匯出＝直接下載這張表（檔案 → 下載 → CSV），不另外做匯出功能。
 */

/** 取得（必要時建立）工作表，並確保表頭與 COLUMNS 一致 */
function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.sheetId);
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }

  return sheet;
}

/**
 * 寫入一筆許願。
 * 用 LockService 是因為兩個人同時送出時，兩邊會算到同一個 wishId。
 */
function appendWish(wish) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20 * 1000);

  try {
    const sheet = getSheet();
    const rowIndex = sheet.getLastRow() + 1;
    const wishId = formatWishId(rowIndex - 1);

    const row = COLUMNS.map(function (column) {
      switch (column) {
        case 'wishId':
          return wishId;
        case 'status':
          return '許願中';
        case 'notionPageId':
        case 'notionSyncError':
          return '';
        default:
          return wish[column] || '';
      }
    });

    sheet.appendRow(row);
    return { wishId: wishId, rowIndex: rowIndex };
  } finally {
    lock.releaseLock();
  }
}

function formatWishId(sequence) {
  return 'WISH-' + String(sequence).padStart(4, '0');
}

/** 把 Notion 同步結果寫回該列，之後才知道哪幾筆沒同步成功 */
function updateSyncResult(rowIndex, result) {
  const sheet = getSheet();
  const pageIdColumn = COLUMNS.indexOf('notionPageId') + 1;
  const errorColumn = COLUMNS.indexOf('notionSyncError') + 1;

  sheet.getRange(rowIndex, pageIdColumn).setValue(result.pageId || '');
  sheet.getRange(rowIndex, errorColumn).setValue(result.error || '');
}

/**
 * 補送：把 Notion 同步失敗的列重跑一次。
 * 手動在編輯器裡執行即可，不排程——失敗應該是罕見事件，值得看一眼。
 */
function retryFailedSyncs() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    console.log('沒有資料');
    return;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  const index = {};
  COLUMNS.forEach(function (column, i) {
    index[column] = i;
  });

  let retried = 0;
  values.forEach(function (row, offset) {
    const alreadySynced = row[index.notionPageId];
    if (alreadySynced) return;

    const wish = {
      pain: row[index.pain],
      solution: row[index.solution],
      features: row[index.features],
      presentation: row[index.presentation],
      email: row[index.email],
      submittedAt: row[index.submittedAt],
    };

    const result = trySyncToNotion(wish, row[index.wishId]);
    updateSyncResult(offset + 2, result);
    retried += 1;
  });

  console.log(`補送完成，處理 ${retried} 筆`);
}

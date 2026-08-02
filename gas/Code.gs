/**
 * Web App 進入點。
 *
 * 部署方式：部署 → 新增部署作業 → 類型「網頁應用程式」
 *   執行身分：我
 *   誰可以存取：任何人
 * 拿到的 /exec 網址填進 web/config.js 的 GAS_ENDPOINT。
 */

/** 健康檢查。開瀏覽器直接打這個網址就能確認部署成功 */
function doGet() {
  return jsonResponse({ ok: true, service: 'wish-pool', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    const payload = parsePayload(e);
    const wish = validateWish(payload);

    // 蜜罐：前端已擋一層，這裡是第二層。裝作成功，不告訴機器人它被擋了。
    if (payload.website) {
      return jsonResponse({ ok: true, wishId: 'WISH-0000' });
    }

    assertNotTooSoon(wish.email);

    const saved = appendWish(wish);

    // 從這裡開始，許願已經進 Sheet 了。
    // 後面兩步（寄信、寫 Notion）任何一步失敗都不能讓整筆請求失敗——
    // 使用者的心力已經付出了，不能因為第三方 API 打嗝就叫他重填。
    const mailError = trySendConfirmation(wish, saved.wishId);
    const notionResult = trySyncToNotion(wish, saved.wishId);

    if (notionResult.pageId || notionResult.error) {
      updateSyncResult(saved.rowIndex, notionResult);
    }

    logIssues(saved.wishId, mailError, notionResult.error);

    return jsonResponse({ ok: true, wishId: saved.wishId });
  } catch (error) {
    console.error('doPost 失敗：' + error.stack);
    return jsonResponse({ ok: false, error: error.message }, 400);
  }
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('沒有收到資料');
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('資料格式不是合法的 JSON');
  }
}

const REQUIRED_FIELDS = [
  { key: 'pain', label: '你的痛點', min: 10 },
  { key: 'solution', label: '你想如何解決', min: 5 },
  { key: 'features', label: '有什麼功能', min: 5 },
  { key: 'presentation', label: '呈現效果', min: 5 },
];

const MAX_FIELD_LENGTH = 1000;

function validateWish(payload) {
  const wish = {};

  REQUIRED_FIELDS.forEach(function (field) {
    const value = String(payload[field.key] || '').trim();
    if (value.length < field.min) {
      throw new Error(`「${field.label}」太短了，至少 ${field.min} 個字`);
    }
    if (value.length > MAX_FIELD_LENGTH) {
      throw new Error(`「${field.label}」超過 ${MAX_FIELD_LENGTH} 字`);
    }
    wish[field.key] = value;
  });

  const email = String(payload.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error('email 格式不正確');
  }
  wish.email = email;
  wish.submittedAt = new Date().toISOString();

  return wish;
}

/** 同一個 email 短時間內重送就擋。用 Cache 不用 Sheet，避免每次都全表掃描 */
function assertNotTooSoon(email) {
  const cache = CacheService.getScriptCache();
  const key = 'cooldown_' + Utilities.base64EncodeWebSafe(email);
  if (cache.get(key)) {
    throw new Error('剛剛才收到你的許願，請過幾分鐘再送');
  }
  cache.put(key, '1', CONFIG.cooldownSeconds);
}

function trySendConfirmation(wish, wishId) {
  try {
    sendConfirmationMail(wish, wishId);
    return null;
  } catch (error) {
    console.error('寄信失敗：' + error.message);
    return error.message;
  }
}

function trySyncToNotion(wish, wishId) {
  try {
    return { pageId: createNotionWish(wish, wishId), error: null };
  } catch (error) {
    console.error('Notion 同步失敗：' + error.message);
    return { pageId: null, error: error.message };
  }
}

function logIssues(wishId, mailError, notionError) {
  if (!mailError && !notionError) return;
  console.warn(
    `${wishId} 已存進 Sheet，但有後續步驟失敗：` +
      `寄信=${mailError || 'ok'}／Notion=${notionError || 'ok'}。` +
      '可用 retryFailedSyncs() 補送。'
  );
}

function jsonResponse(body, _status) {
  // GAS 的 ContentService 不能自訂 HTTP 狀態碼，所以成功與否一律看 body.ok。
  // 第二個參數留著只是為了讓呼叫端讀起來清楚。
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}

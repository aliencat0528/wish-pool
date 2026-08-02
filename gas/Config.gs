/**
 * 設定集中地。
 *
 * 機密一律走 Script Properties（專案設定 → 指令碼屬性），不寫死在程式裡、不進 git。
 * 需要設定的鍵見 docs/DEPLOYMENT.md。
 */

const CONFIG = {
  /** Google Sheet 的 ID（網址中 /d/ 與 /edit 之間那段） */
  get sheetId() {
    return getRequiredProperty('SHEET_ID');
  },

  /** Notion internal integration token（secret_ 或 ntn_ 開頭） */
  get notionToken() {
    return getRequiredProperty('NOTION_TOKEN');
  },

  /** 🌠 許願列表資料庫 ID */
  get notionDatabaseId() {
    return getRequiredProperty('NOTION_DATABASE_ID');
  },

  /** 公開的許願列表網址，放進確認信裡 */
  get listUrl() {
    return getProperty('LIST_URL', 'https://www.notion.so/3b0e6df29bcf811d8377cf2039de0a77');
  },

  /** 寄件顯示名稱 */
  get senderName() {
    return getProperty('SENDER_NAME', '作品許願池');
  },

  /** 工作表分頁名稱 */
  sheetName: 'wishes',

  /** 同一個 email 的冷卻時間（秒）。防灌水的第二道，第一道在前端 */
  cooldownSeconds: 300,

  /** Notion API 版本。固定住，避免哪天 API 改版靜默壞掉 */
  notionVersion: '2022-06-28',
};

/** Sheet 欄位順序。改這裡就等於改表頭，Sheet.gs 會自動對齊 */
const COLUMNS = [
  'wishId',
  'submittedAt',
  'pain',
  'solution',
  'features',
  'presentation',
  'email',
  'status',
  'notionPageId',
  'notionSyncError',
];

function getProperty(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value === null || value === '' ? fallback : value;
}

function getRequiredProperty(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`缺少 Script Property：${key}。請見 docs/DEPLOYMENT.md 設定後再試。`);
  }
  return value;
}

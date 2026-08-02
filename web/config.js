/**
 * 前端設定。部署前把 GAS_ENDPOINT 換成自己的 Web App 網址。
 *
 * 這個檔案會被公開（GitHub Pages 是靜態站），所以：
 * - 這裡只放「公開也無所謂」的值
 * - Notion token、Sheet ID 一律放 GAS 的 Script Properties，不進前端也不進 git
 *   （見 docs/DEPLOYMENT.md）
 */
window.WISH_POOL_CONFIG = {
  // GAS 部署為 Web App 後拿到的 /exec 網址
  GAS_ENDPOINT: 'PASTE_YOUR_GAS_WEB_APP_URL_HERE',

  // 公開的許願列表（Notion 頁面）
  LIST_URL: 'https://www.notion.so/3b0e6df29bcf811d8377cf2039de0a77',
};

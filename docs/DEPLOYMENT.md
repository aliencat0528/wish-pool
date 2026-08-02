# 部署與環境變數

三個部分要各自設定：**Google Sheet** → **GAS Web App** → **GitHub Pages**。
順序不能顛倒，後面兩步都需要前一步的產物。

---

## 1. Google Sheet

1. 建一個新的 Google 試算表，取名 `wish-pool`
2. 從網址抄下 Sheet ID：`https://docs.google.com/spreadsheets/d/<這一段>/edit`
3. 分頁不用手動建，GAS 第一次寫入時會自動建 `wishes` 分頁與表頭

> **匯出**就是這張表本身：檔案 → 下載 → CSV／xlsx。沒有另外做匯出功能，
> 因為 Sheet 已經是資料庫兼匯出格式。

---

## 2. Notion Integration

1. 到 <https://www.notion.so/my-integrations> 建一個 internal integration
2. 抄下 token（`secret_` 或 `ntn_` 開頭）
3. **回到 Notion 的「靈感許願池」頁面 → 右上 `···` → 連線 → 加入剛建的 integration**
   （沒做這步的話 API 會回 404，而且訊息不會告訴你是權限問題）
4. 抄下「🌠 許願列表」資料庫 ID：開資料庫的完整頁面，網址 `notion.so/<32 碼>?v=…` 的那 32 碼

---

## 3. GAS Web App

### 建立專案

1. 到 <https://script.google.com> 建新專案，取名 `wish-pool`
2. 把 `gas/` 底下的檔案逐一貼進去（檔名對應：`Config.gs`、`Code.gs`、`Sheet.gs`、`Mail.gs`、`Notion.gs`）
3. 專案設定 → 勾選「在編輯器中顯示 `appsscript.json` 資訊清單檔案」，貼上 `gas/appsscript.json`

### 設定 Script Properties

專案設定 → 指令碼屬性 → 新增：

| 鍵 | 值 | 必填 |
|---|---|---|
| `SHEET_ID` | 第 1 步的 Sheet ID | ✅ |
| `NOTION_TOKEN` | 第 2 步的 integration token | ✅ |
| `NOTION_DATABASE_ID` | 第 2 步的資料庫 ID | ✅ |
| `LIST_URL` | 公開許願列表網址 | 選用（有預設） |
| `SENDER_NAME` | 寄件顯示名稱 | 選用（預設「作品許願池」） |

> **這三個機密不進 git、不進前端。** `web/config.js` 只放 GAS 網址與列表連結，
> 那兩個公開也無所謂。

### 部署

1. 部署 → 新增部署作業 → 類型選「網頁應用程式」
2. **執行身分：我**（要用你的 Gmail 寄信）
3. **誰可以存取：任何人**（許願者不會有 Google 帳號登入）
4. 首次部署會跳授權，要同意試算表、寄信、外部連線三項
5. 複製 `/exec` 結尾的網址

### 驗證

直接用瀏覽器打開那個 `/exec` 網址，應該看到：

```json
{"ok":true,"service":"wish-pool","time":"2026-08-02T…"}
```

看到這個就代表部署成功。看到 Google 登入頁 = 第 3 步設錯了。

---

## 4. GitHub Pages

1. `web/config.js` 的 `GAS_ENDPOINT` 換成上一步的 `/exec` 網址
2. push 到 GitHub
3. Settings → Pages → Source 選 `main` 分支、`/web` 目錄
4. 開站測一筆真的許願，確認三件事都發生：Sheet 有列、信箱有信、Notion 有新頁

---

## 常見卡點

| 症狀 | 原因 |
|---|---|
| 前端一直轉，Console 有 CORS 錯誤 | 送出的 `Content-Type` 不是 `text/plain`。GAS 接不住 preflight，改回 `text/plain` 就好 |
| GAS 回 `缺少 Script Property：…` | 那個鍵沒設，或設在「使用者屬性」而不是「指令碼屬性」 |
| Notion 回 404 | integration 沒有被加進那個頁面（第 2 步的第 3 點），不是 ID 打錯 |
| Notion 回 400 `validation_error` | 資料庫欄位名稱與 `Notion.gs` 裡的中文名對不上 |
| 信沒寄出但 Sheet 有資料 | 這是設計行為——寄信失敗不會讓整筆許願失敗。看 GAS 執行記錄 |
| 改了程式但行為沒變 | GAS 要**重新部署**才會更新 `/exec`，存檔不夠 |

---

## 補送失敗的同步

Notion 同步失敗時，該列的 `notionSyncError` 會記下原因，`notionPageId` 留空。
在 GAS 編輯器裡手動執行 `retryFailedSyncs()` 補送。

不排程自動重試，是因為同步失敗應該是罕見事件，值得看一眼原因再處理。

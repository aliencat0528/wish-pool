# wish-pool - 作品許願池

讓別人把「想做但做不出來」的小工具丟進來：許願 → AI 可行性分析 → 進開發 → 完成寄信 → 收反饋 → 進下一版。

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 功能特色

- **自己做的許願表單** — 五個欄位（痛點／想如何解決／有什麼功能／呈現效果／email），前後端雙重驗證、蜜罐擋機器人、送出冷卻
- **Google Sheet 當資料庫** — 也就是匯出格式本身，不另外做匯出功能
- **自動確認信** — 走 GmailApp 從自己的帳號寄，有正常 SPF/DKIM，比較不會進垃圾郵件
- **自動寫進 Notion 許願列表** — 公開頁面看得到許願內容與開發進度，**看不到是誰許的**（email 不進 Notion）
- **AI 可行性分析** — 輸出可行性分數、技術難點、建議做法、實行步驟、建議砍掉的範圍；強制輸出難點，避免 LLM 過度樂觀
- **不做也會回信** — 婉拒信說明原因，不靜默略過
- **失敗不回滾** — 進 Sheet 之後，寄信或 Notion 出錯都不會讓使用者重填

## 快速開始

前置需求：Google 帳號、Notion 帳號、GitHub 帳號。**不需要安裝任何東西**——這個專案沒有建置流程。

```bash
git clone https://github.com/aliencat0528/wish-pool.git
cd wish-pool

# 本地看表單長什麼樣（任何靜態伺服器都行）
python3 -m http.server 8000 --directory web
# 預期：Serving HTTP on :: port 8000，開 http://localhost:8000
```

此時表單可以填、驗證會動，但**送出會顯示「表單還沒接上後端」**——
那是正常的，要接後端請走 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)（Sheet → GAS → Pages 三步）。

## 使用方式

### 收許願（自動）

許願者填表 → GAS 寫進 Sheet → 寄確認信 → 寫進 Notion 許願列表（狀態 `許願中`）。
整條路不需要你在場。

### 分析許願（半自動，需要模型在場）

Notion 出現 `狀態 = 許願中` 的新筆時，在 Claude Code 裡跑分析，
依 [`analysis/PROMPT.md`](analysis/PROMPT.md) 產出結果並寫回同一列（狀態轉 `已評估`）。

分析層刻意不自動化：可行性判斷需要看得到整個專案脈絡，
而且這樣不需要 API 金鑰與費用。詳見 [`analysis/SCHEMA.md`](analysis/SCHEMA.md)。

### 開發與完成

挑題開發，在 Notion 就地更新 `開發進度`／`目前功能`／`版本`／`demo 連結`。
完成後在 GAS 編輯器執行 `sendCompletionMail()` 寄通知信；不做則執行 `sendDeclineMail()`。

### 匯出

Google Sheet → 檔案 → 下載 → CSV。Sheet 就是資料庫，不另外做匯出功能。

## 專案結構

```
web/                 # GitHub Pages 靜態表單頁（無框架、無建置）
  index.html
  styles.css
  app.js             # 驗證、蜜罐、冷卻、送出
  config.js          # GAS 網址與列表連結（公開值，機密不放這）
gas/                 # Google Apps Script 後端
  Code.gs            # Web App 進入點與流程編排
  Config.gs          # Script Properties 讀取
  Sheet.gs           # Sheet 讀寫、wishId、補送
  Mail.gs            # 確認信／完成信／婉拒信
  Notion.gs          # Notion API 寫入與更新
  appsscript.json
analysis/            # 分析層規格
  PROMPT.md          # 執行指引與硬規則
  SCHEMA.md          # 輸出 schema 與欄位對應
docs/
  ARCHITECTURE.md    # 資料流、模組職責、兩個關鍵設計決定
  DEPLOYMENT.md      # 三步部署與常見卡點
```

模組與資料流細節見 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 設定 / 環境變數

三個機密走 GAS 的 Script Properties，**不進 git、不進前端**：
`SHEET_ID`、`NOTION_TOKEN`、`NOTION_DATABASE_ID`。

完整清單與設定步驟見 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。

## 測試

目前沒有自動化測試（無建置流程、無測試框架）。驗收走手動清單：

```bash
# 1. 表單驗證：留空送出、亂填 email、字數不足 → 應各自出現對應錯誤
# 2. 健康檢查：瀏覽器打開 GAS 的 /exec 網址
#    預期：{"ok":true,"service":"wish-pool",...}
# 3. 端對端：送一筆真的許願，確認三件事都發生
#    → Sheet 多一列、信箱收到確認信、Notion 多一頁且狀態為「許願中」
# 4. 冷卻：同一個 email 立刻再送一次 → 應被擋下
# 5. 蜜罐：用 devtools 填入 website 欄位再送 → 應顯示成功但 Sheet 不新增
```

## 開發階段

> 順序不是偏好，是依賴關係：**沒接通就沒有真實資料，沒有真實資料就驗不了任何東西**。

| 階段 | 目標 | 出口條件 | 誰做 |
|---|---|---|---|
| **P0 盤點** | 程式與文件寫完 | 見下方「現況」 | ✅ 完成 |
| **P1 接通** | Sheet → Notion integration → GAS 部署 → 填 endpoint | 瀏覽器打開 `/exec` 回 `{"ok":true,...}` | **需帳號登入，由專案擁有者操作** |
| **P2 端對端驗收** | 送一筆真許願 | 上方「測試」九條清單全勾 | P1 之後 |
| **P3 清帳** | 文件與 Notion 同步實況 | 一致性檢查全過；Notion 三層都有本專案 | P2 之後 |
| **P4 上線** | GitHub Pages 開站 | **非開發機**（手機）能完成一次許願 | P3 之後 |
| **P5 反饋迴圈** | 補上完成信已經在連、但還不存在的反饋表單 | 走完「完成 → 寄信 → 收反饋 → 進 Notion」 | P4 之後 |
| **P6 冷啟動** | 決定 `prepare.md` 待討論三項 | 三項都有結論並轉成決策 | 可與 P2 之後並行 |
| **P7 許願列表與投票** | 網站端列表頁 + 三維表情反應 + 聲量圖表（← WP-005） | 訪客不寫許願也能表態；圖表讀得出「該做哪個」 | **P4 之後**（需要線上站台） |

```
P1 ──> P2 ──> P3 ──> P4 ──> P5
              │             └──> P7
              └──> P6 ────────────┘
```

P7 同時服務 P6：**訪客不用寫許願也有事可做**，冷啟動不再只能靠「有人願意從零寫一篇」。

### P2 的關鍵驗證

三件事必須**同時**成立，缺一不算通過：

1. Sheet 多一列
2. 信箱收到確認信，**且不在垃圾郵件匣**
3. Notion 許願列表多一頁，**且沒有 email 欄位**（WP-002）

另外要故意弄壞 `NOTION_TOKEN` 再送一次，確認 **Sheet 仍然有列**——
這是 WP-001「進 Sheet 後不回滾」的驗證，也是本專案最重要的設計主張，
目前**從未被驗證過**。

### P7 的設計要點

**投票只能做在網站上，不能做在 Notion。** Notion 不支援匿名訪客互動——
沒有帳號的人連按都按不了。所以 P7 要新增一個列表頁，Notion 那邊繼續當
**開發看板**（狀態、進度、AI 分析），兩邊各自有存在理由。

三種表情反應，各自代表不同訊號：

| 反應 | 讀作 | 用途 |
|---|---|---|
| 🙋 我也需要 | **真實需求** | **排序主鍵**——決定先做哪個 |
| 🧪 願意幫測 | **承諾** | 最稀有也最有價值；直接餵給 P5 的反饋迴圈 |
| 💡 有趣 | 題目吸引力 | **不進排序**，只當作品集素材的參考 |

<!-- 三個維度會互相矛盾（需求高但沒人覺得有趣，或反之），所以必須先定排序規則，
     否則圖表只會讓人更難決定。見 prepare.md WP-005。 -->

**排序規則**：主鍵 `我也需要`，同分時比 `願意幫測`（承諾 > 興趣）。

圖表三張：票數排行、狀態分佈、時間趨勢。
狀態分佈對許願者是**信任訊號**——讓他們看到真的有東西被做出來。

### 現況（2026-08-03）

- **停在 P1。** 程式與文件寫完，但**端對端流程一次都沒跑過**
- 所有「可以運作」目前都是推論，不是事實

### 已知未完成

| 項目 | 影響 |
|---|---|
| 反饋表單不存在 | 完成信裡的連結指向不存在的東西 |
| `sendCompletionMail()` / `sendDeclineMail()` 只能手動執行 | 沒有接進狀態流程 |
| Notion `ai project document` 只建了執行層 | 違反 `.claude/specs/notion.md` 自己訂的「三層都要建」 |
| 視覺色調未收斂 | 需要一個出口條件，否則會無限調下去 |

## 版本歷史

### v0.1.0 (2026-08-02)

- **許願表單** — 五欄位、雙重驗證、蜜罐、送出冷卻
- **GAS 後端** — 寫 Sheet、寄確認信、同步 Notion，且後兩者失敗不阻斷
- **Notion 許願列表** — 狀態機九態，email 不入庫
- **分析層規格** — 輸出 schema 與反樂觀偏誤的硬規則

## 授權

MIT License

# Changelog

本專案的變更記錄，格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，
版本依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Added
- 反饋表單（完成信裡的連結目前指向待建立的表單）

## [0.1.0] - 2026-08-02

### Added
- **許願表單**（`web/`）— 五個欄位、前端驗證、字數計數、蜜罐欄位、60 秒送出冷卻、
  深淺色主題、鍵盤可操作
- **GAS 後端**（`gas/`）— `doPost` 接收、伺服端二次驗證、`LockService` 保護 wishId 產生、
  同 email 五分鐘冷卻
- **Google Sheet 資料庫** — 自動建立分頁與表頭；Sheet 本身即匯出格式
- **Gmail 確認信** — 附上填寫內容回顧、後續流程說明、「不保證開發」的明確聲明
- **Notion 同步** — 寫入「🌠 許願列表」，含九態狀態機；**email 不入庫**
- **完成信與婉拒信模板** — 婉拒信必附原因
- **補送機制** — `retryFailedSyncs()` 重跑同步失敗的列
- **分析層規格**（`analysis/`）— 輸出 schema、可行性分數定義、強制輸出技術難點與
  「建議砍掉的範圍」的反樂觀偏誤規則
- **文件** — `docs/ARCHITECTURE.md`（資料流與兩個關鍵決定）、`docs/DEPLOYMENT.md`（三步部署與卡點對照表）

### Security
- 三個機密（`SHEET_ID`／`NOTION_TOKEN`／`NOTION_DATABASE_ID`）走 GAS Script Properties，
  不進 git 也不進前端
- 許願內容視為第三方資料，不當作指令執行

[Unreleased]: https://github.com/aliencat0528/wish-pool/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aliencat0528/wish-pool/releases/tag/v0.1.0

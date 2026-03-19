# SUT 武器資產管理與通報系統 — 開發紀錄

---

## Phase 0: 需求規劃 (2026-03-19)

### 背景
SUT 需要一套系統管理所有武器裝備，並提供現場人員快速通報問題的管道。

### 決策
- **架構選型**：Google Apps Script + Google 試算表，零伺服器成本
- **觸發介面**：NFC 貼紙為主（QR Code 可作備援）
- **核心設計**：每件武器分配唯一 SN，燒入 NFC，作為全系統關聯鍵
- **前端**：純 HTML/CSS/JS，跑在使用者手機瀏覽器

### 完成項目
- [x] 建立專案目錄結構
- [x] 撰寫 README.md（架構概述）
- [x] 撰寫 requirements.md（需求規格書 v0.4）
- [x] 列出待決定事項清單

---

## Phase 1: 核心功能開發 (2026-03-19)

### 後端 Code.gs 開發

**完成功能：**
- [x] `doGet(e)` — 接收 `?sn=` 參數，查庫存表回傳 HTML 頁面
- [x] `lookupDevice(sn)` — 用 SN 查「庫存狀態」試算表，回傳設備資訊物件
- [x] `submitReport(data)` — 接收通報資料，寫入「維修通報」試算表
- [x] `updateDevice(data)` — 更新「庫存狀態」試算表的狀態/存放位置
- [x] `uploadPhoto(sn, base64Data, fileName)` — 照片上傳至 Google Drive
- [x] `authorizeDrive()` — 觸發 Drive/Gmail 權限授權的輔助函式
- [x] Gmail 通知 — 通報時自動寄信到 `jacky.lin@gptt.com.tw`

**關鍵技術決策：**
- 使用 `google.script.run` 取代 `fetch`（解決跨域問題）
- 使用 `sheet.getLastRow() + 1` 取代 `appendRow()`（解決跳行到 830 列的 bug）
- 照片連結用 `RichTextValue` 寫成可點擊的「查看照片」超連結
- Gmail 信件格式為純文字，緊急通報標題加 `[緊急]`
- 管理者信箱硬編碼（`Session.getActiveUser()` 在公開部署下回傳空值）

### 前端 index.html 開發

**完成功能：**
- [x] 設備資訊卡片（藍底白字，顯示 SN、貼紙編號、藍芽名稱、使用槍枝、狀態、存放位置）
- [x] 維修通報表單（摺疊選單）：緊急程度、問題複選、照片上傳、補充描述、通報人
- [x] 更新設備狀態表單（摺疊選單）：狀態 + 位置（預設選項 + 自訂輸入）
- [x] 兩個摺疊選單互斥（一次只能展開一個，預設全部收起）
- [x] 照片預覽（max-height: 150px）
- [x] 送出成功/失敗結果頁面
- [x] Toast 通知（更新狀態成功/失敗）
- [x] 全螢幕 Loading 遮罩（旋轉圈圈動畫，送出/更新/上傳照片時顯示）
- [x] 公司 Logo 顯示（使用 lh3.googleusercontent.com 格式）

**UI 設計：**
- 設備卡片背景色：`#3380ad`
- Logo：max-width 240px
- 摺疊選單 max-height：2000px
- 行動裝置優先設計（max-width: 480px）

### 踩過的坑

| 問題 | 根因 | 解法 |
|------|------|------|
| fetch + no-cors 靜默失敗 | HTML 從 googleusercontent.com 提供，跨域 POST 被擋 | 改用 `google.script.run` |
| `Session.getActiveUser()` 回傳空 | 公開部署模式下無法取得使用者 | 硬編碼管理者信箱 |
| DriveApp 權限錯誤 | 需先觸發授權，但 uploadPhoto 在碰到 DriveApp 前就在 split 出錯 | 建立獨立 `authorizeDrive()` 函式 |
| `appendRow` 跳到 830 列 | 試算表有空白列/格式殘留 | 改用 `getLastRow() + 1` + `getRange().setValues()` |
| Logo 不顯示 | Drive `uc?export=view` 被 HtmlService 擋 | 改用 `lh3.googleusercontent.com/d/{fileId}` |
| 摺疊內容被截斷 | max-height: 500px 不夠 | 改為 2000px |
| SN 前導零被吃掉 | Google Sheets 將 SN 當數字處理 | SN 欄格式設為「純文字」 |
| 部署後看不到改動 | 未儲存 / 未選「新版本」/ 15 分鐘快取 | 每次部署必須選「新版本」 |

### 部署資訊

- **Apps Script 部署 URL**：`https://script.google.com/macros/s/AKfycbyjrhodTovCfPsBRnm2vgPvIMconAToVxxO5IEy4T24PVSSdJkg9zggUfLjzenJqv-_/exec`
- **試算表 ID**：`1sRHhSsVlvYMS5X0HOQkOk1nbmcn_CHESh60WIBK3HV8`
- **照片 Drive 資料夾**：「設備通報照片」（自動建立）
- **GitHub**：`https://github.com/gptt-jacky/GPTT_Weapon_Management`

---

## Phase 2: 文件整理與架構簡報 (2026-03-19)

### 完成項目
- [x] README.md 全面重寫：所有網址、URL 規格、試算表欄位定義、功能說明、部署流程
- [x] DEVLOG.md 新增 Phase 1 完整開發紀錄（功能、技術決策、踩坑清單）
- [x] requirements.md 更新至 v0.5（照片上傳、零件鬆脫、自訂輸入、Loading 遮罩）
- [x] 建立 `architecture.html` — 互動式架構簡報頁面
  - 四色分層架構圖（觸發/前端/後端/資料）
  - 手機外框 UI 展示
  - 資料流五步驟動畫
  - 技術選型卡片
  - URL/NFC 規格說明
- [x] 啟用 GitHub Pages，架構簡報可公開分享
- [x] FigJam 架構圖（系統架構 + 使用者操作流程）
- [x] 建立 Memory 系統（project_overview、project_urls、feedback_deployment、user_profile）

### 公開連結
- **GitHub Pages 架構簡報**：`https://gptt-jacky.github.io/GPTT_Weapon_Management/architecture.html`
- **FigJam 系統架構圖**：透過 Figma MCP 建立，已存入 Figma

### 下一步
- [ ] 收集所有設備 SN，產出每個設備的完整 URL
- [ ] 通知信件可能改為群發
- [ ] SN 命名規則可能改版（不影響程式碼）

# SUT 武器資產管理與通報系統

## 一句話描述

透過 NFC/QR Code + Google Apps Script，實現全球動力科技 SUT 武器的資產管理與即時故障通報。

---

## 重要連結

| 項目 | 連結 |
|------|------|
| **Web App 部署網址** | `https://script.google.com/macros/s/AKfycbyjrhodTovCfPsBRnm2vgPvIMconAToVxxO5IEy4T24PVSSdJkg9zggUfLjzenJqv-_/exec` |
| **帶 SN 的完整 URL 格式** | `https://script.google.com/macros/s/AKfycbyjrhodTovCfPsBRnm2vgPvIMconAToVxxO5IEy4T24PVSSdJkg9zggUfLjzenJqv-_/exec?sn={SN值}` |
| **Google 試算表** | `https://docs.google.com/spreadsheets/d/1sRHhSsVlvYMS5X0HOQkOk1nbmcn_CHESh60WIBK3HV8/edit` |
| **GitHub Repo** | `https://github.com/gptt-jacky/GPTT_Weapon_Management` |
| **管理者通知信箱** | `jacky.lin@gptt.com.tw` |
| **照片存放資料夾** | Google Drive「設備通報照片」（自動建立、任何人可檢視） |

---

## NFC / QR Code URL 規格

### URL 格式

```
https://script.google.com/macros/s/AKfycbyjrhodTovCfPsBRnm2vgPvIMconAToVxxO5IEy4T24PVSSdJkg9zggUfLjzenJqv-_/exec?sn={SN}
```

### 參數說明

| 參數 | 說明 | 範例 |
|------|------|------|
| `sn` | 設備唯一序號，對應試算表「庫存狀態」的 SN 欄位 | `01000011001` |

### 範例 URL

```
https://script.google.com/macros/s/AKfycbyjrhodTovCfPsBRnm2vgPvIMconAToVxxO5IEy4T24PVSSdJkg9zggUfLjzenJqv-_/exec?sn=01000011001
```

### NFC 貼紙燒錄

- **貼紙規格**：NTAG213（144 bytes）即可
- **燒入內容**：完整 URL（含 `?sn=` 參數）
- **一張貼紙對應一個 SN**，SN 不重複
- 未來改版前端或後端，NFC 貼紙不需重燒（只要部署 ID 不變）

> **注意**：SN 的值取決於試算表中「庫存狀態」工作表 SN 欄的實際內容。設計師已確認 SN 命名規則可能會大改，但因為系統是讀取試算表，所以不影響程式碼。

---

## 系統架構

```
NFC 貼紙 / QR Code（?sn=01000011001）
  |
  v
手機瀏覽器
  |
  v
Google Apps Script Web App (doGet)
  |-- 查「庫存狀態」試算表 --> 取得設備資訊
  |-- 回傳 index.html 頁面（含設備資訊 + 表單）
  |
  v  (使用者操作)
前端透過 google.script.run 呼叫後端
  |
  |-- submitReport()  --> 寫入「維修通報」試算表 + 上傳照片到 Drive + 寄 Gmail
  |-- updateDevice()  --> 更新「庫存狀態」試算表的狀態/位置
  |
  v
Google 試算表（Spreadsheet ID: 1sRHhSsVlvYMS5X0HOQkOk1nbmcn_CHESh60WIBK3HV8）
  |-- 庫存狀態（資產主檔 / 索引）
  |-- 維修通報（通報紀錄）
```

---

## 試算表欄位定義

### 庫存狀態（資產主檔）

| 欄位 (column) | A | B | C | D | E | F | G |
|-------|------|--------|--------|--------|------|--------|------|
| **名稱** | SN | 貼紙編號 | 藍芽名稱 | 使用槍枝 | 狀態 | 存放位置 | 備註 |
| **範例** | 01000011001 | 1 | BT_G22_1 | G22 | 展示 | 大安 | — |

- **SN 欄格式必須設為「純文字」**，否則前導零會被 Google Sheets 吃掉

### 維修通報（紀錄）

| 欄位 (column) | A | B | C | D | E | F | G | H |
|-------|------|------|--------|--------|--------|--------|------|------|
| **名稱** | 通報時間 | SN | 藍芽名稱 | 緊急程度 | 問題項目 | 補充描述 | 通報人 | 照片連結 |
| **備註** | 自動 | 自動 | 自動 | 緊急/不緊急 | 頓號分隔 | 選填 | 必填 | RichText 超連結 |

---

## 頁面功能

### 功能 A：設備資訊卡片（自動顯示）

掃 NFC 後頁面上方自動顯示：藍芽名稱、SN、貼紙編號、使用槍枝、狀態、存放位置

### 功能 B：維修通報（摺疊選單）

| 欄位 | 類型 | 必填 |
|------|------|------|
| 緊急程度 | 單選：`緊急（兩天內須使用）` / `不緊急` | 是（預設不緊急） |
| 問題項目 | 複選：`電池充不進去` / `外觀破損` / `感測效果不佳` / `零件鬆脫` / `其他` | 至少選一 |
| 照片 | 檔案上傳（拍照或選圖） | 否 |
| 補充描述 | 文字輸入 | 否 |
| 通報人 | 文字輸入 | 是 |

- 送出後寫入「維修通報」試算表
- 照片上傳至 Google Drive「設備通報照片」資料夾，檔名格式：`2026-03-19_14:44(sn:01000011001).jpg`
- 自動寄 Gmail 通知到 `jacky.lin@gptt.com.tw`，緊急通報標題加 `[緊急]`
- 送出時顯示全螢幕 Loading 遮罩（旋轉圈圈動畫）

### 功能 C：更新設備狀態（摺疊選單）

| 欄位 | 選項 |
|------|------|
| 狀態 | 預設：`展示` / `維修` / `測試區` ＋ 自訂文字輸入 |
| 存放位置 | 預設：`大安` / `蘆洲` / `展示` ＋ 自訂文字輸入 |

- 即時寫回「庫存狀態」試算表
- 更新成功後頁面上方的設備卡片即時刷新
- 兩個摺疊選單互斥（一次只能展開一個）

---

## 技術棧

| 層級 | 技術 | 說明 |
|------|------|------|
| 前端 | HTML / CSS / JS | 跑在手機瀏覽器，由 Apps Script HtmlService 提供 |
| 後端 | Google Apps Script | doGet() 回傳頁面、google.script.run 處理資料 |
| 資料庫 | Google 試算表 | 庫存狀態 + 維修通報 |
| 檔案儲存 | Google Drive | 照片上傳（設備通報照片資料夾） |
| 通知 | GmailApp | 自動寄信給管理者 |
| 觸發介面 | NFC / QR Code | 燒入帶 SN 的完整 URL |

---

## 檔案結構

```
SUT資產管理/
├── README.md           ← 本文件（專案說明與所有連結）
├── DEVLOG.md           ← 開發紀錄
├── requirements.md     ← 需求規格書
├── Code.gs             ← Google Apps Script 後端程式碼
└── index.html          ← 前端頁面（HTML + CSS + JS）
```

---

## 部署流程

1. 開啟 [Google Apps Script 編輯器](https://script.google.com)
2. 將 `Code.gs` 貼入 Apps Script 的 `程式碼.gs`
3. 新增 HTML 檔案 `index`，將 `index.html` 內容貼入
4. **儲存** → **部署** → **管理部署** → 右上角鉛筆圖示 → **版本選「新版本」** → 部署
5. 每次修改程式碼後都必須**重新部署為新版本**，否則線上不會更新

> **重要**：部署時必須選「新版本」，不能用「保留原版」，否則修改不會生效。

---

## 狀態

**Phase 1 開發完成** — 核心功能（設備查詢、維修通報、狀態更新、照片上傳、Gmail 通知、Loading 動畫）全部上線，已通過手機實測。

---

## 待辦 / 下一步

- [ ] 收集所有設備 SN → 產出每個設備的完整 URL（供 NFC 燒錄 / QR Code 產生）
- [ ] 通知信件未來可能改為一次發給多人
- [ ] SN 命名規則可能大改（不影響程式碼，只需更新試算表）

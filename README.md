# 📋 員工調查表系統 (Employee Survey System)

一套內部使用的員工問卷調查系統，員工透過工號驗證身份後填寫問卷，HR / 管理端可即時查看填答狀況與統計圖表。

## ✨ 功能亮點

- 🔐 **OTP 驗證登入** — 員工輸入工號後，系統向 HR API 查詢比對，並以一次性密碼（OTP）驗證身份，不需另外註冊帳號
- 🧑‍💼 **管理後台** — 獨立的 Admin 登入頁面，可查看員工名單、追蹤尚未填答的名單、設定填答截止時間
- 📊 **統計圖表** — 使用 Recharts 呈現問卷填答結果
- 📥 **Excel 匯出/匯入** — 整合 SheetJS，方便批次處理員工資料
- 📧 **Email 通知** — 透過 Resend 寄送通知信；未設定 API Key 時自動退回「開發模式」，信件內容改印在 console，方便本機開發不用真的寄信
- 📱 **PWA 支援** — 具備 manifest 設定，可安裝到裝置桌面
- ⏰ **截止時間控管** — 可設定問卷填答的截止日期時間

## 🏗️ 技術棧

| 分類 | 技術 |
|---|---|
| 前端框架 | Next.js 16 (App Router)、React 19、TypeScript |
| 樣式 | Tailwind CSS 4 |
| 後端 / 資料庫 | Supabase（PostgreSQL + Service Role API） |
| 身份驗證 | 自建 Session 機制（`jose` 簽發/驗證）+ OTP |
| Email | Resend（可選，未設定則為開發模式） |
| 圖表 | Recharts |
| Excel 處理 | SheetJS (xlsx) |

## 🚀 快速開始

### 1. 取得程式碼

```bash
git clone https://github.com/changwanhsing/employee-survey.git
cd employee-survey
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

複製範例檔並依需求填入：

```bash
cp .env.example .env.local
```

| 變數 | 必填 | 說明 |
|---|---|---|
| `ADMIN_USER` / `ADMIN_PASSWORD` | ✅ | 管理後台登入帳密 |
| `SESSION_SECRET` | ✅ | Session 簽章密鑰，建議用 `openssl rand -base64 32` 產生 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase 專案的連線資訊 |
| `SUBMIT_DEADLINE` | 選填 | 問卷截止時間（ISO 格式），未設定則不限時 |
| `RESEND_API_KEY` / `EMAIL_FROM` | 選填 | 設定後才會真的寄出通知信，未設定則信件只印在 console |

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 即可看到問卷頁面；管理後台在 `/admin`。

## 📁 專案結構

```
employee-survey/
├── app/
│   ├── admin/            # 管理後台頁面（登入、名單、未填答追蹤）
│   ├── survey/           # 員工填答問卷頁面
│   ├── api/
│   │   ├── otp/          # OTP 驗證
│   │   ├── session/      # Session 簽發/驗證
│   │   ├── employee(s)/  # 員工資料查詢
│   │   ├── admin/        # 管理端 API
│   │   ├── deadline/     # 截止時間設定
│   │   ├── submit/       # 問卷送出
│   │   └── survey-config/ # 問卷內容設定
│   └── manifest.ts       # PWA 設定
├── docs/                 # 架構圖（architecture.svg / architecture-future.svg）
└── data/
```

## 📖 相關文件

- `docs/architecture.svg` — 目前系統架構圖
- `docs/architecture-future.svg` — 未來規劃架構圖

## 🗺️ 開發狀態

目前為 POC（概念驗證）階段，採分階段開發：先以模擬資料驗證流程，再串接正式的 HR 系統與 Email 服務。

---

如需回報問題或提出功能建議，歡迎開 [Issue](https://github.com/changwanhsing/employee-survey/issues)。

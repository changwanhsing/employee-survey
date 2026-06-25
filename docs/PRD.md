# 員工調查系統 — 產品需求文件（PRD）

> 版本：1.0　　日期：2026-06-25　　用途：Microsoft App Builder Vibe Coding 重建參考

---

## 一、系統概述

**員工調查系統**是一套讓企業 HR / 管理員能建立問卷活動（例如：中秋月餅選擇、員工福利品項投票），讓員工以 OTP 驗證登入後填寫偏好品項的 Web 應用程式。

### 核心使用場景
- HR 建立活動、設定品項（可附圖片）、設定截止時間
- 員工輸入工號 → 收到 Email 驗證碼 → 驗證後選擇品項送出
- 管理員在後台即時查看統計圖表、匯出 Excel、追蹤未送出名單

---

## 二、使用者角色

| 角色 | 說明 | 進入方式 |
|------|------|----------|
| **員工（Employee）** | 填寫調查表的一般使用者 | 直接開啟網站首頁 |
| **管理員（Admin）** | HR / 主管，管理活動與員工名冊 | 開啟 `/admin` 路由 |

---

## 三、頁面與功能清單

### 3.1 員工端（前台）

#### 頁面 1：登入頁（`/`）

**功能：**

1. **顯示調查標題**：從 API 讀取目前上架的活動標題，顯示在頁面頂部
2. **截止倒數橫幅（DeadlineBanner）**：
   - 若有設定截止時間，顯示「距離收件截止還有 X 天 Y 小時 Z 分 W 秒」倒數計時
   - 若已過截止，顯示「收件已截止」（紅色提示）
   - 若無截止時間，不顯示此橫幅
3. **既有 Session 偵測**：
   - 頁面載入時同時呼叫 `/api/survey-config` 與 `/api/session`
   - 若 Session 有效（JWT 未過期），顯示綠色提示框：「上次登入：{姓名}（{工號}）」+ 「直接登入」按鈕（跳轉到 `/survey`）
   - 提示「不是本人？請用下方工號重新發送驗證碼」
4. **Step 1 — 工號輸入表單**：
   - 輸入欄：工號（自動轉大寫）
   - 按鈕：「發送驗證碼」
   - 送出後呼叫 `POST /api/otp/send`
   - 成功 → 進入 Step 2（OTP 輸入），並啟動 60 秒重送冷卻
   - 失敗（工號不存在）→ 顯示錯誤訊息
   - 頻率限制（429）→ 顯示「請等待 N 秒後再重新發送」倒數
5. **Step 2 — 驗證碼輸入表單**：
   - 提示框：顯示遮罩後的 Email（例如：`w**g@company.com`），以及「驗證碼有效時間 10 分鐘」
   - 輸入欄：6 位數字驗證碼（`inputMode="numeric"`，大字間距樣式）
   - 按鈕：「驗證並進入」
   - 按鈕：「重新發送驗證碼」（60 秒冷卻期間顯示倒數，禁用）
   - 按鈕：「← 返回重新輸入工號」
   - 驗證成功 → 跳轉到 `/survey`
   - 驗證失敗 → 顯示錯誤訊息

---

#### 頁面 2：調查表頁（`/survey`）

**功能：**

1. **Session 驗證**：頁面載入時呼叫 `/api/session`，若無效則自動跳轉回 `/`
2. **顯示員工資訊**：問候語「您好，{姓名}（{部門}），請選擇您要的品項（可不選）」
3. **載入活動設定**：呼叫 `/api/survey-config` 取得品項列表
4. **查詢是否已送出**：呼叫 `/api/submit/check?employeeId={id}`，若已送出則預填先前的選擇，並顯示「您已送出過，以下是您先前的選擇，可修改後重新送出。」
5. **截止時間查詢**：呼叫 `/api/deadline`，取得截止時間與是否已過期
6. **品項選擇表單**：每個品項一張卡片，包含：
   - 品項圖片（若有設定）
   - 品項名稱（大字體）
   - 品項說明（小字）
   - **複選模式（multiple）**：`-` / `+` 按鈕調整數量（0 ~ maxQuantity），顯示「最多 N 個」
   - **單選模式（single）**：「點選選取」按鈕，選中時變為「✓ 已選擇」，選擇另一項時自動取消前一項
7. **送出按鈕**：
   - 未送出過顯示「送出」，已送出過顯示「重新送出」
   - 送出呼叫 `POST /api/submit`，帶上 `{employeeId, name, department, quantities}`
8. **送出成功畫面**：
   - 綠色勾選圖示 + 「送出成功！」
   - 顯示選擇摘要（例：「王小明（業務部）已選擇：蛋黃酥 x2、廣式月餅 x1」）
   - 若有截止時間，顯示「截止前（{時間}）仍可修改您的選擇。」
   - 按鈕「修改我的選擇」（回到表單）
   - 按鈕「返回首頁」
9. **已截止且已送出畫面**：
   - 「已超過收件期限」提示 + 顯示先前的選擇摘要（唯讀）
   - 「已過收件期限，無法再修改。」
   - 按鈕「返回首頁」
10. **已截止且未送出畫面**：
    - 「已超過收件期限，無法送出。」
    - 顯示截止時間
    - 按鈕「返回首頁」
11. **送出失敗**：顯示紅色錯誤提示框

---

### 3.2 管理員端（後台）

> 注意：後台目前無前端路由守衛，依賴環境層級保護（例如 Vercel Password Protection 或反向代理）

#### 頁面 3：管理後台主頁（`/admin`）

頁面包含以下區塊，由上至下：

**頁首工具列**
- 標題「員工調查系統後台管理」
- 左側連結：「員工名冊」→ `/admin/employees`、「未送出名單」→ `/admin/unsubmitted`（新分頁）、「匯出調查結果 Excel」→ `/api/submit/export`
- 右側連結：「員工調查表」（新分頁開啟 `/`）

---

**區塊 A：活動管理（Survey Management）**

狀態：同一時間只有一個活動「上架中」（isActive = true），其他為草稿。

A1. **活動列表（SurveyList）**
- 顯示所有活動，按更新時間由新到舊排序
- 每筆顯示：活動名稱、更新時間、狀態徽章（「上架中」綠色），以及操作按鈕
- 「上架中」的活動：只顯示「編輯」按鈕（不可刪除、不需上架鍵）
- 草稿活動：顯示「編輯」、「上架」、「刪除」按鈕
- 點「上架」→ 呼叫 `POST /api/admin/surveys/{id}/activate`，該活動標記為 active，其餘全部 inactive
- 點「刪除」→ 確認對話框 → 呼叫 `DELETE /api/admin/surveys/{id}`
- 頂部有「+ 新增活動」按鈕，點後顯示輸入框（活動名稱）+ 「建立」/「取消」按鈕，呼叫 `POST /api/admin/surveys`，成功後自動開啟編輯器

A2. **活動編輯器（SurveyConfigEditor）**（點「編輯」後取代列表顯示）
- 呼叫 `GET /api/admin/surveys/{id}` 載入活動資料
- 欄位：
  - **活動名稱**（內部辨識用，例：2026年中秋月餅）
  - **調查標題**（員工看到的，例：月餅品項選擇）
  - **收件截止時間**（`datetime-local` 輸入，留空 = 不設截止）
  - **選擇方式**：單選 / 複選 切換按鈕
  - **品項列表**：
    - 可新增、刪除品項
    - 每個品項欄位：名稱（必填）、最大數量（1-99，預設 5）、說明（選填）、品項圖片（選填）
    - 圖片：「上傳圖片」按鈕，呼叫 `POST /api/survey-config/upload-image`，限 JPG/PNG，最大 2MB，上傳後儲存公開 URL，可點 × 移除
- 「儲存設定」按鈕 → 呼叫 `PUT /api/admin/surveys/{id}`
- 儲存結果提示（成功/失敗）
- 「← 返回活動列表」按鈕

---

**區塊 B：品項總計**
- 顯示「共 N 人送出」
- 每個品項一個卡片：品項名稱 + 選擇總數量（數字大字體）
- 以網格（2欄桌機版、3欄）排列

---

**區塊 C：圖表分析**（有送出資料時才顯示）

C1. **各品項選擇總數（橫條圖 / Horizontal Bar Chart）**
- X 軸：數量；Y 軸：品項名稱
- 每條不同顏色

C2. **整體回收率（環圖 / Donut Chart）**
- 綠色扇形：已送出人數 + 百分比
- 灰色扇形：未送出人數
- 旁邊文字說明「已送出：N 人（X%）」「未送出：M 人」

C3. **每日送出趨勢（折線圖 / Line Chart）**（超過 1 天才顯示）
- X 軸：日期；Y 軸：當日送出人數
- 紫色折線

C4. **各部門品項選擇分佈（堆疊長條圖 / Stacked Bar Chart）**
- X 軸：部門；Y 軸：數量
- 每個品項一種顏色，堆疊

---

**區塊 D：各部門送出進度**
- 顯示「共 N 人，已送出 M 人」
- 每個部門一列：部門名稱、已送出/總人數（百分比）、綠色進度條

---

**區塊 E：品項 × 部門 數量統計（交叉表）**
- 列：各部門，欄：各品項 + 小計
- 最後一列為總計
- 水平可捲動（min-width: 640px）

---

**區塊 F：送出紀錄搜尋與列表**
- 搜尋框：可依工號、姓名、部門篩選
- 表格欄位：工號、姓名、部門、選擇品項（格式：品項名 xN、品項名 xN）、送出時間
- 按送出時間由新到舊排序
- 若無資料顯示「尚無送出紀錄」

---

#### 頁面 4：員工名冊（`/admin/employees`）

**功能：**

1. **頁首**：「← 返回管理後台」連結、「下載範本」、「匯入 Excel」、「+ 新增員工」按鈕
2. **匯入結果提示**：匯入後顯示成功筆數或錯誤訊息（可含明細清單）
3. **新增員工表單**（點「+ 新增員工」後展開）：
   - 欄位：工號（必填）、姓名（必填）、部門（必填）、Email（必填，格式驗證）
   - 按鈕：「確認新增」（呼叫 `POST /api/employees`）、「取消」
   - 工號重複時顯示「此工號已存在」
4. **搜尋框**：可依工號、姓名、部門、Email 篩選，顯示「顯示 N / M 筆」
5. **員工列表表格**：
   - 欄位：工號、姓名、部門、Email、操作
   - 操作按鈕：「編輯」、「刪除」
   - 點「編輯」→ 該列切換為 inline 編輯模式（姓名、部門、Email 可編輯，工號不可改）→ 「儲存」（`PUT /api/employees/{id}`）/ 「取消」
   - 點「刪除」→ 確認對話框 → `DELETE /api/employees/{id}`
6. **下載範本**：產生 Excel 範本（欄位：工號、姓名、部門、Email，含兩列範例資料），下載為「員工名冊匯入範本.xlsx」
7. **匯入 Excel/CSV**：
   - 接受 `.xlsx`、`.xls`、`.csv`
   - 呼叫 `POST /api/employees/import`
   - 匯入前**清除全部舊資料**再重新寫入
   - 欄位標題自動辨識（中英文均可，例如「工號」=「員工工號」=「employeeId」=「empId」等）
   - 略過空白列、重複工號、缺少必填欄位的列，並在結果中顯示警告

---

#### 頁面 5：未送出名單（`/admin/unsubmitted`）

**功能：**

1. **頁首**：「← 返回管理後台」連結、標題「未送出名單」
2. **搜尋框**：可依工號、姓名、部門篩選
3. **未送出人數**：顯示「共 N 人尚未送出」
4. **按部門分組顯示**：
   - 各部門一個區塊，標題「{部門名}（N 人）」
   - 每人一個橘色 Badge，顯示「{姓名}（{工號}）」
5. **若全部送出**：顯示「所有員工皆已送出！」（綠色提示）

---

## 四、資料模型

### 4.1 資料庫表（Supabase / PostgreSQL）

#### `employees`（員工名冊）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `employee_id` | TEXT PRIMARY KEY | 工號（大寫） |
| `name` | TEXT | 姓名 |
| `department` | TEXT | 部門 |
| `email` | TEXT | Email（用於接收驗證碼） |

#### `otps`（一次性驗證碼）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `employee_id` | TEXT PRIMARY KEY | 員工工號（每人只有一筆） |
| `code` | TEXT | 6 位數驗證碼 |
| `expires_at` | TIMESTAMPTZ | 過期時間（10 分鐘後） |
| `sent_at` | TIMESTAMPTZ | 發送時間（限速用） |

#### `submissions`（調查送出結果）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `employee_id` | TEXT PRIMARY KEY | 員工工號（每人只有一筆，重送覆寫） |
| `name` | TEXT | 員工姓名（快照） |
| `department` | TEXT | 部門（快照） |
| `items` | JSONB | `[{itemId: string, quantity: number}]` |
| `submitted_at` | TIMESTAMPTZ | 最後送出時間 |

#### `survey_config`（調查活動設定）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID PRIMARY KEY | 活動 ID |
| `survey_name` | TEXT | 活動名稱（內部辨識，例：2026年中秋月餅） |
| `title` | TEXT | 員工看到的調查標題（例：月餅品項選擇） |
| `items` | JSONB | 品項陣列（見下方 SurveyItem 結構） |
| `deadline` | TIMESTAMPTZ \| NULL | 截止時間，NULL = 不限 |
| `is_active` | BOOLEAN | 是否為目前上架中的活動（全系統只有一筆為 true） |
| `selection_type` | TEXT | `'single'` 或 `'multiple'` |
| `updated_at` | TIMESTAMPTZ | 最後更新時間 |

#### SurveyItem（JSONB 結構）
```json
{
  "id": "item-1234567890",
  "name": "蛋黃酥",
  "description": "傳統口味，皮酥餡甜",
  "maxQuantity": 5,
  "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/survey-images/item-xxx.jpg"
}
```

### 4.2 Storage（檔案儲存）

- Supabase Storage，Bucket 名稱：`survey-images`（公開 bucket）
- 品項圖片：`item-{timestamp}.{ext}`
- 限制：最大 2MB，僅接受圖片

---

## 五、API 端點規格

> 所有 API 回傳 JSON，除了 `/api/submit/export` 回傳二進位 Excel 檔案

### 員工端 API

#### `POST /api/otp/send`
- **用途**：查詢員工、發送 OTP 驗證碼到 Email
- **Request Body**：`{ "employeeId": "10001" }`
- **成功回應**：`{ "ok": true, "maskedEmail": "w**g@company.com" }`
- **失敗回應**：`{ "ok": false, "error": "..." }`（HTTP 400/404/422/429）
- **限速**：
  - IP 層級：10 次/分鐘（429 返回 `Retry-After` header）
  - 員工層級：1 次 OTP/分鐘（429 返回 `Retry-After`）
- **Email 內容**：標題「{活動標題} — 驗證碼」，內含 6 位數字驗證碼，有效 10 分鐘

#### `POST /api/otp/verify`
- **用途**：驗證 OTP，建立 Session
- **Request Body**：`{ "employeeId": "10001", "code": "123456" }`
- **成功回應**：`{ "ok": true }` + 設定 `survey_session` Cookie（httpOnly、SameSite=Lax）
- **失敗回應**：`{ "ok": false, "error": "..." }`
- **副作用**：驗證成功後刪除 OTP 記錄（一次性）
- **Session JWT 效期**：5 分鐘（瀏覽器關閉時 Cookie 消失，JWT exp 控制伺服器端）

#### `GET /api/session`
- **用途**：檢查目前 Session 是否有效
- **成功回應**：`{ "valid": true, "employeeId": "10001", "name": "王小明", "department": "業務部" }`
- **失敗回應**：`{ "valid": false }` (HTTP 401)

#### `GET /api/survey-config`
- **用途**：取得目前上架活動的設定
- **回應**：`{ "title": "月餅品項選擇", "items": [...], "deadline": "2026-09-15T23:59:00+08:00", "selectionType": "multiple" }`

#### `GET /api/deadline`
- **用途**：取得截止時間資訊
- **回應**：`{ "deadline": "2026-09-15T23:59:00+08:00", "expired": false }`（deadline 可為 null）

#### `GET /api/submit/check?employeeId={id}`
- **用途**：查詢員工是否已送出
- **回應（未送出）**：`{ "submitted": false }`
- **回應（已送出）**：`{ "submitted": true, "items": [{...}], "submittedAt": "..." }`

#### `POST /api/submit`
- **用途**：送出或覆寫調查結果
- **Request Body**：`{ "employeeId": "10001", "name": "王小明", "department": "業務部", "quantities": { "item-xxx": 2, "item-yyy": 1 } }`
- **成功回應**：`{ "ok": true }`
- **失敗（截止）**：`{ "ok": false, "error": "已超過收件期限，無法送出" }` (HTTP 403)
- **副作用**：若員工有 Email，寄送確認信（含選擇品項摘要 + 重新填寫連結）
- **限速**：20 次/分鐘（IP）
- **資料驗證**：數量上限由伺服器以 `maxQuantity` 截斷；quantity ≤ 0 的品項不儲存；無效 itemId 忽略

---

### 管理員端 API

#### `GET /api/employees`
- **回應**：`{ "employees": [{ "employeeId": "10001", "name": "王小明", "department": "業務部", "email": "..." }] }`

#### `POST /api/employees`
- **Request Body**：`{ "employeeId", "name", "department", "email" }`（皆必填）
- **驗證**：Email 格式、工號唯一性
- **回應**：`{ "ok": true }` 或 `{ "ok": false, "error": "..." }`

#### `PUT /api/employees/{id}`
- **Request Body**：`{ "name", "department", "email" }`（工號不可修改）
- **回應**：`{ "ok": true }` 或 `{ "ok": false, "error": "..." }`

#### `DELETE /api/employees/{id}`
- **回應**：`{ "ok": true }`

#### `POST /api/employees/import`
- **Content-Type**：`multipart/form-data`，欄位名 `file`
- **接受格式**：`.xlsx`、`.xls`、`.csv`
- **行為**：清除所有舊員工資料，再批次插入新資料
- **回應**：`{ "ok": true, "imported": 150, "mapping": {...}, "warnings": ["第5列：...已略過"] }`
- **Excel 欄位自動辨識**：支援中英文標題（見下方 Header Alias 對照）

#### `GET /api/submit`（管理員）
- **回應**：`{ "submissions": [{ "employeeId", "name", "department", "items", "submittedAt" }] }`

#### `GET /api/submit/export`
- **回應**：`.xlsx` 檔案下載，欄位：工號、姓名、部門、選擇品項（文字格式）、送出時間
- **檔案名稱**：`survey_results.xlsx`

#### `GET /api/admin/surveys`
- **回應**：`{ "surveys": [{ "id", "surveyName", "title", "isActive", "updatedAt" }] }`（按更新時間降序）

#### `POST /api/admin/surveys`
- **Request Body**：`{ "surveyName": "2026年中秋月餅" }`
- **行為**：建立草稿活動（isActive=false，items=[]）
- **回應**：`{ "ok": true, "id": "uuid" }`

#### `GET /api/admin/surveys/{id}`
- **回應**：`{ "surveyName", "title", "items", "deadline", "selectionType" }`

#### `PUT /api/admin/surveys/{id}`
- **Request Body**：`{ "surveyName", "title", "items", "deadline", "selectionType" }`（均可選填）
- **驗證**：items 中每個品項的 id 和 name 不能為空；maxQuantity 最小為 1
- **回應**：`{ "ok": true }`

#### `DELETE /api/admin/surveys/{id}`
- **回應**：`{ "ok": true }`

#### `POST /api/admin/surveys/{id}/activate`
- **行為**：將指定活動設為 active，其他全部設為 inactive（確保全系統只有一個上架活動）
- **回應**：`{ "ok": true }`

#### `POST /api/survey-config/upload-image`
- **Content-Type**：`multipart/form-data`，欄位名 `file`
- **限制**：僅圖片、最大 2MB
- **行為**：上傳到 Supabase Storage `survey-images` bucket（public）
- **回應**：`{ "ok": true, "url": "https://..." }`

---

## 六、驗證與安全機制

### 6.1 員工認證流程
```
員工輸入工號
    ↓
查詢 employees 表
    ↓（找到且有 Email）
生成 6 位 OTP，存入 otps 表（TTL: 10 分鐘）
    ↓
寄送驗證碼 Email
    ↓
員工輸入驗證碼
    ↓
比對 otps 表：工號比對、code 比對、expires_at 比對
    ↓（驗證成功）
刪除 OTP 記錄（一次性）
    ↓
發放 JWT Session Cookie：
  - 演算法：HS256
  - Payload：{ employeeId, name, department }
  - TTL：5 分鐘
  - Cookie 屬性：httpOnly, SameSite=Lax, Secure（正式環境）
  - 無 Max-Age（瀏覽器關閉即消失）
```

### 6.2 限速規則

| 場景 | 限速 | 層級 |
|------|------|------|
| OTP 發送 | 10 次/分鐘 | IP |
| OTP 重送 | 1 次/分鐘 | 員工工號 |
| 調查送出 | 20 次/分鐘 | IP |

- 實作：In-memory 固定視窗（single-instance 適用）
- 多實例部署需改用 Redis 等共享 Store

### 6.3 Email 遮罩規則
- 本地端 ≤ 2 字元：`a*` 或 `ab*`
- 本地端 > 2 字元：`a****b`（首尾保留，中間以 `*` 取代）
- 範例：`wang@company.com` → `w**g@company.com`

---

## 七、Email 通知機制

### 7.1 OTP 驗證碼信
- **觸發**：員工輸入工號並找到有效帳號時
- **主旨**：`{活動標題} — 驗證碼`
- **內容**：問候語 + 36px 粗體驗證碼 + 10 分鐘有效提示

### 7.2 送出確認信
- **觸發**：員工成功送出調查表（員工有設定 Email 時）
- **主旨**：`{活動標題} — 送出確認`
- **內容**：姓名、部門、選擇品項清單（或「未選擇任何品項」）+ 「重新填寫調查表」按鈕連結

### 7.3 Email 提供者
- 使用 Gmail SMTP（nodemailer）
- 環境變數：`GMAIL_USER`、`GMAIL_APP_PASSWORD`（Gmail App Password）
- 若未設定，僅在 console 印出 log（開發模式）

---

## 八、業務邏輯規則

1. **活動狀態**：同一時間只有一個活動「上架中」，上架新活動時，其餘自動下架
2. **截止時間**：
   - 可在活動設定或環境變數（`SUBMIT_DEADLINE`）設定
   - 截止後：無法新送出；已送出者可查看歷史紀錄但無法修改
3. **送出覆寫**：同一員工多次送出 → 以最新一次為準（upsert by employee_id）
4. **數量驗證**：伺服器端以 `maxQuantity` 截斷，防止前端竄改
5. **單選模式**：選擇一個品項時，自動清除其他品項的選擇；quantity 只能為 0 或 1
6. **Excel 匯入**：全量替換（清除後重寫），非增量更新
7. **圖表顯示條件**：
   - 送出人數 > 0 才顯示圖表區塊
   - 每日趨勢只在超過 1 天的資料才顯示
8. **員工工號**：統一轉大寫處理（儲存與比對）

---

## 九、Excel 匯入欄位辨識對照表

| 目標欄位 | 接受的標題關鍵字（中文） | 接受的標題關鍵字（英文） |
|----------|----------------------|----------------------|
| 工號 | 工號、員工工號、員工編號、員工號碼、員工代號、編號 | employeeId, employeeNo, empId, id |
| 姓名 | 姓名、員工姓名、名字 | name, fullName, employeeName |
| 部門 | 部門、單位、部別、所屬部門 | dept, department, division |
| Email | 信箱、電子郵件、電子信箱、郵件、電郵 | email, e-mail, mail, mailAddress |

- 比對邏輯：去除空白、底線、連字號，轉小寫後比對
- 若缺少工號、姓名、部門任一欄位 → 整批匯入失敗
- Email 缺失或格式錯誤 → 略過該列，回傳警告

---

## 十、環境變數

| 變數名稱 | 必填 | 說明 |
|----------|------|------|
| `SESSION_SECRET` | ✅ | JWT 簽署密鑰（建議 32 字元以上隨機字串） |
| `SUPABASE_URL` | ✅ | Supabase 專案 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase Service Role Key（繞過 RLS） |
| `ADMIN_USER` | 建議 | 後台 HTTP Basic Auth 帳號（預設：admin） |
| `ADMIN_PASSWORD` | 建議 | 後台 HTTP Basic Auth 密碼（預設：changeme） |
| `GMAIL_USER` | 選填 | Gmail 帳號（未設定則 Email 僅印 log） |
| `GMAIL_APP_PASSWORD` | 選填 | Gmail App Password |
| `EMAIL_FROM` | 選填 | 寄件人 Email（預設用 GMAIL_USER） |
| `SUBMIT_DEADLINE` | 選填 | 系統層級截止時間（ISO 格式，例：`2026-09-20T23:59:59+08:00`） |
| `NEXT_PUBLIC_BASE_URL` | 選填 | 完整網站 URL（用於確認信連結） |

---

## 十一、使用者介面規範

### 色彩系統（Tailwind CSS）
| 用途 | 顏色 |
|------|------|
| 主要按鈕 | slate-900（深灰近黑） |
| 成功/已送出 | emerald-500/600 |
| 警告/未送出 | amber-600 |
| 截止/錯誤 | red-500/600 |
| 進行中資訊 | blue-500/800 |
| 背景 | zinc-50 |
| 卡片背景 | white |
| 邊框 | zinc-200/300 |

### 元件風格
- 圓角：所有卡片/按鈕使用 `rounded-2xl` 或 `rounded-3xl`
- 卡片：`border border-zinc-200 bg-white shadow-sm`
- 主要按鈕：`bg-slate-900 text-white hover:bg-slate-700`
- 次要按鈕：`border border-zinc-300 bg-white text-slate-700`
- 危險按鈕：`border border-red-200 text-red-500`

### 響應式設計
- 最大內容寬度：員工端 `max-w-md`（448px）、管理端 `max-w-4xl`（896px）、員工名冊 `max-w-5xl`
- 所有元素以手機優先設計

---

## 十二、主要使用流程（User Journey）

### 員工完整流程
```
開啟網站
  → 顯示「員工調查」標題 + 截止倒數
  → [若有 Session] 顯示「直接登入」按鈕 → 點擊跳轉調查表
  → [無 Session] 輸入工號 → 點「發送驗證碼」
  → 收到 Email 驗證碼
  → 輸入 6 位驗證碼 → 點「驗證並進入」
  → 跳轉到調查表頁
  → 顯示品項卡片 + 數量選擇器（或單選按鈕）
  → 選擇品項後點「送出」
  → 顯示成功畫面（含選擇摘要）
  → 若想修改 → 點「修改我的選擇」→ 表單回到先前選擇 → 重新送出
  → 截止後登入 → 顯示先前選擇（唯讀）
```

### 管理員完整流程
```
開啟 /admin
  → 看到活動列表、統計圖表、送出紀錄
  → 建立新活動 → 設定標題、品項、截止時間、選擇方式 → 儲存
  → 點「上架」→ 活動變為員工填寫對象
  → 管理員工名冊：匯入 Excel 或逐一新增
  → 查看圖表：各品項總數、回收率、每日趨勢、部門分佈
  → 查看未送出名單 → 提醒員工填寫
  → 截止後 → 匯出 Excel → 下載統計結果
```

---

## 十三、未來擴充建議（目前未實作）

- 管理員後台登入頁（目前依賴外部保護）
- 多活動並行（目前只支援單一上架）
- 送出後寄出催填提醒 Email 給未送出員工
- 多語言支援（目前僅繁體中文）
- Mobile App 版本
- Rate Limit 改為 Redis（支援多實例部署）

---

*文件結束*

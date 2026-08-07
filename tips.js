你是一位資深的 Full-stack Node.js 開發者。請幫我為 [實體名稱，例如：Customer / Order / Product] 開發一套基於 Express + EJS + Bootstrap 5 的專用頁面 CRUD 功能。

### 1. 技術棧與結構要求：
- Backend: Express.js (Router) + [資料庫，例如：SQLite / PostgreSQL / MySQL]
- Frontend: EJS 模板引擎 + Bootstrap 5 HTML/CSS
- 模式：使用「獨立頁面跳轉模式」（Dedicated Page Views），完全不使用 Modal 或 AJAX 動態插入 DOM。

### 2. 資料結構 (Data Schema)：
- 主要資料表：[實體表名，例如：Product]
  - 欄位：[列出欄位及型態，例如：ProductId (PK), NameShort, NameCHS, NameENG, Priority, Remark]
- 關聯資料表（可選）：[關聯表名，例如：Component]
  - 關係：[例如：多對多 ProductComponent (ProductId, ComponentId)]

### 3. 需要產出的檔案列表：
1. `routes/[entity].js`：包含完整的 Express 路由邏輯。
2. `views/[entity].ejs`：列表頁（List View）。
3. `views/[entity]-add.ejs`：新增頁面（Add View）。
4. `views/[entity]-edit.ejs`：編輯頁面（Edit View）。
5. `views/[entity]-delete.ejs`：刪除確認頁面（Delete Confirmation View）。

### 4. 各頁面與路由細節規範：

#### A. 列表頁 (`GET /[entity]`)
- 表格展示所有記錄，並將多對多關聯資料合併為 Badge 標籤。
- 提供「+ 新增」、「編輯」與「刪除」的 `<a href="...">` 跳轉按鈕。
- 支援 Alert 訊息顯示（透過 URL Query parameters：`message` 或 `error`）。

#### B. 新增頁 (`GET /[entity]/add` & `POST /[entity]/add`)
- GET 路由：懶加載（Lazy Fetch）獲取關聯選單資料（如 Component 清單），渲染 `[entity]-add.ejs`。
- POST 路由：驗證必填欄位，寫入主表及關聯表，失敗時帶 `error` query 回原頁，成功後 `res.redirect('/[entity]?message=created')`。

#### C. 編輯頁 (`GET /[entity]/edit/:id` & `POST /[entity]/edit/:id`)
- GET 路由：
  1. 依 `:id` 查詢主表資料。
  2. 查詢所有可選的關聯主表資料。
  3. 查詢目前已勾選/綁定的關聯 ID 陣列 (例如：`selectedComponentIds`)。
  4. 渲染 `[entity]-edit.ejs`。
- EJS 視圖需求：表單需自動填入現有資料；多選框/下拉選單需透過 `<% if (selectedComponentIds.includes(...)) { %> checked <% } %>` 正確回顯勾選狀態。
- POST 路由：更新主表資料，先清空舊關聯再批次寫入新關聯（使用 db.serialize 或 Transaction），完成後 redirect 回列表頁。

#### D. 刪除頁 (`GET /[entity]/delete/:id` & `POST /[entity]/delete/:id`)
- GET 路由：查詢該筆資料的基本資訊，渲染警告確認頁 `[entity]-delete.ejs`。
- POST 路由：先刪除關聯表資料，再刪除主表資料，完成後 redirect 回列表頁。

### 5. 程式碼風格要求：
- 寫出完整、可直接運行的程式碼（包含 SQL 查詢、錯誤處理與 EJS 表單元素）。
- 表單必須有合理的驗證標示（例如必填項加上紅星 `*`）。
- 各檔案程式碼需明確分塊標示檔名。



You are a senior full-stack Node.js developer. Please build a dedicated page view CRUD feature based on Express + EJS + Bootstrap 5 for [Entity Name, e.g., Customer / Order / Product].

### 1. Tech Stack & Architecture:
- Backend: Express.js (Router) + [Database, e.g., SQLite / PostgreSQL / MySQL]
- Frontend: EJS template engine + Bootstrap 5 HTML/CSS
- Pattern: Dedicated Page Views (Full page navigation for create/edit/delete). Do NOT use Modals or AJAX DOM manipulation.

### 2. Data Schema:
- Main Table: [Entity Table Name, e.g., Product]
  - Fields: [List fields and types, e.g., ProductId (PK), NameShort, NameCHS, NameENG, Priority, Remark]
- Junction Table (Optional): [Related Table Name, e.g., Component]
  - Relationship: [e.g., Many-to-Many via ProductComponent (ProductId, ComponentId)]

### 3. Required File Output List:
1. `routes/[entity].js`: Complete Express routing logic.
2. `views/[entity].ejs`: Main List view.
3. `views/[entity]-add.ejs`: Dedicated Add view.
4. `views/[entity]-edit.ejs`: Dedicated Edit view.
5. `views/[entity]-delete.ejs`: Dedicated Delete confirmation view.

### 4. Route & View Specifications:

#### A. List Page (`GET /[entity]`)
- Render all records in a responsive table, merging many-to-many linked data into Bootstrap badge tags.
- Provide action links (`<a href="...">`) for "+ Add New", "Edit", and "Delete".
- Display alert messages passed via URL query parameters (`message` or `error`).

#### B. Add Page (`GET /[entity]/add` & `POST /[entity]/add`)
- GET Route: Lazy-fetch available reference data (e.g., Component selection list) and render `[entity]-add.ejs`.
- POST Route: Validate required fields, insert records into both the main and junction tables. On validation error, redirect back with an `error` query parameter. On success, redirect to `res.redirect('/[entity]?message=created')`.

#### C. Edit Page (`GET /[entity]/edit/:id` & `POST /[entity]/edit/:id`)
- GET Route:
  1. Fetch the main record by `:id`.
  2. Fetch all selectable options from the reference table.
  3. Fetch currently linked IDs into an array (e.g., `selectedComponentIds`).
  4. Render `[entity]-edit.ejs`.
- EJS View Requirements: Pre-fill input fields with existing values. For checkboxes/select options, dynamically evaluate checked state using logic like `<% if (selectedComponentIds.includes(...)) { %> checked <% } %>`.
- POST Route: Update the main table record, purge existing junction records, and re-insert new selections (using database transactions or `db.serialize`). Redirect to the list page upon completion.

#### D. Delete Page (`GET /[entity]/delete/:id` & `POST /[entity]/delete/:id`)
- GET Route: Fetch basic record metadata and render the confirmation page `[entity]-delete.ejs`.
- POST Route: Delete junction table associations first, then delete the main record. Redirect back to the list page with a success message.

### 5. Code Quality Guidelines:
- Provide complete, fully functional, production-ready code (including SQL queries, error handling, and EJS markup).
- Indicate required form inputs with red asterisks (`*`).
- Clearly label each code block with its target file path.

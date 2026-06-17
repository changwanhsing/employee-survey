export type ImportedEmployee = {
  employeeId: string;
  name: string;
  department: string;
  email: string;
};

export type ImportResult = {
  employees: ImportedEmployee[];
  errors: string[];
  mapping: Record<keyof ImportedEmployee, string | null>;
};

// 各欄位可接受的常見標題（會正規化後比對）。
const HEADER_ALIASES: Record<keyof ImportedEmployee, string[]> = {
  employeeId: [
    "工號",
    "員工工號",
    "員工編號",
    "員工號碼",
    "員工代號",
    "編號",
    "employeeid",
    "employeeno",
    "empid",
    "id",
  ],
  name: ["姓名", "員工姓名", "名字", "name", "fullname", "employeename"],
  department: ["部門", "單位", "部別", "所屬部門", "dept", "department", "division"],
  email: [
    "email",
    "e-mail",
    "信箱",
    "電子郵件",
    "電子信箱",
    "郵件",
    "電郵",
    "mail",
    "mailaddress",
  ],
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, "");
}

/**
 * 從工作表的標題列，找出每個目標欄位實際對應到哪一個原始標題。
 */
function resolveMapping(headers: string[]): Record<keyof ImportedEmployee, string | null> {
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  const mapping = {} as Record<keyof ImportedEmployee, string | null>;

  for (const field of Object.keys(HEADER_ALIASES) as (keyof ImportedEmployee)[]) {
    const aliases = HEADER_ALIASES[field].map(normalize);
    const match = normalizedHeaders.find((h) => aliases.includes(h.norm));
    mapping[field] = match ? match.raw : null;
  }
  return mapping;
}

/**
 * 將 Excel 解析出的資料列轉成員工資料。
 * rows：每列為 { 標題: 值 } 的物件（例如 xlsx sheet_to_json 的輸出）。
 */
export function mapRowsToEmployees(rows: Record<string, unknown>[]): ImportResult {
  const errors: string[] = [];

  if (rows.length === 0) {
    return {
      employees: [],
      errors: ["檔案沒有任何資料列。"],
      mapping: { employeeId: null, name: null, department: null, email: null },
    };
  }

  const headers = Object.keys(rows[0]);
  const mapping = resolveMapping(headers);

  if (!mapping.employeeId || !mapping.name || !mapping.department) {
    const missing: string[] = [];
    if (!mapping.employeeId) missing.push("工號");
    if (!mapping.name) missing.push("姓名");
    if (!mapping.department) missing.push("部門");
    errors.push(`找不到必要欄位：${missing.join("、")}。請確認 Excel 標題列。`);
    return { employees: [], errors, mapping };
  }

  const cell = (row: Record<string, unknown>, header: string | null): string =>
    header == null ? "" : String(row[header] ?? "").trim();

  const employees: ImportedEmployee[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNo = index + 2; // +1 標題列、+1 轉為 1-based
    const employeeId = cell(row, mapping.employeeId).toUpperCase();
    const name = cell(row, mapping.name);
    const department = cell(row, mapping.department);
    const email = cell(row, mapping.email);

    if (!employeeId && !name && !department) return; // 整列空白，略過

    if (!employeeId || !name || !department) {
      errors.push(`第 ${rowNo} 列：工號／姓名／部門有缺漏，已略過。`);
      return;
    }
    if (seen.has(employeeId)) {
      errors.push(`第 ${rowNo} 列：工號 ${employeeId} 重複，已略過。`);
      return;
    }
    if (!email) {
      errors.push(`第 ${rowNo} 列：${employeeId} 缺少 Email，已略過。`);
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push(`第 ${rowNo} 列：${employeeId} 的 Email「${email}」格式不正確，已略過。`);
      return;
    }

    seen.add(employeeId);
    employees.push({ employeeId, name, department, email });
  });

  return { employees, errors, mapping };
}

// 與 src/data/employees.ts 的簡易解析相容：以逗號分隔，故移除欄位內逗號。
function csvCell(value: string): string {
  return value.replace(/,/g, " ").replace(/[\r\n]+/g, " ");
}

export function employeesToCsv(employees: ImportedEmployee[]): string {
  const header = "employeeId,name,department,email";
  const lines = employees.map((e) =>
    [e.employeeId, e.name, e.department, e.email].map(csvCell).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

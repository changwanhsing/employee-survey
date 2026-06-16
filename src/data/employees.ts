import { readFile } from "fs/promises";
import path from "path";

export type Employee = {
  employeeId: string;
  name: string;
  department: string;
};

const csvFile = path.join(process.cwd(), "data", "employees.csv");

function parseCsv(raw: string): Employee[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(1) // skip header
    .map((line) => {
      const [employeeId, name, department] = line.split(",");
      return {
        employeeId: (employeeId ?? "").trim(),
        name: (name ?? "").trim(),
        department: (department ?? "").trim(),
      };
    })
    .filter((employee) => employee.employeeId);
}

export async function getEmployees(): Promise<Employee[]> {
  const raw = await readFile(csvFile, "utf-8");
  return parseCsv(raw);
}

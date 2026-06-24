import { supabase } from "../lib/supabase";

export type Employee = {
  employeeId: string;
  name: string;
  department: string;
  email?: string;
};

export async function getEmployees(): Promise<Employee[]> {
  const PAGE = 1000;
  const all: Employee[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("employees")
      .select("employee_id, name, department, email")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data) {
      all.push({
        employeeId: row.employee_id,
        name: row.name,
        department: row.department,
        email: row.email || undefined,
      });
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

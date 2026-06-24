import { supabase } from "../lib/supabase";

export type Employee = {
  employeeId: string;
  name: string;
  department: string;
  email?: string;
};

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("employee_id, name, department, email")
    .limit(10000);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    employeeId: row.employee_id,
    name: row.name,
    department: row.department,
    email: row.email || undefined,
  }));
}

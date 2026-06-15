export type Employee = {
  employeeId: string;
  name: string;
  department: "生產部" | "品管部" | "行政部" | "資訊部";
};

export const employees: Employee[] = [
  { employeeId: "A001", name: "吳明哲", department: "生產部" },
  { employeeId: "A002", name: "李佩君", department: "品管部" },
  { employeeId: "A003", name: "陳怡君", department: "行政部" },
  { employeeId: "A004", name: "張志豪", department: "資訊部" },
  { employeeId: "A005", name: "林冠廷", department: "生產部" },
  { employeeId: "A006", name: "周雅婷", department: "品管部" },
  { employeeId: "A007", name: "洪柏宇", department: "行政部" },
  { employeeId: "A008", name: "謝欣妤", department: "資訊部" },
  { employeeId: "A009", name: "劉孟潔", department: "生產部" },
  { employeeId: "A010", name: "楊智凱", department: "品管部" },
  { employeeId: "A011", name: "黃思穎", department: "行政部" },
  { employeeId: "A012", name: "鄭靖雯", department: "資訊部" },
];

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../src/lib/supabase";

export async function GET(request: NextRequest) {
  const employeeId = (request.nextUrl.searchParams.get("employeeId") || "")
    .trim()
    .toUpperCase();

  if (!employeeId) {
    return NextResponse.json({ submitted: false });
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("items, submitted_at")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ submitted: false });
  }

  return NextResponse.json({
    submitted: true,
    items: data.items,
    submittedAt: data.submitted_at,
  });
}

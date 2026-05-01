import { NextRequest, NextResponse } from "next/server";
import { getAgencyMonthlyHours, setAgencyMonthlyHours } from "@/lib/utils/settings-server";

export async function GET() {
  try {
    const hours = await getAgencyMonthlyHours();
    return NextResponse.json({ hours });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { hours } = body ?? {};
    const updated = await setAgencyMonthlyHours(Number(hours));
    return NextResponse.json({ hours: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

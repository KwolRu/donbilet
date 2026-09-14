import { NextResponse } from "next/server";
import { getCitizenships } from "@/lib/donbilet-api";

export async function GET() {
  try {
    const data = await getCitizenships();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Справочник гражданств недоступен." }, { status: 502 });
  }
}

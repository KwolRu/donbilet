import { NextRequest, NextResponse } from "next/server";
import { getTicketPdf } from "@/lib/donbilet-api";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ticketId = Number(searchParams.get("ticketid") ?? "");
  const uuid = searchParams.get("uuid") ?? "";
  if (!ticketId || !uuid) return NextResponse.json({ error: "Некорректная ссылка." }, { status: 400 });

  const pdf = await getTicketPdf(ticketId, uuid);
  if (!pdf) return NextResponse.json({ error: "Билет недоступен." }, { status: 502 });

  return new NextResponse(pdf.body, {
    headers: {
      "Content-Type": pdf.contentType,
      "Content-Disposition": `inline; filename="ticket-${ticketId}.pdf"`,
    },
  });
}

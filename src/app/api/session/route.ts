import { NextResponse } from "next/server";
import { databaseConfigured } from "@/lib/db";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!databaseConfigured()) return NextResponse.json({ email: null });
  const session = await currentSession();
  return NextResponse.json({ email: session?.email ?? null });
}

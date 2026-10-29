import { NextResponse } from "next/server";
import { databaseConfigured, findUserByEmail, updateUserPassword } from "@/lib/db";
import { hashPassword, minimumPasswordLength, verifyPassword } from "@/lib/password";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Sign-in is unavailable." }, { status: 503 });
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Log in to change your password." }, { status: 401 });
  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword) return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  if (newPassword.length < minimumPasswordLength) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  const user = await findUserByEmail(session.email);
  if (!user || user.id !== session.userId || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }
  if (newPassword === currentPassword) return NextResponse.json({ error: "Choose a different password." }, { status: 400 });
  const saved = await updateUserPassword(user.id, await hashPassword(newPassword));
  if (!saved) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  return NextResponse.json({ email: user.email });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { internalDb } from "@/lib/internalSession";

export async function POST() {
  const store = await cookies();
  const token = store.get("happy_staff_session")?.value;
  if (token) {
    const db = internalDb();
    await db.rpc("staff_logout", { p_token: token });
  }
  const res = NextResponse.json({ ok:true });
  res.cookies.set("happy_staff_session","",{ httpOnly:true, sameSite:"lax", secure:true, path:"/", maxAge:0 });
  return res;
}

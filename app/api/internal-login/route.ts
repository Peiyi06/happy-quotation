import { NextResponse } from "next/server";
import { internalDb } from "@/lib/internalSession";

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const db = internalDb();
  const { data, error } = await db.rpc("staff_login", { p_username: username, p_password: password });

  if (error || !data?.ok) {
    return NextResponse.json({ ok:false, error:"Login name or password is incorrect." }, { status:401 });
  }

  const res = NextResponse.json({ ok:true, user:data.user });
  res.cookies.set("happy_staff_session", data.token, {
    httpOnly:true,
    sameSite:"lax",
    secure:true,
    path:"/",
    maxAge:60*60*24*30
  });
  return res;
}

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iuvrzxvczzwndzpykssh.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_vyaTRcn875RcK3mFoP-Now_mI1PlE4l";

export function internalDb() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function internalToken() {
  const store = await cookies();
  return store.get("happy_staff_session")?.value || null;
}

export async function internalUser() {
  const token = await internalToken();
  if (!token) return null;
  const db = internalDb();
  const { data } = await db.rpc("staff_me", { p_token: token });
  if (!data || !data.id) return null;
  return data as { id:string; username:string; name:string; role:"manager"|"sales" };
}

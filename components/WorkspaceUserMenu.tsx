"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function WorkspaceUserMenu({name, role}:{name:string;role:string}) {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="sidebar-user">
      <div>
        <strong>{name}</strong>
        <span>{role === "manager" ? "Manager" : "Sales"}</span>
      </div>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

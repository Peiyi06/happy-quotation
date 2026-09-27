import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import WorkspaceUserMenu from "@/components/WorkspaceUserMenu";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name,email,role").eq("id", user.id).single();

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">H</div>
          <div>
            <strong>Happy Express</strong>
            <span>Quotation Workspace</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/quotations/new">＋ New Quotation</Link>
          <Link href="/quotations">My Quotations</Link>
          <Link href="/tour-groups">Tour Groups</Link>
          {profile?.role === "manager" && <Link href="/team">Team</Link>}
        </nav>

        <WorkspaceUserMenu
          name={profile?.full_name || profile?.email || "User"}
          role={profile?.role || "sales"}
        />
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}

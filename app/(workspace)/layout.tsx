import Link from "next/link";
import { redirect } from "next/navigation";
import { internalUser } from "@/lib/internalSession";
import WorkspaceUserMenu from "@/components/WorkspaceUserMenu";
import NewQuotationMenu from "@/components/NewQuotationMenu";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await internalUser();
  if (!user) redirect("/login");

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">H</div>
          <div><strong>Happy Express</strong><span>Quotation Workspace</span></div>
        </div>
        <nav className="sidebar-nav">
          <Link href="/dashboard">Dashboard</Link>
          {user.username.toLowerCase() === "long" && <Link href="/ai-lab">AI Workspace Beta</Link>}
          <Link href="/inquiries">Inquiries</Link>
          {user.role === "manager" && <Link href="/operation">Operation</Link>}
          <NewQuotationMenu compact />
          <Link href="/quotations">My Quotations</Link>
          <Link href="/tour-groups">Tour Groups</Link>
          {user.role === "manager" && <Link href="/trash">Trash</Link>}
          <Link href="/itineraries">Itinerary Templates</Link>
          <Link href="/travel-library">Travel Media Library</Link>
          {["jess","long"].includes(user.username.toLowerCase()) && <Link href="/ai-import">AI Itinerary</Link>}
          {user.role === "manager" && <Link href="/team">Staff Accounts</Link>}
        </nav>
        <WorkspaceUserMenu name={user.name} role={user.role} />
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}

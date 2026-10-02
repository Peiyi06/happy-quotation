import Link from "next/link";
import { redirect } from "next/navigation";
import { internalUser } from "@/lib/internalSession";
import WorkspaceUserMenu from "@/components/WorkspaceUserMenu";
import NewQuotationMenu from "@/components/NewQuotationMenu";
import WorkspaceModuleMenu from "@/components/WorkspaceModuleMenu";

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
          <Link href="/inquiries">Inquiry</Link>
          {user.role === "manager" && <Link href="/operation">Operation</Link>}
          <NewQuotationMenu compact />
          <Link href="/tour-groups">Tour Group</Link>

          <WorkspaceModuleMenu
            label="Itinerary"
            kicker="ITINERARY"
            title="Itinerary Workspace"
            description="选择行程模板、AI 行程工具或媒体资料库。"
            items={[
              {title:"Itinerary Templates",description:"View, create and manage itinerary templates.",href:"/itineraries",action:"Open Templates →"},
              ...(["jess","long"].includes(user.username.toLowerCase())
                ? [{title:"AI Itinerary",description:"AI-assisted itinerary import and structuring.",href:"/ai-import",action:"Open AI Itinerary →"}]
                : []),
              {title:"Travel Media Library",description:"Manage destination, hotel and attraction media records.",href:"/travel-library",action:"Open Media Library →"},
            ]}
          />

          <WorkspaceModuleMenu
            label="Settings"
            kicker="SETTINGS"
            title="Workspace Settings"
            description="管理系统工具与管理功能。"
            items={[
              ...(user.role === "manager"
                ? [
                    {title:"Staff Accounts",description:"Manage staff access, roles and account status.",href:"/team",action:"Open Staff Accounts →"},
                    {title:"Trash",description:"Review and manage deleted workspace records.",href:"/trash",action:"Open Trash →"},
                  ]
                : []),
              {title:"Coming Soon",description:"More workspace preferences and administration tools.",coming:true},
            ]}
          />
        </nav>
        <WorkspaceUserMenu name={user.name} role={user.role} />
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}

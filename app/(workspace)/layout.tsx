import { redirect } from "next/navigation";
import { internalUser } from "@/lib/internalSession";
import WorkspaceUserMenu from "@/components/WorkspaceUserMenu";
import NewQuotationMenu from "@/components/NewQuotationMenu";
import WorkspaceModuleMenu from "@/components/WorkspaceModuleMenu";
import WorkspaceSidebarLink from "@/components/WorkspaceSidebarLink";
import {UiText, WorkspaceLanguageProvider} from "@/components/WorkspaceLanguage";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await internalUser();
  if (!user) redirect("/login");

  return (
    <WorkspaceLanguageProvider>
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">H</div>
          <div><strong>Happy Express</strong><span><UiText en="Quotation Workspace" zh="报价工作区" /></span></div>
        </div>
        <nav className="sidebar-nav">
          <WorkspaceSidebarLink href="/dashboard"><UiText en="Dashboard" zh="仪表板" /></WorkspaceSidebarLink>
          {user.username.toLowerCase() === "long" && <WorkspaceSidebarLink href="/ai-lab"><UiText en="AI Workspace Beta" zh="AI 工作区 Beta" /></WorkspaceSidebarLink>}
          <WorkspaceSidebarLink href="/inquiries"><UiText en="Inquiry" zh="询价" /></WorkspaceSidebarLink>
          {user.role === "manager" && <WorkspaceSidebarLink href="/operation"><UiText en="Operation" zh="运营" /></WorkspaceSidebarLink>}
          <WorkspaceSidebarLink href="/products"><UiText en="Product" zh="产品" /></WorkspaceSidebarLink>
          <NewQuotationMenu compact />
          <WorkspaceSidebarLink href="/tour-groups"><UiText en="Tour Group" zh="旅游团" /></WorkspaceSidebarLink>

          <WorkspaceModuleMenu
            label={{en:"Itinerary",zh:"行程"}}
            kicker={{en:"ITINERARY",zh:"行程"}}
            title={{en:"Itinerary Workspace",zh:"行程工作区"}}
            activePaths={["/itineraries","/ai-import","/travel-library"]}
            items={[
              {title:{en:"Itinerary Templates",zh:"行程模板"},href:"/itineraries",action:{en:"Open →",zh:"打开 →"}},
              ...(["jess","long"].includes(user.username.toLowerCase())
                ? [{title:{en:"AI Itinerary",zh:"AI 行程"},href:"/ai-import",action:{en:"Open →",zh:"打开 →"}}]
                : []),
              {title:{en:"Travel Media Library",zh:"旅游媒体库"},href:"/travel-library",action:{en:"Open →",zh:"打开 →"}},
            ]}
          />

          <WorkspaceModuleMenu
            label={{en:"Settings",zh:"设置"}}
            kicker={{en:"SETTINGS",zh:"设置"}}
            title={{en:"Workspace Settings",zh:"系统设置"}}
            activePaths={["/team","/trash","/settings"]}
            items={[
              ...(user.role === "manager"
                ? [
                    {title:{en:"Staff Accounts",zh:"员工账号"},href:"/team",action:{en:"Open →",zh:"打开 →"}},
                    {title:{en:"Trash",zh:"回收站"},href:"/trash",action:{en:"Open →",zh:"打开 →"}},
                  ]
                : []),
              {title:{en:"Language & Display",zh:"语言与显示"},href:"/settings",action:{en:"Open →",zh:"打开 →"}},
            ]}
          />
        </nav>
        <WorkspaceUserMenu name={user.name} role={user.role} />
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
    </WorkspaceLanguageProvider>
  );
}

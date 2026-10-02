"use client";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function WorkspaceUserMenu({name, role}:{name:string;role:string}) {
  const router = useRouter();
  const {language}=useWorkspaceLanguage();
  async function logout() {
    await fetch("/api/internal-logout",{method:"POST"});
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="sidebar-user">
      <div><strong>{name}</strong><span>{role === "manager" ? (language==="zh"?"经理":"Manager") : (language==="zh"?"销售":"Sales")}</span></div>
      <button onClick={logout}>{language==="zh"?"退出":"Logout"}</button>
    </div>
  );
}

import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import StaffAccountsManager from "@/components/StaffAccountsManager";
import {UiText} from "@/components/WorkspaceLanguage";

export default async function TeamPage(){
  const user=await internalUser();
  if(!user||user.role!=="manager") return <div className="panel"><UiText en="Manager only." zh="仅限 Manager 使用。" /></div>;
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_accounts",{p_token:token}):{data:[]};
  const accounts=Array.isArray(data)?data:[];
  return <div>
    <div className="page-head page-compact-header"><div><span className="page-kicker"><UiText en="SETTINGS" zh="设置" /></span><h1><UiText en="Staff Accounts" zh="员工账号" /></h1><p><UiText en="Only Managers can create, disable, reset passwords or adjust staff permissions." zh="只有 Manager 可以建立、停用、重设密码或调整员工权限。" /></p></div></div>
    <StaffAccountsManager initialAccounts={accounts} currentUserId={user.id} />
  </div>;
}

import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import StaffAccountsManager from "@/components/StaffAccountsManager";

export default async function TeamPage(){
  const user=await internalUser();
  if(!user||user.role!=="manager") return <div className="panel">Manager only.</div>;
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_accounts",{p_token:token}):{data:[]};
  const accounts=Array.isArray(data)?data:[];
  return <div>
    <div className="page-head"><div><span className="page-kicker">SETTINGS</span><h1>Staff Accounts</h1><p>只有 Manager 可以建立、停用、重设密码或调整员工权限。</p></div></div>
    <StaffAccountsManager initialAccounts={accounts} currentUserId={user.id} />
  </div>;
}

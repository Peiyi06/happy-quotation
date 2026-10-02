"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function StaffAccountsManager({initialAccounts,currentUserId}:{initialAccounts:any[];currentUserId:string}){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  async function createAccount(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setSaving(true);setMessage("");
    const fd=new FormData(e.currentTarget);
    const res=await fetch("/api/internal-staff",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      username:fd.get("username"),name:fd.get("name"),password:fd.get("password"),role:fd.get("role")
    })});
    const data=await res.json();
    setSaving(false);
    if(!res.ok){setMessage(data.error||t("Unable to create account","无法建立账号"));return;}
    setOpen(false); router.refresh();
  }

  async function updateAccount(account:any,patch:any){
    setMessage("");
    const res=await fetch("/api/internal-staff",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id:account.id,name:patch.name??account.name,role:patch.role??account.role,active:patch.active??account.active,password:patch.password||null
    })});
    const data=await res.json();
    if(!res.ok){setMessage(data.error||t("Unable to update account","无法更新账号"));return;}
    router.refresh();
  }

  return <>
    <section className="panel staff-accounts-panel">
      <div className="panel-head"><h2>{t("Team Accounts","团队账号")}</h2><button className={"btn staff-create-trigger "+(open?"":"primary")} onClick={()=>setOpen(v=>!v)}>{open?t("Close","关闭"):t("＋ Create Staff Account","＋ 建立员工账号")}</button></div>
      {open&&<div className="staff-create-shell">
        <div className="staff-create-copy">
          <strong>{t("Create Staff Account","建立员工账号")}</strong>
          <span>{t("Add the staff member's account details and workspace role.","填写员工账号资料与系统角色。")}</span>
        </div>
        <form className="staff-create-form" onSubmit={createAccount}>
          <label className="field"><span>{t("Name","姓名")}</span><input name="name" required placeholder={t("Name","姓名")} /></label>
          <label className="field"><span>{t("Username","用户名")}</span><input name="username" required placeholder={t("Username","用户名")} /></label>
          <label className="field"><span>{t("Password","密码")}</span><input name="password" required placeholder={t("Password","密码")} defaultValue="123" /></label>
          <label className="field"><span>{t("Role","角色")}</span><select name="role" defaultValue="sales"><option value="sales">{t("Sales","销售")}</option><option value="manager">{t("Manager","经理")}</option></select></label>
          <div className="staff-create-actions">
            <button className="btn" type="button" onClick={()=>setOpen(false)}>{t("Cancel","取消")}</button>
            <button className="btn primary" disabled={saving}>{saving?t("Creating...","建立中..."):t("Create Account","建立账号")}</button>
          </div>
        </form>
      </div>}
      {message&&<div className="auth-message">{message}</div>}
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t("Name","姓名")}</th><th>{t("Username","用户名")}</th><th>{t("Role","角色")}</th><th>{t("Status","状态")}</th><th>{t("Password","密码")}</th><th>{t("Action","操作")}</th></tr></thead><tbody>
        {initialAccounts.map(a=><StaffRow key={a.id} account={a} current={a.id===currentUserId} onUpdate={updateAccount} t={t}/>)}
      </tbody></table></div>
    </section>
  </>;
}

function StaffRow({account,current,onUpdate,t}:{account:any;current:boolean;onUpdate:(a:any,p:any)=>void;t:(en:string,zh:string)=>string}){
  const [password,setPassword]=useState("");
  return <tr>
    <td>{account.name}</td><td><strong>{account.username}</strong>{current&&<small>{t("Current account","当前账号")}</small>}</td>
    <td><select value={account.role} disabled={current} onChange={e=>onUpdate(account,{role:e.target.value})}><option value="sales">{t("Sales","销售")}</option><option value="manager">{t("Manager","经理")}</option></select></td>
    <td><span className={"status "+(account.active?"status-confirmed":"status-lost")}>{account.active?t("Active","启用"):t("Disabled","停用")}</span></td>
    <td><input value={password} onChange={e=>setPassword(e.target.value)} placeholder={t("New password","新密码")} /></td>
    <td className="row-actions">
      <button onClick={()=>{if(password){onUpdate(account,{password});setPassword("");}}}>{t("Reset","重设")}</button>
      {!current&&<button onClick={()=>onUpdate(account,{active:!account.active})}>{account.active?t("Disable","停用"):t("Enable","启用")}</button>}
    </td>
  </tr>;
}

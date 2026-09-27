"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffAccountsManager({initialAccounts,currentUserId}:{initialAccounts:any[];currentUserId:string}){
  const router=useRouter();
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
    if(!res.ok){setMessage(data.error||"Unable to create account");return;}
    setOpen(false); router.refresh();
  }

  async function updateAccount(account:any,patch:any){
    setMessage("");
    const res=await fetch("/api/internal-staff",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id:account.id,name:patch.name??account.name,role:patch.role??account.role,active:patch.active??account.active,password:patch.password||null
    })});
    const data=await res.json();
    if(!res.ok){setMessage(data.error||"Unable to update account");return;}
    router.refresh();
  }

  return <>
    <section className="panel">
      <div className="panel-head"><h2>Team Accounts</h2><button className="btn primary" onClick={()=>setOpen(v=>!v)}>＋ Create Staff Account</button></div>
      {open&&<form className="inline-form staff-create-form" onSubmit={createAccount}>
        <input name="name" required placeholder="Name" />
        <input name="username" required placeholder="Username" />
        <input name="password" required placeholder="Password" defaultValue="123" />
        <select name="role" defaultValue="sales"><option value="sales">Sales</option><option value="manager">Manager</option></select>
        <button className="btn primary" disabled={saving}>{saving?"Creating...":"Create"}</button>
        <button className="btn" type="button" onClick={()=>setOpen(false)}>Cancel</button>
      </form>}
      {message&&<div className="auth-message">{message}</div>}
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Password</th><th>Action</th></tr></thead><tbody>
        {initialAccounts.map(a=><StaffRow key={a.id} account={a} current={a.id===currentUserId} onUpdate={updateAccount}/>)}
      </tbody></table></div>
    </section>
  </>;
}

function StaffRow({account,current,onUpdate}:{account:any;current:boolean;onUpdate:(a:any,p:any)=>void}){
  const [password,setPassword]=useState("");
  return <tr>
    <td>{account.name}</td><td><strong>{account.username}</strong>{current&&<small>Current account</small>}</td>
    <td><select value={account.role} disabled={current} onChange={e=>onUpdate(account,{role:e.target.value})}><option value="sales">Sales</option><option value="manager">Manager</option></select></td>
    <td><span className={"status "+(account.active?"status-confirmed":"status-lost")}>{account.active?"Active":"Disabled"}</span></td>
    <td><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" /></td>
    <td className="row-actions">
      <button onClick={()=>{if(password){onUpdate(account,{password});setPassword("");}}}>Reset</button>
      {!current&&<button onClick={()=>onUpdate(account,{active:!account.active})}>{account.active?"Disable":"Enable"}</button>}
    </td>
  </tr>;
}

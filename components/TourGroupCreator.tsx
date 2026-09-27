"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function TourGroupCreator(){
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setSaving(true); setMessage("");
    const fd=new FormData(e.currentTarget);
    const res=await fetch("/api/internal-groups",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      name:fd.get("name"),destination:fd.get("destination"),business_type:fd.get("business_type"),description:fd.get("description")
    })});
    const data=await res.json();
    if(!res.ok){setMessage(data.error||"Unable to save");setSaving(false);return;}
    setSaving(false); setOpen(false); router.refresh();
  }

  return <div className="panel compact-panel">
    {!open?<button className="btn primary" onClick={()=>setOpen(true)}>＋ Add Tour Group</button>:
    <form className="inline-form" onSubmit={submit}>
      <input name="name" required placeholder="例如：江西 8D7N" />
      <input name="destination" placeholder="China / Japan / Thailand" />
      <input name="business_type" placeholder="Private / Corporate / Family" />
      <input name="description" placeholder="备注" />
      <button className="btn primary" disabled={saving}>{saving?"Saving...":"Save"}</button>
      <button className="btn" type="button" onClick={()=>setOpen(false)}>Cancel</button>
    </form>}
    {message&&<div className="auth-message">{message}</div>}
  </div>;
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function TourGroupCreator(){
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setSaving(true);
    const fd=new FormData(e.currentTarget);
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(user){
      await supabase.from("tour_groups").insert({
        name:fd.get("name"),
        destination:fd.get("destination"),
        business_type:fd.get("business_type"),
        description:fd.get("description"),
        created_by:user.id
      });
    }
    setSaving(false); setOpen(false); router.refresh();
  }

  return <div className="panel compact-panel">
    {!open ? <button className="btn primary" onClick={()=>setOpen(true)}>＋ Add Tour Group</button> :
    <form className="inline-form" onSubmit={submit}>
      <input name="name" required placeholder="例如：江西 8D7N" />
      <input name="destination" placeholder="China / Japan / Thailand" />
      <input name="business_type" placeholder="Private / Corporate / Family" />
      <input name="description" placeholder="备注" />
      <button className="btn primary" disabled={saving}>{saving?"Saving...":"Save"}</button>
      <button className="btn" type="button" onClick={()=>setOpen(false)}>Cancel</button>
    </form>}
  </div>;
}

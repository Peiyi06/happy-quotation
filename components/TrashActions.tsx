"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrashActions({id}:{id:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);

  async function restore(){
    setBusy(true);
    const res=await fetch("/api/internal-quotation-trash",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"restore",id})
    });
    setBusy(false);
    if(!res.ok){
      const data=await res.json().catch(()=>({}));
      alert(data.error||"Unable to restore quotation.");
      return;
    }
    router.refresh();
  }

  return <button className="btn" disabled={busy} onClick={restore}>{busy?"Restoring...":"Restore"}</button>;
}

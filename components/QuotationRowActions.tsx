"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QuotationRowActions({id}:{id:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);

  async function hideQuotation(){
    if(!confirm("Hide this quotation? It will move to Trash and can be restored by a Manager.")) return;
    setBusy(true);
    const res=await fetch("/api/internal-quotation-trash",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"delete",id})
    });
    setBusy(false);
    if(!res.ok){
      const data=await res.json().catch(()=>({}));
      alert(data.error||"Unable to hide quotation.");
      return;
    }
    router.refresh();
  }

  return <button className="danger-link" disabled={busy} onClick={hideQuotation}>
    {busy?"Hiding...":"Delete"}
  </button>;
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DuplicateQuotationButton({id}:{id:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);

  async function duplicate(){
    if(!confirm("Duplicate this quotation as a new draft?")) return;
    setBusy(true);
    try{
      const res=await fetch("/api/internal-quotation-duplicate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        alert(data?.error||"Unable to duplicate quotation.");
        return;
      }
      router.push("/quotations/"+data.id+"/edit");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button className="btn" type="button" onClick={duplicate} disabled={busy}>
    {busy?"Duplicating...":"Duplicate Quotation"}
  </button>;
}

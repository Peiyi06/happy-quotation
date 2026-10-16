"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DuplicateQuotationButton from "@/components/DuplicateQuotationButton";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function QuotationDetailMoreActions({
  id,
  canMoveToTrash=false
}:{id:string;canMoveToTrash?:boolean}){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  async function moveToTrash(){
    if(!confirm(t(
      "Move this Draft quotation to Trash? You can restore it later.",
      "要把这份 Draft 报价移至回收站吗？之后仍可恢复。"
    ))) return;
    setBusy(true);
    const res=await fetch("/api/internal-quotation-trash",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"delete",id})
    });
    setBusy(false);
    if(!res.ok){
      const data=await res.json().catch(()=>({}));
      alert(data.error||t("Unable to move quotation to Trash.","无法将报价移至回收站。"));
      return;
    }
    router.push("/quotations");
    router.refresh();
  }

  return <div className="quotation-detail-more">
    <button
      className="btn quotation-detail-more-trigger"
      type="button"
      aria-expanded={open}
      aria-label={t("More actions","更多操作")}
      onClick={()=>setOpen(v=>!v)}
    >
      •••
    </button>
    {open&&<div className="quotation-detail-more-menu" onClick={()=>setOpen(false)}>
      <DuplicateQuotationButton id={id} compact />
      {canMoveToTrash&&<button
        type="button"
        className="btn quotation-trash-action"
        disabled={busy}
        onClick={(event)=>{event.stopPropagation();void moveToTrash();}}
      >
        {busy?t("Moving...","移至回收站中..."):t("Move to Trash","移至回收站")}
      </button>}
    </div>}
  </div>;
}

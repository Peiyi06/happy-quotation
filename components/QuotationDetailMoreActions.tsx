"use client";

import { useState } from "react";
import DuplicateQuotationButton from "@/components/DuplicateQuotationButton";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function QuotationDetailMoreActions({id}:{id:string}){
  const [open,setOpen]=useState(false);
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

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
    </div>}
  </div>;
}

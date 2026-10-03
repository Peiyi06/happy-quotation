"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function DuplicateQuotationButton({id,compact=false}:{id:string;compact?:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  async function duplicate(){
    if(!confirm(t("Duplicate this quotation as a new draft?","将此报价复制为新的草稿吗？"))) return;
    setBusy(true);
    try{
      const res=await fetch("/api/internal-quotation-duplicate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        alert(data?.error||t("Unable to duplicate quotation.","无法复制报价。"));
        return;
      }
      router.push("/quotations/"+data.id+"/edit");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button className={compact?"quotation-detail-menu-action":"btn"} type="button" onClick={duplicate} disabled={busy}>
    {busy?t("Duplicating...","复制中..."):t("Duplicate Quotation","复制报价")}
  </button>;
}

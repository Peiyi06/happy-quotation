"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function QuotationRowActions({id}:{id:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  async function hideQuotation(){
    if(!confirm(t("Hide this quotation? It will move to Trash and can be restored by a Manager.","隐藏此报价吗？它会移到回收站，Manager 可以恢复。"))) return;
    setBusy(true);
    const res=await fetch("/api/internal-quotation-trash",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"delete",id})
    });
    setBusy(false);
    if(!res.ok){
      const data=await res.json().catch(()=>({}));
      alert(data.error||t("Unable to hide quotation.","无法隐藏报价。"));
      return;
    }
    router.refresh();
  }

  return <button className="danger-link" disabled={busy} onClick={hideQuotation}>
    {busy?t("Hiding...","处理中..."):t("Delete","删除")}
  </button>;
}

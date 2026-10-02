"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function TrashActions({id}:{id:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

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
      alert(data.error||t("Unable to restore quotation.","无法恢复报价。"));
      return;
    }
    router.refresh();
  }

  return <button className="btn" disabled={busy} onClick={restore}>{busy?t("Restoring...","恢复中..."):t("Restore","恢复")}</button>;
}

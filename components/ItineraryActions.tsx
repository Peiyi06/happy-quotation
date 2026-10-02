"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function ItineraryActions({id}:{id:string}){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const [busy,setBusy]=useState<""|"duplicate"|"delete">("");

  async function run(action:"duplicate"|"delete"){
    if(action==="duplicate"&&!confirm(t("Duplicate this itinerary as a new draft?","将此行程复制为新的草稿吗？"))) return;
    if(action==="delete"&&!confirm(t("Delete this itinerary?","删除此行程吗？"))) return;
    setBusy(action);
    try{
      const res=await fetch("/api/internal-itinerary-actions",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,id})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){alert(data?.error||t("Unable to complete action.","无法完成操作。"));return;}
      if(action==="duplicate") router.push("/itineraries/"+data.id+"/edit");
      else router.push("/itineraries");
      router.refresh();
    } finally {setBusy("");}
  }

  return <>
    <button className="btn" onClick={()=>run("duplicate")} disabled={!!busy}>{busy==="duplicate"?t("Duplicating...","复制中..."):t("Duplicate","复制")}</button>
    <button className="btn itinerary-delete-btn" onClick={()=>run("delete")} disabled={!!busy}>{busy==="delete"?t("Deleting...","删除中..."):t("Delete","删除")}</button>
  </>;
}

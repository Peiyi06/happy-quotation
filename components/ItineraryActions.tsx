"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ItineraryActions({id}:{id:string}){
  const router=useRouter();
  const [busy,setBusy]=useState<""|"duplicate"|"delete">("");

  async function run(action:"duplicate"|"delete"){
    if(action==="duplicate"&&!confirm("Duplicate this itinerary as a new draft?")) return;
    if(action==="delete"&&!confirm("Delete this itinerary?")) return;
    setBusy(action);
    try{
      const res=await fetch("/api/internal-itinerary-actions",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,id})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){alert(data?.error||"Unable to complete action.");return;}
      if(action==="duplicate") router.push("/itineraries/"+data.id+"/edit");
      else router.push("/itineraries");
      router.refresh();
    } finally {setBusy("");}
  }

  return <>
    <button className="btn" onClick={()=>run("duplicate")} disabled={!!busy}>{busy==="duplicate"?"Duplicating...":"Duplicate"}</button>
    <button className="btn itinerary-delete-btn" onClick={()=>run("delete")} disabled={!!busy}>{busy==="delete"?"Deleting...":"Delete"}</button>
  </>;
}

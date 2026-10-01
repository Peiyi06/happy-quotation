"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const labels:Record<string,string>={
  draft:"Supplier Form Draft",
  ready:"Ready to Send Supplier",
  waiting_quote:"Waiting Supplier Quote",
  quote_received:"Supplier Quote Received"
};

export default function InquiryWorkflowAction({
  inquiryId,
  supplierStatus,
  canAdvance,
  hasQuotation,
  firstQuotationId
}:{
  inquiryId:string;
  supplierStatus:string;
  canAdvance:boolean;
  hasQuotation:boolean;
  firstQuotationId?:string;
}){
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  async function advance(next:string){
    setSaving(true);setError("");
    try{
      const res=await fetch("/api/internal-inquiry-workflow",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:inquiryId,supplierStatus:next})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to update status.");return;}
      router.refresh();
    }finally{setSaving(false);}
  }

  let action:any=null;
  if(hasQuotation&&firstQuotationId){
    action=<button className="workflow-primary-btn" type="button" onClick={()=>router.push("/quotations/"+firstQuotationId)}>Open Quotation</button>;
  }else if(supplierStatus==="quote_received"){
    action=<button className="workflow-primary-btn" type="button" onClick={()=>router.push("/quotations/new?sourceInquiry="+inquiryId)}>Create Outbound Quotation</button>;
  }else if(canAdvance&&supplierStatus==="waiting_quote"){
    action=<button className="workflow-primary-btn" type="button" disabled={saving} onClick={()=>void advance("quote_received")}>{saving?"Updating...":"Mark Quote Received"}</button>;
  }else if(canAdvance&&(supplierStatus==="draft"||supplierStatus==="ready")){
    action=<button className="workflow-primary-btn" type="button" disabled={saving} onClick={()=>void advance("waiting_quote")}>{saving?"Updating...":"Mark Sent to Supplier"}</button>;
  }else{
    action=<button className="workflow-primary-btn disabled" type="button" disabled>{supplierStatus==="waiting_quote"?"Waiting Supplier Quote":"Waiting Operation"}</button>;
  }

  return <aside className="inquiry-workflow-box">
    <div className="inquiry-workflow-status">
      <span>CURRENT STATUS</span>
      <strong>{labels[supplierStatus]||supplierStatus||"Draft"}</strong>
    </div>
    <div className="inquiry-workflow-next">
      <span>NEXT STEP</span>
      {action}
    </div>
    {error&&<small className="workflow-error">{error}</small>}
  </aside>;
}

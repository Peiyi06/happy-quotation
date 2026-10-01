"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const supplierLabels:Record<string,string>={
  draft:"Supplier Draft",
  ready:"Ready to Send",
  waiting_quote:"Waiting Supplier Quote",
  quote_received:"Quote Received"
};

const mainLabels:Record<string,string>={
  new:"New",
  in_progress:"In Progress",
  waiting_quote:"Waiting Quote",
  ready_customer:"Ready for Customer",
  closed:"Closed"
};

export default function InquiryWorkflowAction({
  inquiryId,
  mainStatus,
  supplierStatus,
  canAdvance,
  canUpdateStatus,
  hasQuotation,
  firstQuotationId
}:{
  inquiryId:string;
  mainStatus:string;
  supplierStatus:string;
  canAdvance:boolean;
  canUpdateStatus:boolean;
  hasQuotation:boolean;
  firstQuotationId?:string;
}){
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  const [statusSaving,setStatusSaving]=useState(false);
  const [selectedStatus,setSelectedStatus]=useState(mainStatus||"new");
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

  async function updateMainStatus(){
    if(!canUpdateStatus||statusSaving||selectedStatus===mainStatus) return;
    setStatusSaving(true);setError("");
    try{
      const res=await fetch("/api/internal-inquiry-workflow",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:inquiryId,mainStatus:selectedStatus})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to update Inquiry status.");return;}
      router.refresh();
    }finally{setStatusSaving(false);}
  }

  let action:any=null;
  if(hasQuotation&&firstQuotationId){
    action=<a className="workflow-primary-btn ai-lab-nav-link" href={"/quotations/"+firstQuotationId}>Open Quotation</a>;
  }else if(supplierStatus==="quote_received"){
    action=<a className="workflow-primary-btn ai-lab-nav-link" href={"/quotations/new?sourceInquiry="+inquiryId}>Create Outbound Quotation</a>;
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
      <strong>{mainLabels[mainStatus]||mainStatus||"New"}</strong>
      <small>Supplier: {supplierLabels[supplierStatus]||supplierStatus||"Supplier Draft"}</small>
      {canUpdateStatus&&<div className="inquiry-status-control">
        <select value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)}>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_quote">Waiting Quote</option>
          <option value="ready_customer">Ready for Customer</option>
          <option value="closed">Closed</option>
        </select>
        <button type="button" className="btn" disabled={statusSaving||selectedStatus===mainStatus} onClick={()=>void updateMainStatus()}>{statusSaving?"Updating...":"Update Status"}</button>
      </div>}
    </div>
    <div className="inquiry-workflow-next">
      <span>NEXT STEP</span>
      {action}
    </div>
    {error&&<small className="workflow-error">{error}</small>}
  </aside>;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const supplierLabels:Record<string,string>={
  draft:"Supplier Draft",
  ready:"Ready to Send",
  waiting_quote:"Waiting Supplier Quote",
  quote_received:"Quote Received"
};

function mainLabel(status:string,viewerMode:"sales"|"operation"|"management"){
  if(status==="new") return "New";
  if(status==="in_progress"||status==="waiting_quote") return "In Progress";
  if(status==="under_review") return "Under Review";
  if(status==="revision_required") return viewerMode==="sales"?"Re-quote":"Revision Required";
  if(status==="ready"||status==="ready_customer") return "Ready";
  if(status==="itinerary_ready") return "Itinerary Ready";
  if(status==="closed") return "Closed";
  return status||"New";
}

export default function InquiryWorkflowAction({
  inquiryId,
  mainStatus,
  supplierStatus,
  canAdvance,
  hasQuotation,
  firstQuotationId,
  viewerMode="sales"
}:{
  inquiryId:string;
  mainStatus:string;
  supplierStatus:string;
  canAdvance:boolean;
  canUpdateStatus?:boolean;
  hasQuotation:boolean;
  firstQuotationId?:string;
  viewerMode?:"sales"|"operation"|"management";
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

  if(viewerMode==="sales"){
    if(mainStatus==="ready"||mainStatus==="ready_customer"||mainStatus==="itinerary_ready"){
      action=hasQuotation&&firstQuotationId
        ?<a className="workflow-primary-btn ai-lab-nav-link" href={"/quotations/"+firstQuotationId}>Open Final Quotation</a>
        :<button className="workflow-primary-btn disabled" type="button" disabled>Quotation Ready</button>;
    }else if(mainStatus==="under_review"){
      action=<button className="workflow-primary-btn disabled" type="button" disabled>Under Management Review</button>;
    }else if(mainStatus==="revision_required"){
      action=<button className="workflow-primary-btn disabled" type="button" disabled>Re-quote In Progress</button>;
    }else if(mainStatus==="closed"){
      action=<button className="workflow-primary-btn disabled" type="button" disabled>Case Closed</button>;
    }else{
      action=<button className="workflow-primary-btn disabled" type="button" disabled>{mainStatus==="new"?"Waiting Operation":"Operation In Progress"}</button>;
    }
  }else if(mainStatus==="closed"){
    action=<button className="workflow-primary-btn disabled" type="button" disabled>Case Closed</button>;
  }else if(mainStatus==="under_review"){
    action=hasQuotation&&firstQuotationId
      ?<a className="workflow-primary-btn ai-lab-nav-link" href={"/quotations/"+firstQuotationId}>{viewerMode==="management"?"Review Quotation":"View Submitted Quotation"}</a>
      :<button className="workflow-primary-btn disabled" type="button" disabled>Under Review</button>;
  }else if(mainStatus==="revision_required"){
    action=hasQuotation&&firstQuotationId
      ?<a className="workflow-primary-btn ai-lab-nav-link" href={"/quotations/"+firstQuotationId}>{viewerMode==="operation"?"Revise Quotation":"View Revision"}</a>
      :<button className="workflow-primary-btn disabled" type="button" disabled>Revision Required</button>;
  }else if(mainStatus==="ready"||mainStatus==="ready_customer"||mainStatus==="itinerary_ready"){
    action=hasQuotation&&firstQuotationId
      ?<a className="workflow-primary-btn ai-lab-nav-link" href={"/quotations/"+firstQuotationId}>Open Quotation</a>
      :<button className="workflow-primary-btn disabled" type="button" disabled>Ready</button>;
  }else if(hasQuotation&&firstQuotationId){
    action=<a className="workflow-primary-btn ai-lab-nav-link" href={"/quotations/"+firstQuotationId}>Open Quotation</a>;
  }else if(supplierStatus==="quote_received"){
    action=<a className="workflow-primary-btn ai-lab-nav-link" href={"/quotations/new?sourceInquiry="+inquiryId}>Create Quotation</a>;
  }else if(canAdvance&&supplierStatus==="waiting_quote"){
    action=<button className="workflow-primary-btn" type="button" disabled={saving} onClick={()=>void advance("quote_received")}>{saving?"Updating...":"Mark Quote Received"}</button>;
  }else if(canAdvance&&(supplierStatus==="draft"||supplierStatus==="ready")){
    action=<button className="workflow-primary-btn" type="button" disabled={saving} onClick={()=>void advance("waiting_quote")}>{saving?"Updating...":"Mark Sent to Supplier"}</button>;
  }else{
    action=<button className="workflow-primary-btn disabled" type="button" disabled>Waiting Operation</button>;
  }

  return <aside className="inquiry-workflow-box">
    <div className="inquiry-workflow-status">
      <span>CURRENT STATUS</span>
      <strong>{mainLabel(mainStatus,viewerMode)}</strong>
      {viewerMode!=="sales"&&<small>Supplier: {supplierLabels[supplierStatus]||supplierStatus||"Supplier Draft"}</small>}
    </div>
    <div className="inquiry-workflow-next">
      <span>NEXT STEP</span>
      {action}
    </div>
    {error&&<small className="workflow-error">{error}</small>}
  </aside>;
}

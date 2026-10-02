"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuotationReviewActions({
  quotationId,
  status,
  canSubmit,
  canReview,
  reviewNote,
  reviewedBy,
  reviewedAt,
  sourceInquiryId
}:{
  quotationId:string;
  status:string;
  canSubmit:boolean;
  canReview:boolean;
  reviewNote?:string;
  reviewedBy?:string;
  reviewedAt?:string;
  sourceInquiryId?:string|null;
}){
  const router=useRouter();
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");

  async function run(action:"submit"|"approve"|"request_changes"){
    let note="";
    if(action==="request_changes"){
      note=window.prompt("What needs to be corrected before approval?")||"";
      if(!note.trim()) return;
    }
    if(action==="approve"&&!window.confirm("Approve this quotation and make it Ready for Sales?")) return;

    setBusy(action);setError("");
    try{
      const res=await fetch("/api/internal-quotation-review",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:quotationId,action,note})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setError(data?.error||"Unable to update quotation review.");
        return;
      }
      router.refresh();
    }finally{
      setBusy("");
    }
  }

  const quotationComplete=["under_review","ready","sent","confirmed"].includes(status);
  const reviewCurrent=status==="under_review";
  const reviewComplete=["ready","sent","confirmed"].includes(status);
  const quotationCurrent=status==="draft"||status==="revision_required";
  const itineraryCurrent=reviewComplete;

  return <section className="panel inquiry-workflow-panel quotation-workflow-panel">
    <div className="panel-head inquiry-workflow-panel-head quotation-workflow-compact-head">
      <div>
        <span className="page-kicker">WORKFLOW</span>
        <h2>工作流程</h2>
      </div>
    </div>

    <div className="simple-workflow-grid quotation-workflow-compact system-workflow-grid">
      <div className={"simple-workflow-card "+(quotationComplete?"complete":quotationCurrent?"current":"upcoming")}>
        <div className="simple-workflow-card-head">
          <span className="simple-workflow-index">01</span>
          <span className="simple-workflow-state">{quotationComplete?"✓ Done":status==="revision_required"?"Revise":quotationCurrent?"Current":"Next"}</span>
        </div>
        <div className="simple-workflow-title">
          <strong>Quotation</strong>
        </div>
        {status==="revision_required"&&reviewNote&&<div className="quotation-workflow-note"><span>Review Note</span><strong>{reviewNote}</strong></div>}
        {canSubmit&&(status==="draft"||status==="revision_required")&&<div className="simple-workflow-actions">
          <Link className="btn" href={"/quotations/"+quotationId+"/edit"}>Edit</Link>
          <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={()=>void run("submit")}>
            {busy==="submit"?"Submitting...":status==="revision_required"?"Resubmit":"Submit"}
          </button>
        </div>}
      </div>

      <div className="simple-workflow-arrow" aria-hidden="true">→</div>

      <div className={"simple-workflow-card "+(reviewComplete?"complete":reviewCurrent?"current":"upcoming")}>
        <div className="simple-workflow-card-head">
          <span className="simple-workflow-index">02</span>
          <span className="simple-workflow-state">{reviewComplete?"✓ Done":reviewCurrent?"Reviewing":"Next"}</span>
        </div>
        <div className="simple-workflow-title">
          <strong>Management Review</strong>
        </div>
        {reviewComplete&&reviewedAt&&<div className="quotation-workflow-note success"><span>Approved</span><strong>{reviewedBy?reviewedBy+" · ":""}{new Date(reviewedAt).toLocaleString("en-MY")}</strong></div>}
        {reviewCurrent&&canReview&&<div className="simple-workflow-actions">
          <button className="btn" type="button" disabled={Boolean(busy)} onClick={()=>void run("request_changes")}>
            {busy==="request_changes"?"Updating...":"Request Changes"}
          </button>
          <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={()=>void run("approve")}>
            {busy==="approve"?"Approving...":"Approve Quotation"}
          </button>
        </div>}
        {reviewCurrent&&!canReview&&<div className="quotation-workflow-waiting">Waiting for approval</div>}
      </div>

      <div className="simple-workflow-arrow" aria-hidden="true">→</div>

      <div className={"simple-workflow-card "+(itineraryCurrent?"current":"upcoming")}>
        <div className="simple-workflow-card-head">
          <span className="simple-workflow-index">03</span>
          <span className="simple-workflow-state">{itineraryCurrent?"Current":"Next"}</span>
        </div>
        <div className="simple-workflow-title">
          <strong>Itinerary</strong>
        </div>
        {itineraryCurrent&&sourceInquiryId&&<div className="simple-workflow-actions">
          <Link className="btn primary" href={"/itineraries/new?sourceInquiry="+sourceInquiryId}>Create</Link>
          <Link className="workflow-text-link" href={"/ai-import?sourceInquiry="+sourceInquiryId}>AI</Link>
        </div>}
        {itineraryCurrent&&!sourceInquiryId&&<div className="quotation-workflow-waiting">No linked Inquiry</div>}
      </div>
    </div>

    {error&&<small className="workflow-error">{error}</small>}
  </section>;
}

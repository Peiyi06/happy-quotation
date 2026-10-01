"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const labels:Record<string,string>={
  draft:"Draft",
  under_review:"Under Review",
  revision_required:"Revision Required",
  ready:"Ready",
  sent:"Sent",
  revised:"Revised",
  confirmed:"Confirmed",
  lost:"Lost",
  archived:"Archived"
};

export default function QuotationReviewActions({
  quotationId,
  status,
  canSubmit,
  canReview,
  reviewNote,
  reviewedBy,
  reviewedAt
}:{
  quotationId:string;
  status:string;
  canSubmit:boolean;
  canReview:boolean;
  reviewNote?:string;
  reviewedBy?:string;
  reviewedAt?:string;
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

  return <section className="quote-review-card">
    <div className="quote-review-status">
      <span>REVIEW STATUS</span>
      <strong>{labels[status]||status}</strong>
      {status==="revision_required"&&reviewNote&&<small>{reviewNote}</small>}
      {status==="ready"&&reviewedAt&&<small>Approved{reviewedBy?" by "+reviewedBy:""} · {new Date(reviewedAt).toLocaleString("en-MY")}</small>}
    </div>

    <div className="quote-review-actions">
      {canSubmit&&(status==="draft"||status==="revision_required")&&
        <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={()=>void run("submit")}>
          {busy==="submit"?"Submitting...":status==="revision_required"?"Resubmit for Review":"Submit for Review"}
        </button>}
      {status==="under_review"&&canReview&&<>
        <button className="btn" type="button" disabled={Boolean(busy)} onClick={()=>void run("request_changes")}>
          {busy==="request_changes"?"Updating...":"Request Changes"}
        </button>
        <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={()=>void run("approve")}>
          {busy==="approve"?"Approving...":"Approve Quotation"}
        </button>
      </>}
      {status==="under_review"&&!canReview&&<span className="quote-review-waiting">Waiting Management Review</span>}
      {status==="ready"&&<span className="quote-review-ready">✓ Ready for Sales</span>}
    </div>

    {error&&<small className="workflow-error">{error}</small>}
  </section>;
}

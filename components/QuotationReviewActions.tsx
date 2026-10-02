"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

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
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  async function run(action:"submit"|"approve"|"request_changes"){
    let note="";
    if(action==="request_changes"){
      note=window.prompt(t("What needs to be corrected before approval?","批准前需要修改什么？"))||"";
      if(!note.trim()) return;
    }
    if(action==="approve"&&!window.confirm(t("Approve this quotation and make it Ready for Sales?","批准此报价并将其设为可交给 Sales 的 Ready 状态吗？"))) return;

    setBusy(action);setError("");
    try{
      const res=await fetch("/api/internal-quotation-review",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:quotationId,action,note})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setError(data?.error||t("Unable to update quotation review.","无法更新报价审核状态。"));
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
        <span className="page-kicker">{t("WORKFLOW","工作流程")}</span>
        <h2>{t("Workflow","工作流程")}</h2>
      </div>
    </div>

    <div className="simple-workflow-grid quotation-workflow-compact system-workflow-grid">
      <div className={"simple-workflow-card "+(quotationComplete?"complete":quotationCurrent?"current":"upcoming")}>
        <div className="simple-workflow-card-head">
          <span className="simple-workflow-index">01</span>
          <span className="simple-workflow-state">{quotationComplete?t("✓ Done","✓ 已完成"):status==="revision_required"?t("Revise","修改"):quotationCurrent?t("Current","当前"):t("Next","下一步")}</span>
        </div>
        <div className="simple-workflow-title">
          <strong>{t("Quotation","报价")}</strong>
        </div>
        {status==="revision_required"&&reviewNote&&<div className="quotation-workflow-note"><span>{t("Review Note","审核备注")}</span><strong>{reviewNote}</strong></div>}
        {canSubmit&&(status==="draft"||status==="revision_required")&&<div className="simple-workflow-actions">
          <Link className="btn" href={"/quotations/"+quotationId+"/edit"}>{t("Edit","编辑")}</Link>
          <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={()=>void run("submit")}>
            {busy==="submit"?t("Submitting...","提交中..."):status==="revision_required"?t("Resubmit","重新提交"):t("Submit","提交")}
          </button>
        </div>}
      </div>

      <div className="simple-workflow-arrow" aria-hidden="true">→</div>

      <div className={"simple-workflow-card "+(reviewComplete?"complete":reviewCurrent?"current":"upcoming")}>
        <div className="simple-workflow-card-head">
          <span className="simple-workflow-index">02</span>
          <span className="simple-workflow-state">{reviewComplete?t("✓ Done","✓ 已完成"):reviewCurrent?t("Reviewing","审核中"):t("Next","下一步")}</span>
        </div>
        <div className="simple-workflow-title">
          <strong>{t("Management Review","管理层审核")}</strong>
        </div>
        {reviewComplete&&reviewedAt&&<div className="quotation-workflow-note success"><span>{t("Approved","已批准")}</span><strong>{reviewedBy?reviewedBy+" · ":""}{new Date(reviewedAt).toLocaleString("en-MY")}</strong></div>}
        {reviewCurrent&&canReview&&<div className="simple-workflow-actions">
          <button className="btn" type="button" disabled={Boolean(busy)} onClick={()=>void run("request_changes")}>
            {busy==="request_changes"?t("Updating...","更新中..."):t("Request Changes","要求修改")}
          </button>
          <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={()=>void run("approve")}>
            {busy==="approve"?t("Approving...","批准中..."):t("Approve Quotation","批准报价")}
          </button>
        </div>}
        {reviewCurrent&&!canReview&&<div className="quotation-workflow-waiting">{t("Waiting for approval","等待批准")}</div>}
      </div>

      <div className="simple-workflow-arrow" aria-hidden="true">→</div>

      <div className={"simple-workflow-card "+(itineraryCurrent?"current":"upcoming")}>
        <div className="simple-workflow-card-head">
          <span className="simple-workflow-index">03</span>
          <span className="simple-workflow-state">{itineraryCurrent?t("Current","当前"):t("Next","下一步")}</span>
        </div>
        <div className="simple-workflow-title">
          <strong>{t("Itinerary","行程")}</strong>
        </div>
        {itineraryCurrent&&sourceInquiryId&&<div className="simple-workflow-actions">
          <Link className="btn primary" href={"/itineraries/new?sourceInquiry="+sourceInquiryId}>{t("Create","创建")}</Link>
          <Link className="workflow-text-link" href={"/ai-import?sourceInquiry="+sourceInquiryId}>AI</Link>
        </div>}
        {itineraryCurrent&&!sourceInquiryId&&<div className="quotation-workflow-waiting">{t("No linked Inquiry","没有关联的 Inquiry")}</div>}
      </div>
    </div>

    {error&&<small className="workflow-error">{error}</small>}
  </section>;
}

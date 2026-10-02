"use client";

import {useMemo,useState} from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

type RequirementField={
  key:string;
  en:string;
  zh:string;
  sales:string;
  op:string;
  long?:boolean;
};

export default function InquiryRequirementComparison({
  fields,
  contact,
  salesOwner,
  operationAssignee,
  hasOperationVersion,
  transportRequirement,
  itineraryRequirement
}:{
  fields:RequirementField[];
  contact:string;
  salesOwner:string;
  operationAssignee:string;
  hasOperationVersion:boolean;
  transportRequirement?:string;
  itineraryRequirement?:string;
}){
  const {language}=useWorkspaceLanguage();
  const [showAll,setShowAll]=useState(false);
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  const changedFields=useMemo(
    ()=>fields.filter(field=>field.op!==field.sales),
    [fields]
  );
  const visibleOperationFields=showAll?fields:changedFields;
  const hasOperationOnly=Boolean(transportRequirement||itineraryRequirement);
  const canToggle=hasOperationVersion&&(changedFields.length<fields.length);

  return <div className={"inquiry-version-grid "+(hasOperationVersion?"has-operation":"single")}>
    <article className="inquiry-version-card sales-original">
      <div className="inquiry-version-card-head">
        <h3>{t("Original Inquiry","原始询价")}</h3>
        <span className="inquiry-version-badge">{t("Original","原始")}</span>
      </div>

      <div className="inquiry-version-meta">
        <div><span>{t("Contact","联系方式")}</span><strong>{contact||"—"}</strong></div>
        <div><span>{t("Sales Owner","销售负责人")}</span><strong>{salesOwner||"—"}</strong></div>
      </div>

      <div className="inquiry-version-fields">
        {fields.map(field=><div className={"inquiry-version-field "+(field.long?"long":"")} key={field.key}>
          <span>{language==="zh"?field.zh:field.en}</span>
          {field.long?<p>{field.sales}</p>:<strong>{field.sales}</strong>}
        </div>)}
      </div>
    </article>

    {hasOperationVersion&&<article className="inquiry-version-card operation-version">
      <div className="inquiry-version-card-head">
        <h3>{t("Execution Version","执行版本")}</h3>
        <span className="inquiry-version-badge operation">{t("Updated","已更新")}</span>
      </div>

      <div className="inquiry-version-meta">
        <div><span>{t("Operation","运营负责人")}</span><strong>{operationAssignee||"—"}</strong></div>
        <div><span>{t("Purpose","用途")}</span><strong>{t("Supplier / Execution","供应商 / 执行")}</strong></div>
      </div>

      {!showAll&&changedFields.length===0&&!hasOperationOnly&&
        <div className="inquiry-no-changes">{t("No execution changes yet.","目前没有执行版本变更。")}</div>}

      <div className="inquiry-version-fields">
        {visibleOperationFields.map(field=>{
          const changed=field.op!==field.sales;
          return <div className={"inquiry-version-field "+(field.long?"long ":"")+(changed?"changed":"same")} key={field.key}>
            <div className="inquiry-version-field-label">
              <span>{language==="zh"?field.zh:field.en}</span>
              <em>{changed?t("Updated","已更新"):t("Same as Sales","与销售版本相同")}</em>
            </div>
            {field.long?<p>{field.op}</p>:<strong>{field.op}</strong>}
          </div>;
        })}

        {transportRequirement&&<div className="inquiry-version-field long operation-only">
          <div className="inquiry-version-field-label">
            <span>{t("Transportation Requirement","交通需求")}</span>
            <em>{t("OP Only","运营新增")}</em>
          </div>
          <p>{transportRequirement}</p>
        </div>}

        {itineraryRequirement&&<div className="inquiry-version-field long operation-only">
          <div className="inquiry-version-field-label">
            <span>{t("Itinerary Requirement","行程需求")}</span>
            <em>{t("OP Only","运营新增")}</em>
          </div>
          <p>{itineraryRequirement}</p>
        </div>}
      </div>

      {canToggle&&<button className="inquiry-version-toggle" type="button" onClick={()=>setShowAll(v=>!v)}>
        {showAll?t("Show changes only","只看变更"):t("Show all fields","显示全部")}
      </button>}
    </article>}
  </div>;
}

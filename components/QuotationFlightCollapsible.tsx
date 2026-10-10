"use client";

import {useState} from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function QuotationFlightCollapsible({
  summary,
  defaultOpen=false,
  open,
  onToggle,
  children
}:{
  summary?:string;
  defaultOpen?:boolean;
  open?:boolean;
  onToggle?:(open:boolean)=>void;
  children:React.ReactNode;
}){
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const [internalOpen,setInternalOpen]=useState(defaultOpen);
  const expanded=open??internalOpen;
  const toggle=()=>{
    const next=!expanded;
    if(open===undefined) setInternalOpen(next);
    onToggle?.(next);
  };

  return <div className={"quotation-flight-collapse cost-setup-collapsible "+(expanded?"open":"collapsed")}>
    <button
      type="button"
      className="quotation-flight-collapse-toggle cost-setup-toggle no-print"
      aria-expanded={expanded}
      onClick={toggle}
    >
      <span className="quotation-flight-collapse-title">{t("Flight Information","航班信息")}</span>
      {summary&&<span className="quotation-flight-collapse-summary">{summary}</span>}
      <span className="quotation-flight-collapse-chevron cost-setup-chevron" aria-hidden="true">⌄</span>
    </button>
    <div className="quotation-flight-collapse-print-head">
      <strong>{t("Flight Information","航班信息")}</strong>
      {summary&&<span>{summary}</span>}
    </div>
    <div className="quotation-flight-collapse-body cost-setup-content" hidden={!expanded}>{children}</div>
  </div>;
}

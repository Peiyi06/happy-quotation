"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function NewQuotationMenu({compact=false}:{compact?:boolean}) {
  const [open,setOpen]=useState(false);
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  useEffect(()=>{
    if(!open) return;
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") setOpen(false); };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[open]);

  return <>
    <button
      type="button"
      className={compact?"sidebar-new-quote sidebar-module-btn":"btn primary"}
      onClick={()=>setOpen(true)}
    >
      <span>{t("Quotation","报价")}</span>
      {compact&&<span className="sidebar-module-chevron" aria-hidden="true">›</span>}
    </button>

    {open && typeof document !== "undefined" && createPortal(
      <div className="quotation-type-overlay" onMouseDown={()=>setOpen(false)}>
      <div className="quotation-type-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="quotation-type-head">
          <div>
            <span className="page-kicker">{t("QUOTATION","报价")}</span>
            <h2>{t("Quotation Workspace","报价工作区")}</h2>
          </div>
          <button type="button" className="quotation-type-close" onClick={()=>setOpen(false)} aria-label={t("Close","关闭")}>×</button>
        </div>

        <div className="quotation-type-grid workspace-module-grid">
          <Link href="/quotations" className="quotation-type-card available" onClick={()=>setOpen(false)}>
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">01</span>
              <span className="quotation-type-status available">{t("Available","可使用")}</span>
            </div>
            <div>
              <h3>{t("My Quotations","我的报价")}</h3>
            </div>
            <span className="quotation-type-enter">{t("Open →","打开 →")}</span>
          </Link>

          <Link href="/quotations/new" className="quotation-type-card available" onClick={()=>setOpen(false)}>
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">02</span>
              <span className="quotation-type-status available">{t("Available","可使用")}</span>
            </div>
            <div>
              <h3>{t("Outbound","出境旅游")}</h3>
            </div>
            <span className="quotation-type-enter">{t("Create →","建立 →")}</span>
          </Link>

          <div className="quotation-type-card coming" aria-disabled="true">
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">03</span>
              <span className="quotation-type-status">{t("Coming Soon","即将推出")}</span>
            </div>
            <div>
              <h3>{t("Inbound","入境旅游")}</h3>
            </div>
            <span className="quotation-type-enter muted">{t("Setup","设置")}</span>
          </div>

          <div className="quotation-type-card coming" aria-disabled="true">
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">04</span>
              <span className="quotation-type-status">{t("Coming Soon","即将推出")}</span>
            </div>
            <div>
              <h3>{t("Island","海岛旅游")}</h3>
            </div>
            <span className="quotation-type-enter muted">{t("Setup","设置")}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
    )}
  </>;
}

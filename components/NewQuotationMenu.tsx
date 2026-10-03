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
      <span>{compact?t("Quotation","报价"):t("+ New Quotation","+ 新建报价")}</span>
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

        <div className="quotation-type-primary-grid">
          <Link href="/quotations" className="quotation-type-primary-card library" onClick={()=>setOpen(false)}>
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">01</span>
              <span className="quotation-type-status available">{t("Available","可使用")}</span>
            </div>
            <div className="quotation-type-card-copy">
              <h3>{t("My Quotations","我的报价")}</h3>
              <p>{t("Open and manage saved quotation records.","打开并管理已保存的报价记录。")}</p>
            </div>
            <span className="quotation-type-enter">{t("Open Library →","打开资料库 →")}</span>
          </Link>

          <Link href="/quotations/new" className="quotation-type-primary-card create" onClick={()=>setOpen(false)}>
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">02</span>
              <span className="quotation-type-status available">{t("Available","可使用")}</span>
            </div>
            <div className="quotation-type-card-copy">
              <h3>{t("Outbound","出境旅游")}</h3>
              <p>{t("Create a new outbound tour quotation.","建立新的出境旅游报价。")}</p>
            </div>
            <span className="quotation-type-enter">{t("Create Quotation →","建立报价 →")}</span>
          </Link>
        </div>

        <div className="quotation-type-coming-list" aria-label={t("Coming soon modules","即将推出模块")}>
          <div className="quotation-type-coming-row" aria-disabled="true">
            <div>
              <span className="quotation-type-index">03</span>
              <strong>{t("Inbound","入境旅游")}</strong>
            </div>
            <span className="quotation-type-status">{t("Coming Soon","即将推出")}</span>
          </div>
          <div className="quotation-type-coming-row" aria-disabled="true">
            <div>
              <span className="quotation-type-index">04</span>
              <strong>{t("Island","海岛旅游")}</strong>
            </div>
            <span className="quotation-type-status">{t("Coming Soon","即将推出")}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
    )}
  </>;
}

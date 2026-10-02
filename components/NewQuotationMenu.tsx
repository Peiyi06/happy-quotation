"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function NewQuotationMenu({compact=false}:{compact?:boolean}) {
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    if(!open) return;
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") setOpen(false); };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[open]);

  return <>
    <button
      type="button"
      className={compact?"sidebar-new-quote":"btn primary"}
      onClick={()=>setOpen(true)}
    >
      Quotation
    </button>

    {open && typeof document !== "undefined" && createPortal(
      <div className="quotation-type-overlay" onMouseDown={()=>setOpen(false)}>
      <div className="quotation-type-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="quotation-type-head">
          <div>
            <span className="page-kicker">QUOTATION</span>
            <h2>Quotation Workspace</h2>
            <p>管理现有报价，或选择要建立的报价类型。</p>
          </div>
          <button type="button" className="quotation-type-close" onClick={()=>setOpen(false)} aria-label="Close">×</button>
        </div>

        <div className="quotation-type-grid workspace-module-grid">
          <Link href="/quotations" className="quotation-type-card available" onClick={()=>setOpen(false)}>
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">01</span>
              <span className="quotation-type-status available">Available</span>
            </div>
            <div>
              <h3>My Quotations</h3>
              <p>View and manage existing quotations.</p>
            </div>
            <span className="quotation-type-enter">Open Quotations →</span>
          </Link>

          <Link href="/quotations/new" className="quotation-type-card available" onClick={()=>setOpen(false)}>
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">02</span>
              <span className="quotation-type-status available">Available</span>
            </div>
            <div>
              <h3>Outbound</h3>
              <p>Overseas Tour Quotation</p>
            </div>
            <span className="quotation-type-enter">Create Quotation →</span>
          </Link>

          <div className="quotation-type-card coming" aria-disabled="true">
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">03</span>
              <span className="quotation-type-status">Coming Soon</span>
            </div>
            <div>
              <h3>Inbound</h3>
              <p>Incoming Tour Quotation</p>
            </div>
            <span className="quotation-type-enter muted">Setup</span>
          </div>

          <div className="quotation-type-card coming" aria-disabled="true">
            <div className="quotation-type-card-top">
              <span className="quotation-type-index">04</span>
              <span className="quotation-type-status">Coming Soon</span>
            </div>
            <div>
              <h3>Island</h3>
              <p>Island & Resort Quotation</p>
            </div>
            <span className="quotation-type-enter muted">Setup</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
    )}
  </>;
}

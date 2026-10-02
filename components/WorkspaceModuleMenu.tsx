"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type ModuleItem = {
  title:string;
  description:string;
  href?:string;
  status?:string;
  action?:string;
  coming?:boolean;
};

export default function WorkspaceModuleMenu({
  label,
  kicker,
  title,
  description,
  items,
}:{label:string;kicker:string;title:string;description:string;items:ModuleItem[]}) {
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    if(!open) return;
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") setOpen(false); };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[open]);

  return <>
    <button type="button" className="sidebar-module-btn" onClick={()=>setOpen(true)}>
      <span>{label}</span><span className="sidebar-module-chevron">›</span>
    </button>

    {open && typeof document !== "undefined" && createPortal(
      <div className="quotation-type-overlay" onMouseDown={()=>setOpen(false)}>
        <div className="quotation-type-modal workspace-module-modal" onMouseDown={e=>e.stopPropagation()}>
          <div className="quotation-type-head">
            <div>
              <span className="page-kicker">{kicker}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <button type="button" className="quotation-type-close" onClick={()=>setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className="quotation-type-grid workspace-module-grid">
            {items.map((item,index)=>{
              const inner=<>
                <div className="quotation-type-card-top">
                  <span className="quotation-type-index">{String(index+1).padStart(2,"0")}</span>
                  <span className={"quotation-type-status "+(!item.coming?"available":"")}>{item.status||(!item.coming?"Available":"Coming Soon")}</span>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <span className={"quotation-type-enter "+(item.coming?"muted":"")}>{item.action||(item.coming?"Coming Soon":"Open →")}</span>
              </>;

              return item.href && !item.coming
                ? <Link key={item.title} href={item.href} className="quotation-type-card available" onClick={()=>setOpen(false)}>{inner}</Link>
                : <div key={item.title} className="quotation-type-card coming" aria-disabled="true">{inner}</div>;
            })}
          </div>
        </div>
      </div>,
      document.body
    )}
  </>;
}

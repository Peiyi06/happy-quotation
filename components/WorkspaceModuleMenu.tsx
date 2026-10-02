"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

type Bilingual={en:string;zh:string};
type ModuleItem = {
  title:Bilingual;
  href?:string;
  status?:Bilingual;
  action?:Bilingual;
  coming?:boolean;
};

export default function WorkspaceModuleMenu({
  label,
  kicker,
  title,
  description,
  items,
}:{label:Bilingual;kicker:Bilingual;title:Bilingual;items:ModuleItem[]}) {
  const [open,setOpen]=useState(false);
  const {language}=useWorkspaceLanguage();
  const pick=(value:Bilingual)=>value[language];

  useEffect(()=>{
    if(!open) return;
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") setOpen(false); };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[open]);

  return <>
    <button type="button" className="sidebar-module-btn" onClick={()=>setOpen(true)}>
      <span>{pick(label)}</span><span className="sidebar-module-chevron">›</span>
    </button>

    {open && typeof document !== "undefined" && createPortal(
      <div className="quotation-type-overlay" onMouseDown={()=>setOpen(false)}>
        <div className="quotation-type-modal workspace-module-modal" onMouseDown={e=>e.stopPropagation()}>
          <div className="quotation-type-head">
            <div>
              <span className="page-kicker">{pick(kicker)}</span>
              <h2>{pick(title)}</h2>
            </div>
            <button type="button" className="quotation-type-close" onClick={()=>setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className="quotation-type-grid workspace-module-grid">
            {items.map((item,index)=>{
              const inner=<>
                <div className="quotation-type-card-top">
                  <span className="quotation-type-index">{String(index+1).padStart(2,"0")}</span>
                  <span className={"quotation-type-status "+(!item.coming?"available":"")}>{item.status?pick(item.status):(!item.coming?(language==="zh"?"可使用":"Available"):(language==="zh"?"即将推出":"Coming Soon"))}</span>
                </div>
                <div>
                  <h3>{pick(item.title)}</h3>
                </div>
                <span className={"quotation-type-enter "+(item.coming?"muted":"")}>{item.action?pick(item.action):(item.coming?(language==="zh"?"即将推出":"Coming Soon"):(language==="zh"?"打开 →":"Open →"))}</span>
              </>;

              return item.href && !item.coming
                ? <Link key={item.title.en} href={item.href} className="quotation-type-card available" onClick={()=>setOpen(false)}>{inner}</Link>
                : <div key={item.title.en} className="quotation-type-card coming" aria-disabled="true">{inner}</div>;
            })}
          </div>
        </div>
      </div>,
      document.body
    )}
  </>;
}

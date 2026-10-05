"use client";

import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function QuotationPrintButton({fileName}:{fileName:string}){
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  function print(){
    const previousTitle=document.title;
    document.title=fileName||"Quotation";
    const restore=()=>{
      document.title=previousTitle;
      window.removeEventListener("afterprint",restore);
    };
    window.addEventListener("afterprint",restore);
    window.print();
  }

  return <button className="btn no-print" type="button" onClick={print}>{t("Print / PDF","打印 / PDF")}</button>;
}

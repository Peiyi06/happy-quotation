"use client";

import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function ItineraryExportToolbar(){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  return <div className="itinerary-export-toolbar no-print">
    <button className="btn" type="button" onClick={()=>router.back()}>{t("‹ Back","‹ 返回")}</button>
    <div className="itinerary-export-toolbar-copy">
      <strong>{t("Customer PDF Preview","顾客 PDF 预览")}</strong>
      <span>{t("Review the document before printing or saving as PDF.","确认版面后再打印或另存为 PDF。")}</span>
    </div>
    <button className="btn primary" type="button" onClick={()=>window.print()}>{t("Print / Save PDF","打印 / 保存 PDF")}</button>
  </div>;
}

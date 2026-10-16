"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function ItineraryExportToolbar({fileName}:{fileName:string}){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  useEffect(()=>{
    const previous=document.title;
    document.title=fileName||"Happy Express Travel - Itinerary";
    return ()=>{document.title=previous;};
  },[fileName]);

  return <div className="itinerary-export-toolbar no-print">
    <button className="btn" type="button" onClick={()=>router.back()}>{t("‹ Back","‹ 返回")}</button>
    <div className="itinerary-export-toolbar-copy">
      <strong>{t("Customer PDF Preview","顾客 PDF 预览")}</strong>
      <span>{t("Review pagination and images before printing or saving as PDF.","打印或保存 PDF 前，请先检查分页与图片。")}</span>
    </div>
    <button className="btn primary" type="button" onClick={()=>window.print()}>{t("Print / Save PDF","打印 / 保存 PDF")}</button>
  </div>;
}

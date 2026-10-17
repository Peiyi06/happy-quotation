"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

type CoverImage={
  path:string;
  url:string;
  name:string;
  position:"left"|"center"|"right";
  overlay:"light"|"standard"|"strong";
  brightness:number;
};

type Props={
  fileName:string;
  itineraryId:string;
  basePayload:any;
  initialCover:CoverImage|null;
  autoCoverUrl:string;
  pdfStyle:"basic"|"concept-a"|"concept-b"|"concept-c";
};

export default function ItineraryExportToolbar({fileName,itineraryId,basePayload,initialCover,autoCoverUrl,pdfStyle}:Props){
  const router=useRouter();
  const pathname=usePathname();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const [cover,setCover]=useState<CoverImage|null>(initialCover);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const previous=document.title;
    const nextTitle=fileName||"Happy Express Travel - Itinerary";
    const applyPrintTitle=()=>{document.title=nextTitle;};
    document.title=nextTitle;
    window.addEventListener("beforeprint",applyPrintTitle);
    return ()=>{
      window.removeEventListener("beforeprint",applyPrintTitle);
      document.title=previous;
    };
  },[fileName]);

  const currentPosition=cover?.position||"center";
  const currentOverlay=cover?.overlay||"standard";
  const currentBrightness=Math.min(130,Math.max(70,Number(cover?.brightness)||100));
  const hasManual=Boolean(cover?.url);
  const statusText=useMemo(()=>message||(
    hasManual?t("Manual cover","手动封面"):autoCoverUrl?t("Auto cover","自动封面"):t("Brand fallback","品牌背景")
  ),[message,hasManual,autoCoverUrl,language]);

  function updatePreview(next:CoverImage|null){
    const source=document.getElementById("itinerary-print-source");
    const media=source?.querySelector<HTMLDivElement>("#itinerary-cover-media")||null;
    const root=source?.querySelector<HTMLElement>("#itinerary-cover")||null;
    if(media){
      const url=next?.url||autoCoverUrl||"";
      media.style.backgroundImage=url?"url(\""+url.replace(/"/g,"%22")+"\")":"";
      media.style.backgroundPosition=next?.position||"center";
      media.style.filter="brightness("+String(Math.min(130,Math.max(70,Number(next?.brightness)||100))/100)+")";
    }
    if(root) root.dataset.overlay=next?.overlay||"standard";
    window.dispatchEvent(new Event("itinerary-preview-refresh"));
  }

  async function persistCover(next:CoverImage|null){
    const payload={
      ...basePayload,
      itinerary_data:{
        ...(basePayload?.itinerary_data||{}),
        coverImage:next
      }
    };
    const res=await fetch("/api/internal-itineraries",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:itineraryId,payload})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data?.ok) throw new Error(data?.error||t("Unable to save cover.","无法保存封面。"));
  }

  async function deleteStored(path?:string){
    if(!path) return;
    const form=new FormData();
    form.set("action","delete");
    form.set("path",path);
    await fetch("/api/internal-itinerary-images",{method:"POST",body:form}).catch(()=>null);
  }

  async function uploadCover(file:File|null){
    if(!file) return;
    setSaving(true); setMessage(t("Uploading cover...","正在上传封面..."));
    try{
      const form=new FormData();
      form.set("action","upload");
      form.set("file",file);
      const res=await fetch("/api/internal-itinerary-images",{method:"POST",body:form});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok) throw new Error(data?.error||t("Unable to upload cover.","无法上传封面。"));

      const next:CoverImage={
        path:data.path||"",
        url:data.url||"",
        name:data.name||file.name,
        position:cover?.position||"center",
        overlay:cover?.overlay||"standard",
        brightness:Math.min(130,Math.max(70,Number(cover?.brightness)||100))
      };
      const previous=cover;
      const previousPath=cover?.path;
      setCover(next);
      updatePreview(next);
      try{
        await persistCover(next);
      }catch(error){
        setCover(previous);
        updatePreview(previous);
        throw error;
      }
      if(previousPath&&previousPath!==next.path) await deleteStored(previousPath);
      setMessage(t("Cover saved","封面已保存"));
      router.refresh();
    }catch(error:any){
      setMessage(error?.message||t("Unable to save cover.","无法保存封面。"));
    }finally{setSaving(false);}
  }

  async function patchCover(patch:Partial<CoverImage>){
    if(!cover) return;
    const previous=cover;
    const next={...cover,...patch};
    setCover(next);
    updatePreview(next);
    setSaving(true);setMessage(t("Saving...","保存中..."));
    try{
      await persistCover(next);
      setMessage(t("Cover saved","封面已保存"));
      router.refresh();
    }catch(error:any){
      setCover(previous);
      updatePreview(previous);
      setMessage(error?.message||t("Unable to save cover.","无法保存封面。"));
    }finally{setSaving(false);}
  }

  async function removeCover(){
    if(!cover) return;
    const previous=cover;
    setSaving(true);setMessage(t("Removing cover...","正在移除封面..."));
    try{
      await persistCover(null);
      setCover(null);
      updatePreview(null);
      await deleteStored(previous.path);
      setMessage(t("Auto cover restored","已恢复自动封面"));
      router.refresh();
    }catch(error:any){
      setMessage(error?.message||t("Unable to remove cover.","无法移除封面。"));
    }finally{setSaving(false);}
  }

  function selectPdfStyle(next:Props["pdfStyle"]){
    if(next===pdfStyle) return;
    const params=new URLSearchParams(window.location.search);
    if(next==="basic") params.delete("pdfStyle");
    else params.set("pdfStyle",next);
    const query=params.toString();
    router.replace(pathname+(query?"?"+query:""),{scroll:false});
  }

  const styleOptions:Array<{id:Props["pdfStyle"];en:string;zh:string;status:"locked"|"draft"}>=[
    {id:"basic",en:"Basic",zh:"基础版",status:"locked"},
    {id:"concept-a",en:"Concept A",zh:"方案 A",status:"draft"},
    {id:"concept-b",en:"Concept B",zh:"方案 B",status:"draft"},
    {id:"concept-c",en:"Concept C",zh:"方案 C",status:"draft"}
  ];

  function printWithFoundationName(){
    updatePreview(cover);
    const nextTitle=fileName||"Happy Express Travel - Itinerary";
    document.title=nextTitle;
    const restoreTitle=()=>{
      // Keep export page title aligned with the PDF naming foundation after printing.
      document.title=nextTitle;
      window.removeEventListener("afterprint",restoreTitle);
    };
    window.addEventListener("afterprint",restoreTitle);
    requestAnimationFrame(()=>{
      document.title=nextTitle;
      requestAnimationFrame(()=>window.print());
    });
  }

  return <div className="itinerary-export-toolbar-wrap no-print">
    <div className="itinerary-export-toolbar">
      <button className="btn" type="button" onClick={()=>router.back()}>{t("‹ Back","‹ 返回")}</button>
      <div className="itinerary-export-toolbar-copy">
        <strong>{t("Customer PDF Preview","顾客 PDF 预览")}</strong>
        <span>{t("Review the cover, pagination and images before printing.","打印前可直接调整封面并检查分页与图片。")}</span>
      </div>
      <button
        className="btn primary"
        type="button"
        disabled={saving}
        onClick={printWithFoundationName}
      >{saving?t("Saving...","保存中..."):t("Print / Save PDF","打印 / 保存 PDF")}</button>
    </div>

    <div className="itinerary-export-style-row">
      <div className="itinerary-export-style-copy">
        <strong>{t("PDF Style","PDF 版式")}</strong>
        <span>{t("Basic is locked. Concepts A–C are reserved for visual design trials.","基础版已锁定；方案 A–C 用于接下来的视觉设计测试。")}</span>
      </div>
      <div className="itinerary-export-style-switch" role="tablist" aria-label={t("PDF style","PDF 版式")}>
        {styleOptions.map(option=><button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={pdfStyle===option.id}
          className={"itinerary-export-style-option "+(pdfStyle===option.id?"active":"")}
          onClick={()=>selectPdfStyle(option.id)}
        >
          <span>{t(option.en,option.zh)}</span>
          <small>{option.status==="locked"?t("Locked","已锁定"):t("Draft","草稿")}</small>
        </button>)}
      </div>
    </div>

    <div className="itinerary-export-cover-controls">
      <div className="itinerary-export-cover-status">
        <strong>{t("Hero Cover","封面图片")}</strong>
        <span>{statusText}</span>
      </div>

      <label className={"btn itinerary-export-cover-upload "+(saving?"disabled":"")}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          disabled={saving}
          onChange={e=>{const file=e.target.files?.[0]||null;void uploadCover(file);e.currentTarget.value="";}}
        />
        {hasManual?t("Replace Image","更换图片"):t("Upload Cover","上传封面")}
      </label>

      <label className="itinerary-export-cover-select">
        <span>{t("Position","位置")}</span>
        <select value={currentPosition} disabled={!hasManual||saving} onChange={e=>void patchCover({position:e.target.value as CoverImage["position"]})}>
          <option value="left">{t("Left","左")}</option>
          <option value="center">{t("Center","中")}</option>
          <option value="right">{t("Right","右")}</option>
        </select>
      </label>

      <label className="itinerary-export-cover-brightness">
        <span>{t("Brightness","亮度")} <b>{currentBrightness}%</b></span>
        <input
          type="range"
          min="70"
          max="130"
          step="5"
          value={currentBrightness}
          disabled={!hasManual||saving}
          onChange={e=>{
            if(!cover) return;
            const next={...cover,brightness:Number(e.target.value)};
            setCover(next);
            updatePreview(next);
          }}
          onMouseUp={e=>void patchCover({brightness:Number((e.currentTarget as HTMLInputElement).value)})}
          onTouchEnd={e=>void patchCover({brightness:Number((e.currentTarget as HTMLInputElement).value)})}
          aria-label={t("Hero cover brightness","封面背景亮度")}
        />
      </label>
      <label className="itinerary-export-cover-select">
        <span>{t("Overlay","遮罩")}</span>
        <select value={currentOverlay} disabled={!hasManual||saving} onChange={e=>void patchCover({overlay:e.target.value as CoverImage["overlay"]})}>
          <option value="light">{t("Light","浅")}</option>
          <option value="standard">{t("Standard","标准")}</option>
          <option value="strong">{t("Strong","深")}</option>
        </select>
      </label>

      {hasManual&&<button className="btn itinerary-export-cover-remove" type="button" disabled={saving} onClick={()=>void removeCover()}>{t("Remove","移除")}</button>}
    </div>
  </div>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
};

export default function ItineraryExportToolbar({fileName,itineraryId,basePayload,initialCover,autoCoverUrl}:Props){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const [cover,setCover]=useState<CoverImage|null>(initialCover);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const previous=document.title;
    document.title=fileName||"Happy Express Travel - Itinerary";
    return ()=>{document.title=previous;};
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
        onClick={()=>{updatePreview(cover);requestAnimationFrame(()=>window.print());}}
      >{saving?t("Saving...","保存中..."):t("Print / Save PDF","打印 / 保存 PDF")}</button>
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

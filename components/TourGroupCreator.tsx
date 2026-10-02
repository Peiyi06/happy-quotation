"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function TourGroupCreator(){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setSaving(true); setMessage("");
    const fd=new FormData(e.currentTarget);
    const res=await fetch("/api/internal-groups",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      name:fd.get("name"),destination:fd.get("destination"),business_type:fd.get("business_type"),description:fd.get("description")
    })});
    const data=await res.json();
    if(!res.ok){setMessage(data.error||t("Unable to save","无法保存"));setSaving(false);return;}
    setSaving(false); setOpen(false); router.refresh();
  }

  return <>
    <div className="page-head workspace-flat-head tour-groups-head">
      <div>
        <h1>{t("Tour Groups","旅游团")}</h1>
        <p>{t("Group similar tours together to reuse past quotations and compare different pax versions.","把相同类型的团归在一起，方便复制旧报价和比较不同人数版本。")}</p>
      </div>
      <button className={"btn tour-group-create-trigger "+(open?"":"primary")} type="button" onClick={()=>setOpen(v=>!v)}>
        {open?t("Close","关闭"):t("＋ Add Tour Group","＋ 新增旅游团")}
      </button>
    </div>

    {open&&<section className="panel tour-group-create-panel">
      <div className="panel-head">
        <div>
          <h2>{t("Create Tour Group","建立旅游团")}</h2>
          <p className="panel-subtext">{t("Create a reusable group for similar tour versions and quotations.","建立可重复使用的团组，方便管理相似行程和报价版本。")}</p>
        </div>
      </div>
      <form className="tour-group-create-form" onSubmit={submit}>
        <label className="field"><span>{t("Group Name","团组名称")}</span><input name="name" required placeholder={t("e.g. Jiangxi 8D7N","例如：江西 8D7N")} /></label>
        <label className="field"><span>{t("Destination","目的地")}</span><input name="destination" placeholder={t("China / Japan / Thailand","中国 / 日本 / 泰国")} /></label>
        <label className="field"><span>{t("Business Type","团型")}</span><input name="business_type" placeholder={t("Private / Corporate / Family","私人团 / 企业团 / 家庭团")} /></label>
        <label className="field tour-group-description-field"><span>{t("Description","说明")}</span><input name="description" placeholder={t("Notes","备注")} /></label>
        <div className="tour-group-create-actions">
          <button className="btn" type="button" onClick={()=>setOpen(false)}>{t("Cancel","取消")}</button>
          <button className="btn primary" disabled={saving}>{saving?t("Saving...","保存中..."):t("Save Tour Group","保存旅游团")}</button>
        </div>
      </form>
      {message&&<div className="auth-message">{message}</div>}
    </section>}
  </>;
}

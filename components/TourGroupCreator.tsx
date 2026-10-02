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

  return <div className="panel compact-panel">
    {!open?<button className="btn primary" onClick={()=>setOpen(true)}>{t("＋ Add Tour Group","＋ 新增旅游团")}</button>:
    <form className="inline-form" onSubmit={submit}>
      <input name="name" required placeholder={t("e.g. Jiangxi 8D7N","例如：江西 8D7N")} />
      <input name="destination" placeholder={t("China / Japan / Thailand","中国 / 日本 / 泰国")} />
      <input name="business_type" placeholder={t("Private / Corporate / Family","私人团 / 企业团 / 家庭团")} />
      <input name="description" placeholder={t("Notes","备注")} />
      <button className="btn primary" disabled={saving}>{saving?t("Saving...","保存中..."):t("Save","保存")}</button>
      <button className="btn" type="button" onClick={()=>setOpen(false)}>{t("Cancel","取消")}</button>
    </form>}
    {message&&<div className="auth-message">{message}</div>}
  </div>;
}

"use client";

import Link from "next/link";
import {useState} from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";
import styles from "./InquiryRows.module.css";

const statusLabels:Record<string,{en:string;zh:string}>={
  new:{en:"New",zh:"新案件"},
  in_progress:{en:"In Progress",zh:"处理中"},
  waiting_quote:{en:"In Progress",zh:"处理中"},
  under_review:{en:"Under Review",zh:"审核中"},
  revision_required:{en:"Revision Required",zh:"需要修改"},
  ready:{en:"Ready",zh:"已就绪"},
  ready_customer:{en:"Ready",zh:"已就绪"},
  itinerary_ready:{en:"Itinerary Ready",zh:"行程已完成"},
  closed:{en:"Closed",zh:"已关闭"}
};

function ageLabel(value:string,language:"en"|"zh"){
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  if(!value) return t("Updated recently","最近更新");
  const time=new Date(value).getTime();
  if(!Number.isFinite(time)) return t("Updated recently","最近更新");
  const days=Math.max(0,Math.floor((Date.now()-time)/86400000));
  if(days===0) return t("Updated today","今天更新");
  if(days>=5) return language==="zh"?`等待 ${days} 天 · 请注意`:`Waiting ${days}d · Attention`;
  return language==="zh"?`等待 ${days} 天`:`Waiting ${days}d`;
}

export default function InquiryRows({
  items,
  isManager,
  returnTo
}:{
  items:any[];
  isManager:boolean;
  returnTo:string;
}){
  const [openId,setOpenId]=useState<string|number|null>(null);
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  return <div className={styles.list}>
    {items.map((item:any)=>{
      const isOpen=openId===item.id;
      const activity=ageLabel(item.updated_at||item.created_at,language);
      const status=item.status==="revision_required"&&!isManager
        ? t("Re-quote","重新报价")
        : statusLabels[item.status]
          ? statusLabels[item.status][language]
          : item.status;

      return <div className={`${styles.row} ${isOpen?styles.open:""}`} key={item.id}>
        <button
          type="button"
          className={styles.summary}
          aria-expanded={isOpen}
          onClick={()=>setOpenId(isOpen?null:item.id)}
        >
          <span className={styles.primary}>
            <small>{t("Inquiry","询价")}</small>
            <strong>{item.inquiry_no}</strong>
          </span>
          <span className={styles.customer}>
            <small>{t("Customer","客户")}</small>
            <strong>{item.customer_name||"—"}</strong>
          </span>
          <span className={styles.destination}>
            <small>{t("Destination","目的地")}</small>
            <strong>{item.destination||"—"}</strong>
          </span>
          <span className={styles.travelDate}>
            <small>{t("Travel Date","旅游日期")}</small>
            <strong>{item.travel_start_date||"—"}{item.travel_end_date?" → "+item.travel_end_date:""}</strong>
          </span>
          <span className={styles.state}>
            <span className={"status status-"+item.status}>{status}</span>
          </span>
          <span className={styles.chevron} aria-hidden="true">{isOpen?"⌃":"⌄"}</span>
        </button>

        {isOpen&&<div className={styles.details}>
          <div><small>{t("Pax","人数")}</small><strong>{item.pax||"—"}</strong></div>
          <div><small>{t("Sales","销售")}</small><strong>{item.sales_owner_name||"—"}</strong></div>
          <div><small>{t("Operation","运营")}</small><strong>{item.operation_assignee_name||t("Unassigned","未分配")}</strong></div>
          <div><small>{t("Activity","动态")}</small><strong className={(activity.includes("Attention")||activity.includes("请注意"))?styles.attention:""}>{activity}</strong></div>
          <Link className={styles.openAction} href={"/inquiries/"+item.id+"?returnTo="+encodeURIComponent(returnTo)}>
            {t("Open Inquiry →","打开询价 →")}
          </Link>
        </div>}
      </div>;
    })}
  </div>;
}

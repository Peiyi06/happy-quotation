"use client";

import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function InquiryFilters({q,status}:{q:string;status:string}){
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  return <form className="filter-bar">
    <input
      name="q"
      defaultValue={q}
      placeholder={t("Search inquiry, customer or destination","搜索询价、客户或目的地")}
    />
    <select name="status" defaultValue={status}>
      <option value="">{t("All Status","全部状态")}</option>
      <option value="new">{t("New","新案件")}</option>
      <option value="in_progress">{t("In Progress","处理中")}</option>
      <option value="under_review">{t("Under Review","审核中")}</option>
      <option value="revision_required">{t("Revision Required","需要修改")}</option>
      <option value="ready">{t("Ready","已就绪")}</option>
      <option value="itinerary_ready">{t("Itinerary Ready","行程已完成")}</option>
      <option value="closed">{t("Closed","已关闭")}</option>
    </select>
    <button className="btn">{t("Filter","筛选")}</button>
  </form>;
}

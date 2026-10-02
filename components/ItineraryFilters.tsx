"use client";

import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function ItineraryFilters({q,status}:{q:string;status:string}){
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  return <form className="filter-bar">
    <input
      name="q"
      defaultValue={q}
      placeholder={t("Search itinerary, customer or destination","搜索行程、客户或目的地")}
    />
    <select name="status" defaultValue={status}>
      <option value="">{t("All Status","全部状态")}</option>
      <option value="draft">{t("Draft","草稿")}</option>
      <option value="ready">{t("Ready","已就绪")}</option>
      <option value="confirmed">{t("Confirmed","已确认")}</option>
      <option value="archived">{t("Archived","已归档")}</option>
    </select>
    <button className="btn">{t("Filter","筛选")}</button>
  </form>;
}

"use client";

import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function QuotationFilters({
  q,destination,status
}:{q:string;destination:string;status:string}){
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;

  return <form className="filter-bar">
    <input name="q" defaultValue={q} placeholder={t("Search quotation, customer or destination","搜索报价、客户或目的地")} />
    <input name="destination" defaultValue={destination} placeholder={t("Destination","目的地")} />
    <select name="status" defaultValue={status}>
      <option value="">{t("All Status","全部状态")}</option>
      <option value="draft">{t("Draft","草稿")}</option>
      <option value="under_review">{t("Under Review","审核中")}</option>
      <option value="revision_required">{t("Revision Required","需要修改")}</option>
      <option value="ready">{t("Ready","已就绪")}</option>
      <option value="sent">{t("Sent","已发送")}</option>
      <option value="revised">{t("Revised","已修改")}</option>
      <option value="confirmed">{t("Confirmed","已确认")}</option>
      <option value="lost">{t("Lost","未成交")}</option>
      <option value="archived">{t("Archived","已归档")}</option>
    </select>
    <button className="btn">{t("Filter","筛选")}</button>
  </form>;
}

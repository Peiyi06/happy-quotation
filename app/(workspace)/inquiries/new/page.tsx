import Link from "next/link";
import InquiryEditor from "@/components/InquiryEditor";
import { internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";

export default async function NewInquiryPage(){
  const user=await internalUser();
  return <div className="new-inquiry-template">
    <div className="page-head new-inquiry-head">
      <div className="new-inquiry-title-block">
        <h1><UiText en="New Inquiry" zh="新建询价" /></h1>
        <p><UiText en="Create the customer case record used by Operation, Itinerary and Quotation." zh="建立客户案件主档案，后续 Operation / Itinerary / Quotation 共用。" /></p>
      </div>
      <div className="detail-actions new-inquiry-head-actions">
        <Link className="btn new-inquiry-back-action" href="/inquiries"><UiText en="‹ Back" zh="‹ 返回" /></Link>
      </div>
    </div>
    <InquiryEditor currentStaffName={user?.name||""}/>
  </div>;
}

import InquiryEditor from "@/components/InquiryEditor";
import { internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";

export default async function NewInquiryPage(){
  const user=await internalUser();
  return <div>
    <div className="page-head page-hero-header">
      <div><span className="page-kicker"><UiText en="NEW INQUIRY" zh="新询价" /></span><h1><UiText en="New Inquiry" zh="新建询价" /></h1><p><UiText en="Create the customer case record used by Operation, Itinerary and Quotation." zh="建立客户案件主档案，后续 Operation / Itinerary / Quotation 共用。" /></p></div>
    </div>
    <InquiryEditor currentStaffName={user?.name||""}/>
  </div>;
}

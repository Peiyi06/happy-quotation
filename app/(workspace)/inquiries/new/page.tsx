import InquiryEditor from "@/components/InquiryEditor";
import { internalUser } from "@/lib/internalSession";

export default async function NewInquiryPage(){
  const user=await internalUser();
  return <div>
    <div className="page-head">
      <div><span className="page-kicker">NEW INQUIRY</span><h1>New Inquiry</h1><p>建立客户案件主档案，后续 Operation / Itinerary / Quotation 共用。</p></div>
    </div>
    <InquiryEditor currentStaffName={user?.name||""}/>
  </div>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb,internalToken,internalUser } from "@/lib/internalSession";
import OperationReviewEditor from "@/components/OperationReviewEditor";
import InquiryWorkflowAction from "@/components/InquiryWorkflowAction";

export default async function OperationReviewPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  const user=await internalUser();
  if(!token||!user) notFound();

  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const canEdit=user.username.toLowerCase()==="long" || data.operation_assignee_id===user.id;
  const {data:linkedQuoteData}=await db.rpc("staff_list_quotes_for_inquiry",{p_token:token,p_inquiry_id:id});
  const linkedQuotes=Array.isArray(linkedQuoteData)?linkedQuoteData:[];

  return <div>
    <div className="page-head inquiry-detail-head">
      <div>
        <span className="page-kicker">OPERATION REVIEW</span>
        <h1>{data.inquiry_no}</h1>
        <p>{data.customer_name||"Customer"} · {data.destination||"Destination"}</p>
      </div>
      <div className="inquiry-head-right">
        <InquiryWorkflowAction
          inquiryId={id}
          mainStatus={data.status||"new"}
          supplierStatus={data.supplier_inquiry_status||"draft"}
          canAdvance={Boolean(user&&(user.username==="long"||user.id===data.operation_assignee_id))}
          canUpdateStatus={false}
          hasQuotation={linkedQuotes.length>0}
          viewerMode={user.role==="manager"||user.username.toLowerCase()==="long"?"management":"operation"}
          firstQuotationId={linkedQuotes[0]?.id}
        />
        <div className="detail-actions">
          <Link className="btn" href={"/inquiries/"+id}>← Inquiry</Link>
        </div>
      </div>
    </div>
    <OperationReviewEditor inquiry={data} canEdit={canEdit}/>
  </div>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb,internalToken,internalUser } from "@/lib/internalSession";
import OperationReviewEditor from "@/components/OperationReviewEditor";
import {UiText} from "@/components/WorkspaceLanguage";

export default async function OperationReviewPage({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{returnTo?:string}>;
}){
  const {id}=await params;
  const sp=await searchParams;
  const token=await internalToken();
  const user=await internalUser();
  if(!token||!user) notFound();

  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const canEdit=user.username.toLowerCase()==="long" || data.operation_assignee_id===user.id;
  const {data:linkedQuoteData}=await db.rpc("staff_list_quotes_for_inquiry",{p_token:token,p_inquiry_id:id});
  const linkedQuotes=Array.isArray(linkedQuoteData)?linkedQuoteData:[];
  const rawReturnTo=String(sp.returnTo||"");
  const returnTo=rawReturnTo.startsWith("/")&&!rawReturnTo.startsWith("//")?rawReturnTo:"/inquiries";
  const returnParam=encodeURIComponent(returnTo);
  const inquiryHref="/inquiries/"+id+"?returnTo="+returnParam;

  return <div className="operation-review-template">
    <div className="page-head inquiry-detail-head operation-review-head">
      <div className="operation-review-title-block">
        <h1>{data.customer_name||data.inquiry_no}</h1>
        <div className="operation-review-meta-line">
          <span>{data.inquiry_no}</span>
          <span className={"status operation-review-status status-"+String(data.status||"new")}>{data.status==="under_review"?<UiText en="Under Review" zh="审核中" />:data.status==="revision_required"?<UiText en="Revision Required" zh="需要修改" />:data.status==="ready"||data.status==="ready_customer"?<UiText en="Ready" zh="已就绪" />:data.status==="in_progress"||data.status==="waiting_quote"?<UiText en="In Progress" zh="处理中" />:data.status==="new"?<UiText en="New" zh="新案件" />:data.status||<UiText en="New" zh="新案件" />}</span>
          <span>{data.destination||"—"}</span>
        </div>
      </div>
      <div className="detail-actions">
        <Link className="btn operation-review-back" href={inquiryHref}><UiText en="← Inquiry" zh="← 询价" /></Link>
      </div>
    </div>
    <OperationReviewEditor inquiry={data} canEdit={canEdit} returnTo={returnTo}/>
  </div>;
}

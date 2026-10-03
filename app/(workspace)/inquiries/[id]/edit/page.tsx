import Link from "next/link";
import { notFound } from "next/navigation";
import InquiryEditor from "@/components/InquiryEditor";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";

export default async function EditInquiryPage({
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
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const rawReturnTo=String(sp.returnTo||"");
  const returnTo=rawReturnTo.startsWith("/")&&!rawReturnTo.startsWith("//")?rawReturnTo:"/inquiries";
  const backHref="/inquiries/"+id+"?returnTo="+encodeURIComponent(returnTo);

  return <div className="edit-inquiry-template">
    <div className="page-head edit-inquiry-head">
      <div className="edit-inquiry-title-block">
        <h1><UiText en="Edit Inquiry" zh="编辑询价" /></h1>
        <p>
          <strong>{data.inquiry_no}</strong>
          <span> · </span>
          <UiText en="Update customer requirements and case information. Status changes remain in Inquiry Detail." zh="更新客户需求与案件资料；Status 继续在 Inquiry Detail 操作。" />
        </p>
      </div>
      <div className="detail-actions edit-inquiry-head-actions">
        <Link className="btn edit-inquiry-back-action" href={backHref}><UiText en="‹ Back" zh="‹ 返回" /></Link>
      </div>
    </div>

    <InquiryEditor initialInquiry={data} currentStaffName={user?.name||""} backHref={backHref}/>
  </div>;
}

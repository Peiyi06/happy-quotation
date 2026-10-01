import { notFound } from "next/navigation";
import InquiryEditor from "@/components/InquiryEditor";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

export default async function EditInquiryPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  const user=await internalUser();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();
  return <div>
    <div className="page-head"><div><span className="page-kicker">EDIT INQUIRY</span><h1>{data.inquiry_no}</h1><p>更新客户需求与案件资料；Status 请在 Inquiry Detail 右上角操作。</p></div></div>
    <InquiryEditor initialInquiry={data} currentStaffName={user?.name||""}/>
  </div>;
}

import { notFound } from "next/navigation";
import { internalDb,internalToken,internalUser } from "@/lib/internalSession";
import OperationReviewEditor from "@/components/OperationReviewEditor";

export default async function OperationReviewPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  const user=await internalUser();
  if(!token||!user) notFound();

  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const canEdit=user.username.toLowerCase()==="long" || data.operation_assignee_id===user.id;

  return <div>
    <div className="page-head">
      <div>
        <span className="page-kicker">OPERATION REVIEW</span>
        <h1>{data.inquiry_no}</h1>
        <p>{data.customer_name||"Customer"} · {data.destination||"Destination"}</p>
      </div>
    </div>
    <OperationReviewEditor inquiry={data} canEdit={canEdit}/>
  </div>;
}

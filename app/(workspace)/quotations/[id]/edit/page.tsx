import { notFound, redirect } from "next/navigation";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import QuotationCalculator from "@/components/QuotationCalculator";

export default async function EditQuotationPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const user=await internalUser();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_quote",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();
  const editableStatuses=["draft","revision_required"];
  if(!editableStatuses.includes(String(data.status||"draft"))){
    redirect("/quotations/"+id);
  }
  return <QuotationCalculator workspaceMode quotationId={id} initialQuotation={data} currentStaffId={user?.id||""} currentStaffName={user?.name||""} />;
}

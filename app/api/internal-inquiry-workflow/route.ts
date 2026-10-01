import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});

  const body=await request.json().catch(()=>({}));
  const id=String(body?.id||"");
  const supplierStatus=String(body?.supplierStatus||"");
  if(!id||!["draft","ready","waiting_quote","quote_received"].includes(supplierStatus)){
    return NextResponse.json({error:"Invalid workflow update"},{status:400});
  }

  const db=internalDb();
  const {data:inquiry,error:getError}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(getError||!inquiry?.id) return NextResponse.json({error:getError?.message||"Inquiry not found"},{status:404});

  const {data,error}=await db.rpc("staff_save_operation_review",{
    p_token:token,
    p_id:id,
    p_review:inquiry.operation_review||{},
    p_supplier:inquiry.supplier_inquiry||{},
    p_supplier_status:supplierStatus
  });

  if(error||!data?.ok){
    return NextResponse.json({error:data?.error||error?.message||"Unable to update workflow"},{status:400});
  }
  return NextResponse.json(data);
}

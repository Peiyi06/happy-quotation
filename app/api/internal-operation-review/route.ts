import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});

  const body=await request.json();
  if(!body?.id) return NextResponse.json({error:"Inquiry ID is required"},{status:400});

  const db=internalDb();
  const {data,error}=await db.rpc("staff_save_operation_review",{
    p_token:token,
    p_id:body.id,
    p_review:body.review||{},
    p_supplier:body.supplier||{},
    p_supplier_status:body.supplierStatus||"draft"
  });

  if(error||!data?.ok){
    return NextResponse.json({error:data?.error||error?.message||"Unable to save Operation Review"},{status:400});
  }
  return NextResponse.json(data);
}

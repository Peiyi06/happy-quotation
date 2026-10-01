import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});

  const body=await request.json().catch(()=>({}));
  const id=String(body?.id||"");
  const supplierStatus=String(body?.supplierStatus||"");
  const mainStatus=String(body?.mainStatus||"");
  const event=String(body?.event||"");
  if(!id) return NextResponse.json({error:"Inquiry ID is required"},{status:400});

  const db=internalDb();
  if(event==="supplier_form_exported"){
    const {data,error}=await db.rpc("staff_mark_supplier_form_exported",{p_token:token,p_id:id});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to record supplier form export"},{status:400});
    return NextResponse.json(data);
  }
  const hasSupplierUpdate=Boolean(supplierStatus);
  const hasMainUpdate=Boolean(mainStatus);
  if(hasSupplierUpdate&&!["draft","ready","waiting_quote","quote_received"].includes(supplierStatus)){
    return NextResponse.json({error:"Invalid supplier workflow update"},{status:400});
  }
  if(hasMainUpdate&&!["new","in_progress","waiting_quote","ready_customer","closed"].includes(mainStatus)){
    return NextResponse.json({error:"Invalid Inquiry status"},{status:400});
  }
  if(!hasSupplierUpdate&&!hasMainUpdate){
    return NextResponse.json({error:"No workflow update supplied"},{status:400});
  }

  const {data:inquiry,error:getError}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(getError||!inquiry?.id) return NextResponse.json({error:getError?.message||"Inquiry not found"},{status:404});

  if(hasMainUpdate){
    const {data,error}=await db.rpc("staff_update_inquiry_status",{
      p_token:token,
      p_id:id,
      p_status:mainStatus
    });
    if(error||!data?.ok){
      return NextResponse.json({error:data?.error||error?.message||"Unable to update Inquiry status"},{status:400});
    }
    return NextResponse.json(data);
  }

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

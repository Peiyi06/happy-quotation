import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_quote",{p_token:token,p_id:id});
  if(error||!data?.id) return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json(data);
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  const payload=await request.json();
  const db=internalDb();
  const {data:existing,error:existingError}=await db.rpc("staff_get_quote",{p_token:token,p_id:id});
  if(existingError||!existing?.id) return NextResponse.json({error:"Not found"},{status:404});
  const currentStatus=String(existing.status||"draft");
  if(!["draft","revision_required"].includes(currentStatus)){
    return NextResponse.json({
      error:"Quotation is locked while it is under review or finalized. Management must Request Changes before editing.",
      code:"QUOTATION_LOCKED",
      status:currentStatus
    },{status:423});
  }
  const {data,error}=await db.rpc("staff_save_quote",{p_token:token,p_payload:payload,p_id:id});
  if(error||!data?.ok) return NextResponse.json({error:error?.message||data?.error||"Save failed"},{status:400});
  return NextResponse.json(data);
}

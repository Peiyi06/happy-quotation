import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function GET() {
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=internalDb();
  const {data,error}=await db.rpc("staff_list_quotes",{p_token:token});
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({quotes:Array.isArray(data)?data:[]});
}

export async function POST(request:Request) {
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  const db=internalDb();

  if(body.id){
    const {data:existing,error:existingError}=await db.rpc("staff_get_quote",{p_token:token,p_id:body.id});
    if(existingError||!existing?.id) return NextResponse.json({error:"Quotation not found"},{status:404});
    const currentStatus=String(existing.status||"draft");
    if(!["draft","revision_required"].includes(currentStatus)){
      return NextResponse.json({
        error:"Quotation is locked while it is under review or finalized. Management must Request Changes before editing.",
        code:"QUOTATION_LOCKED",
        status:currentStatus
      },{status:423});
    }
  }
  const {data,error}=await db.rpc("staff_save_quote",{
    p_token:token,
    p_payload:body.payload||{},
    p_id:body.id||null
  });
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to save quotation"},{status:400});
  return NextResponse.json(data);
}

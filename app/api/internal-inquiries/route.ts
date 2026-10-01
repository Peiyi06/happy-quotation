import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function GET(){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=internalDb();
  const {data,error}=await db.rpc("staff_list_inquiries",{p_token:token});
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({inquiries:Array.isArray(data)?data:[]});
}

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_save_inquiry",{
    p_token:token,
    p_payload:body.payload||{},
    p_id:body.id||null
  });
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to save inquiry"},{status:400});
  return NextResponse.json(data);
}

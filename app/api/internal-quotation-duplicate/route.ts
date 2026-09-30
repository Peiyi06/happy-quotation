import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_duplicate_quote",{p_token:token,p_id:body.id});
  if(error||!data?.ok){
    return NextResponse.json({error:data?.error||error?.message||"Unable to duplicate quotation"},{status:400});
  }
  return NextResponse.json(data);
}

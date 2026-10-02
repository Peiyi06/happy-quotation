import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function GET(){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=internalDb();
  const {data,error}=await db.rpc("staff_list_products",{p_token:token});
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({products:Array.isArray(data)?data:[]});
}

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const payload=await request.json();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_create_product",{p_token:token,p_payload:payload});
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to create product"},{status:400});
  return NextResponse.json(data);
}

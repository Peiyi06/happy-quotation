import { NextResponse } from "next/server";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

export async function GET() {
  const user=await internalUser();
  const token=await internalToken();
  if(!user||user.role!=="manager"||!token) return NextResponse.json({error:"Manager only"},{status:403});
  const db=internalDb();
  const {data,error}=await db.rpc("staff_list_accounts",{p_token:token});
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({accounts:Array.isArray(data)?data:[]});
}

export async function POST(request:Request) {
  const user=await internalUser();
  const token=await internalToken();
  if(!user||user.role!=="manager"||!token) return NextResponse.json({error:"Manager only"},{status:403});
  const body=await request.json();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_create_account",{
    p_token:token,
    p_username:String(body.username||"").trim().toLowerCase(),
    p_name:String(body.name||"").trim(),
    p_password:String(body.password||""),
    p_role:body.role==="manager"?"manager":"sales"
  });
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to create account"},{status:400});
  return NextResponse.json(data);
}

export async function PATCH(request:Request) {
  const user=await internalUser();
  const token=await internalToken();
  if(!user||user.role!=="manager"||!token) return NextResponse.json({error:"Manager only"},{status:403});
  const body=await request.json();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_update_account",{
    p_token:token,
    p_id:body.id,
    p_name:String(body.name||""),
    p_role:body.role==="manager"?"manager":"sales",
    p_active:body.active!==false,
    p_password:body.password?String(body.password):null
  });
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to update account"},{status:400});
  return NextResponse.json(data);
}

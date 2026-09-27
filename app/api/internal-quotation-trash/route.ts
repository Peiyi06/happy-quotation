import { NextResponse } from "next/server";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  const db=internalDb();

  if(body.action==="delete"){
    const {data,error}=await db.rpc("staff_soft_delete_quote",{p_token:token,p_id:body.id});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to delete"},{status:400});
    return NextResponse.json(data);
  }

  if(body.action==="restore"){
    const user=await internalUser();
    if(!user||user.role!=="manager") return NextResponse.json({error:"Manager only"},{status:403});
    const {data,error}=await db.rpc("staff_restore_quote",{p_token:token,p_id:body.id});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to restore"},{status:400});
    return NextResponse.json(data);
  }

  return NextResponse.json({error:"Invalid action"},{status:400});
}

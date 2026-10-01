import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});

  const body=await request.json().catch(()=>({}));
  const id=String(body?.id||"");
  const action=String(body?.action||"");
  const note=String(body?.note||"");
  if(!id) return NextResponse.json({error:"Quotation ID is required"},{status:400});

  const db=internalDb();

  if(action==="submit"){
    const {data,error}=await db.rpc("staff_submit_quote_for_review",{p_token:token,p_id:id});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to submit quotation"},{status:400});
    return NextResponse.json(data);
  }

  if(action==="approve"||action==="request_changes"){
    const {data,error}=await db.rpc("staff_review_quote",{
      p_token:token,
      p_id:id,
      p_action:action,
      p_note:note||null
    });
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to review quotation"},{status:400});
    return NextResponse.json(data);
  }

  return NextResponse.json({error:"Invalid review action"},{status:400});
}

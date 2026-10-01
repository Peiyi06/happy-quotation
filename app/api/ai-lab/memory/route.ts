import { NextResponse } from "next/server";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

async function guard(){
  const user=await internalUser();
  const token=await internalToken();
  if(!user||!token||user.username.toLowerCase()!=="long") return null;
  return {user,token,db:internalDb()};
}

export async function GET(){
  const ctx=await guard();
  if(!ctx) return NextResponse.json({error:"Not allowed"},{status:403});
  const {data,error}=await ctx.db.rpc("staff_list_company_ai_memories",{p_token:ctx.token});
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true,memories:Array.isArray(data)?data:[]});
}

export async function POST(request:Request){
  const ctx=await guard();
  if(!ctx) return NextResponse.json({error:"Not allowed"},{status:403});
  const body=await request.json().catch(()=>({}));
  const mode=String(body?.mode||"save");

  if(mode==="archive"){
    const id=String(body?.id||"");
    if(!id) return NextResponse.json({error:"Memory ID is required"},{status:400});
    const {data,error}=await ctx.db.rpc("staff_archive_company_ai_memory",{p_token:ctx.token,p_id:id});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to remove memory"},{status:400});
    return NextResponse.json(data);
  }

  const category=String(body?.category||"workflow");
  const title=String(body?.title||"").trim();
  const ruleText=String(body?.ruleText||"").trim();
  const {data,error}=await ctx.db.rpc("staff_save_company_ai_memory",{
    p_token:ctx.token,p_category:category,p_title:title,p_rule_text:ruleText
  });
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to save memory"},{status:400});
  return NextResponse.json(data);
}
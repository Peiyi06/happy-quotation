import { NextResponse } from "next/server";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

async function guard(){
  const user=await internalUser();
  const token=await internalToken();
  if(!user||!token||user.username.toLowerCase()!=="long") return null;
  return {token,db:internalDb()};
}

export async function GET(request:Request){
  const ctx=await guard();
  if(!ctx) return NextResponse.json({error:"Not allowed"},{status:403});
  const url=new URL(request.url);
  const id=url.searchParams.get("id")||"";
  if(id){
    const {data,error}=await ctx.db.rpc("staff_get_ai_thread",{p_token:ctx.token,p_thread_id:id});
    if(error||!data?.id) return NextResponse.json({error:error?.message||"Thread not found"},{status:404});
    return NextResponse.json({ok:true,thread:data});
  }
  const archived=url.searchParams.get("archived")==="true";
  const {data,error}=await ctx.db.rpc("staff_list_ai_threads",{p_token:ctx.token,p_archived:archived});
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true,threads:Array.isArray(data)?data:[]});
}

export async function POST(request:Request){
  const ctx=await guard();
  if(!ctx) return NextResponse.json({error:"Not allowed"},{status:403});
  const body=await request.json().catch(()=>({}));
  const mode=String(body?.mode||"update");
  const id=String(body?.id||"");
  if(mode==="create"){
    const {data,error}=await ctx.db.rpc("staff_create_ai_thread",{
      p_token:ctx.token,
      p_title:String(body?.title||"New Thread"),
      p_linked_inquiry_id:body?.linkedInquiryId||null
    });
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to create thread"},{status:400});
    return NextResponse.json(data);
  }
  if(!id) return NextResponse.json({error:"Thread ID is required"},{status:400});
  const {data,error}=await ctx.db.rpc("staff_update_ai_thread",{
    p_token:ctx.token,
    p_thread_id:id,
    p_title:body?.title??null,
    p_linked_inquiry_id:body?.linkedInquiryId??null,
    p_context_title:body?.contextTitle??null,
    p_archived:typeof body?.archived==="boolean"?body.archived:null
  });
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to update thread"},{status:400});
  return NextResponse.json(data);
}
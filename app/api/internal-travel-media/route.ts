import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function GET(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});

  const url=new URL(request.url);
  const type=String(url.searchParams.get("type")||"");
  const query=String(url.searchParams.get("q")||"").trim();
  const limit=Math.max(1,Math.min(10,Number(url.searchParams.get("limit")||5)||5));

  if(!["attraction","hotel"].includes(type)) return NextResponse.json({error:"Invalid place type"},{status:400});
  if(!query) return NextResponse.json({ok:true,matches:[]});

  const db=internalDb();
  const {data,error}=await db.rpc("staff_match_travel_media",{
    p_token:token,
    p_place_type:type,
    p_query:query,
    p_limit:limit
  });

  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to match media"},{status:400});
  return NextResponse.json(data);
}

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});

  const body=await request.json().catch(()=>({}));
  const type=String(body.type||"");
  const name=String(body.name||"").trim();
  const path=String(body.path||"").trim();
  const url=String(body.url||"").trim();

  if(!["attraction","hotel"].includes(type)) return NextResponse.json({error:"Invalid place type"},{status:400});
  if(!name||!path||!url) return NextResponse.json({error:"Name and image are required"},{status:400});

  const db=internalDb();
  const {data,error}=await db.rpc("staff_register_travel_media",{
    p_token:token,
    p_place_type:type,
    p_name:name,
    p_storage_path:path,
    p_image_url:url,
    p_original_name:String(body.originalName||""),
    p_destination:String(body.destination||""),
    p_city_area:String(body.cityArea||"")
  });

  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to save media"},{status:400});
  return NextResponse.json(data);
}

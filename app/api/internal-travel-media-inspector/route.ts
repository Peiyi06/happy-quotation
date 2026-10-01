import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://iuvrzxvczzwndzpykssh.supabase.co";
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_vyaTRcn875RcK3mFoP-Now_mI1PlE4l";

async function deleteStoredImage(token:string,path:string){
  const form=new FormData();
  form.set("action","delete");
  form.set("path",path);
  const res=await fetch(supabaseUrl+"/functions/v1/itinerary-image-storage",{
    method:"POST",
    headers:{"apikey":publishableKey,"x-staff-token":token},
    body:form
  });
  const data=await res.json().catch(()=>({}));
  return {res,data};
}

export async function GET(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const url=new URL(request.url);
  const q=String(url.searchParams.get("q")||"").trim();
  if(!q) return NextResponse.json({ok:true,results:[]});

  const db=internalDb();
  const {data,error}=await db.rpc("staff_search_travel_media_inspector",{
    p_token:token,
    p_query:q,
    p_limit:20
  });
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to search media library"},{status:400});
  return NextResponse.json(data);
}

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>({}));
  const action=String(body.action||"");
  const imageId=String(body.imageId||"");
  if(!imageId) return NextResponse.json({error:"Image id is required"},{status:400});

  const db=internalDb();

  if(action==="remove"){
    const {data,error}=await db.rpc("staff_remove_travel_place_image",{p_token:token,p_image_id:imageId});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to remove image"},{status:400});
    return NextResponse.json(data);
  }

  if(action==="delete"){
    const {data:imageData,error:imageError}=await db.rpc("staff_get_travel_place_image",{p_token:token,p_image_id:imageId});
    if(imageError||!imageData?.ok) return NextResponse.json({error:imageData?.error||imageError?.message||"Image not found"},{status:404});

    const path=String(imageData.image?.path||"");
    if(path){
      const stored=await deleteStoredImage(token,path);
      if(!stored.res.ok||!stored.data?.ok){
        return NextResponse.json({error:stored.data?.error||"Unable to delete stored image"},{status:400});
      }
    }

    const {data,error}=await db.rpc("staff_remove_travel_place_image",{p_token:token,p_image_id:imageId});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to remove image record"},{status:400});
    return NextResponse.json({ok:true});
  }

  return NextResponse.json({error:"Invalid action"},{status:400});
}

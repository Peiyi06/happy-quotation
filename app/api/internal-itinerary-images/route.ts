import { NextResponse } from "next/server";
import { internalToken } from "@/lib/internalSession";

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://iuvrzxvczzwndzpykssh.supabase.co";
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_vyaTRcn875RcK3mFoP-Now_mI1PlE4l";

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});

  const form=await request.formData();
  const upstream=new FormData();

  const action=String(form.get("action")||"upload");
  upstream.set("action",action);

  if(action==="delete"){
    upstream.set("path",String(form.get("path")||""));
  }else{
    const file=form.get("file");
    if(!(file instanceof File)) return NextResponse.json({error:"Missing file"},{status:400});
    if(!file.type.startsWith("image/")) return NextResponse.json({error:"Only image files are allowed"},{status:400});
    if(file.size>10*1024*1024) return NextResponse.json({error:"Image must be 10MB or smaller"},{status:400});
    upstream.set("file",file,file.name);
  }

  const res=await fetch(supabaseUrl+"/functions/v1/itinerary-image-storage",{
    method:"POST",
    headers:{
      "apikey":publishableKey,
      "x-staff-token":token
    },
    body:upstream
  });

  const data=await res.json().catch(()=>({}));
  return NextResponse.json(data,{status:res.status});
}

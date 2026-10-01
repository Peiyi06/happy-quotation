import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

function outputText(payload:any){
  if(typeof payload?.output_text==="string") return payload.output_text;
  for(const item of payload?.output||[]){
    for(const part of item?.content||[]){
      if(part?.type==="output_text"&&typeof part?.text==="string") return part.text;
    }
  }
  return "";
}


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
  const action=String(body.action||"register");
  const type=String(body.type||"");

  if(!["attraction","hotel"].includes(type)) return NextResponse.json({error:"Invalid place type"},{status:400});
  const db=internalDb();

  if(action==="semantic_match"){
    const query=String(body.query||body.name||"").trim();
    const destination=String(body.destination||"").trim();
    const cityArea=String(body.cityArea||"").trim();
    if(!query) return NextResponse.json({ok:true,match:null,semantic:false});

    const {data:candidateData,error:candidateError}=await db.rpc("staff_list_travel_media_candidates",{
      p_token:token,
      p_place_type:type,
      p_destination:destination,
      p_limit:120
    });
    if(candidateError||!candidateData?.ok) return NextResponse.json({error:candidateData?.error||candidateError?.message||"Unable to load media candidates"},{status:400});

    const candidates=Array.isArray(candidateData.candidates)?candidateData.candidates:[];
    if(!candidates.length) return NextResponse.json({ok:true,match:null,semantic:false});

    const key=process.env.OPENAI_API_KEY;
    if(!key) return NextResponse.json({ok:true,match:null,semantic:false,reason:"AI not configured"});

    const schema={
      type:"object",
      additionalProperties:false,
      properties:{
        samePlace:{type:"boolean"},
        placeId:{type:"string"},
        confidence:{type:"number"},
        reason:{type:"string"}
      },
      required:["samePlace","placeId","confidence","reason"]
    };

    const prompt=[
      "You are matching a travel attraction or hotel name against a private media library.",
      "Choose a candidate only when it is clearly the SAME real-world place or SAME hotel property.",
      "Translations, transliterations, common aliases and reordered hotel naming are allowed.",
      "Do not match merely because two places are in the same city, chain, neighborhood, or have similar words.",
      "For hotels be especially conservative: different branches/properties are not the same hotel.",
      "Use destination/cityArea as supporting context when available.",
      "If uncertain, return samePlace=false, placeId='', confidence below 0.8.",
      "Never invent a placeId. It must be copied exactly from the candidate list.",
      "",
      JSON.stringify({
        type,
        query,
        destination,
        cityArea,
        candidates:candidates.map((x:any)=>({
          placeId:String(x.placeId||""),
          canonicalName:String(x.canonicalName||""),
          aliases:Array.isArray(x.aliases)?x.aliases:[],
          destination:String(x.destination||""),
          cityArea:String(x.cityArea||"")
        }))
      })
    ].join("\n");

    const openai=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:process.env.OPENAI_ITINERARY_MODEL||"gpt-5.6-terra",
        reasoning:{effort:"low"},
        input:[{role:"user",content:[{type:"input_text",text:prompt}]}],
        text:{format:{type:"json_schema",name:"travel_media_semantic_match",strict:true,schema}}
      })
    });

    const raw=await openai.json().catch(()=>({}));
    if(!openai.ok) return NextResponse.json({ok:true,match:null,semantic:false,reason:"AI match unavailable"});

    const text=outputText(raw);
    if(!text) return NextResponse.json({ok:true,match:null,semantic:false});
    let parsed:any={};
    try{parsed=JSON.parse(text);}catch{return NextResponse.json({ok:true,match:null,semantic:false});}

    const minConfidence=type==="hotel"?0.92:0.86;
    if(!parsed?.samePlace||!parsed?.placeId||Number(parsed?.confidence||0)<minConfidence){
      return NextResponse.json({ok:true,match:null,semantic:true,confidence:Number(parsed?.confidence||0)});
    }

    const candidate=candidates.find((x:any)=>String(x.placeId)===String(parsed.placeId));
    if(!candidate) return NextResponse.json({ok:true,match:null,semantic:true});

    const {data:placeData,error:placeError}=await db.rpc("staff_get_travel_media_place",{
      p_token:token,
      p_place_id:String(parsed.placeId)
    });
    if(placeError||!placeData?.ok) return NextResponse.json({ok:true,match:null,semantic:true});

    return NextResponse.json({
      ok:true,
      match:{...placeData.match,score:Number(parsed.confidence||1),matchMethod:"ai_semantic"},
      semantic:true
    });
  }

  const name=String(body.name||"").trim();
  const path=String(body.path||"").trim();
  const url=String(body.url||"").trim();

  if(!name||!path||!url) return NextResponse.json({error:"Name and image are required"},{status:400});

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

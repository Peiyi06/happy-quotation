import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { internalDb,internalToken } from "@/lib/internalSession";

function outputText(payload:any){
  if(typeof payload?.output_text==="string") return payload.output_text;
  for(const item of payload?.output||[]){
    for(const part of item?.content||[]){
      if(part?.type==="output_text"&&typeof part?.text==="string") return part.text;
    }
  }
  return "";
}

function sourceFromInquiry(data:any){
  const r=data.operation_review||{};
  const s=data.supplier_inquiry||{};
  const has=(key:string)=>Object.prototype.hasOwnProperty.call(r,key);
  const pick=(key:string,original:any)=>has(key)?r[key]:original;
  const salesFlights=Array.isArray(data?.inquiry_data?.suggestedFlights)?data.inquiry_data.suggestedFlights:[];
  const finalFlights=r?.overrideSuggestedFlights===true&&Array.isArray(r?.suggestedFlights)?r.suggestedFlights:salesFlights;
  const salesComposition=data?.inquiry_data?.travellerComposition||{};
  const composition=r?.overrideTravellerComposition===true&&r?.travellerComposition?r.travellerComposition:salesComposition;
  return {
    destination:String(pick("destination",data.destination)||""),
    departureCity:String(pick("departureCity",data.departure_city)||""),
    tourType:String(pick("tourType",data.tour_type)||""),
    flightRequirement:String(pick("flightRequirement",data.flight_requirement)||""),
    hotelRequirement:String(pick("hotelRequirement",data.hotel_requirement)||""),
    mealRequirement:String(pick("mealRequirement",data.meal_requirement)||""),
    transportationRequirement:String(pick("transportRequirement","")||""),
    itineraryRequirement:String(pick("itineraryRequirement","")||""),
    specialRequest:String(pick("specialRequest",data.special_request)||""),
    supplierRemarks:String(s.remarks||""),
    seniorNotes:String(composition.seniorNotes||""),
    childAges:String(composition.childAges||""),
    childNotes:String(composition.childNotes||""),
    mobilityNotes:String(composition.mobilityNotes||""),
    flightRemarks:finalFlights.map((f:any)=>String(f?.remarks||""))
  };
}

const schema={
  type:"object",
  additionalProperties:false,
  properties:{
    destination:{type:"string"},
    departureCity:{type:"string"},
    tourType:{type:"string"},
    flightRequirement:{type:"string"},
    hotelRequirement:{type:"string"},
    mealRequirement:{type:"string"},
    transportationRequirement:{type:"string"},
    itineraryRequirement:{type:"string"},
    specialRequest:{type:"string"},
    supplierRemarks:{type:"string"},
    seniorNotes:{type:"string"},
    childAges:{type:"string"},
    childNotes:{type:"string"},
    mobilityNotes:{type:"string"},
    flightRemarks:{type:"array",items:{type:"string"}}
  },
  required:["destination","departureCity","tourType","flightRequirement","hotelRequirement","mealRequirement","transportationRequirement","itineraryRequirement","specialRequest","supplierRemarks","seniorNotes","childAges","childNotes","mobilityNotes","flightRemarks"]
};

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>({}));
  const id=String(body?.id||"");
  const language=body?.language==="zh"?"zh":body?.language==="en"?"en":"";
  if(!id||!language) return NextResponse.json({error:"Inquiry ID and language are required."},{status:400});

  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data?.id) return NextResponse.json({error:"Inquiry not found."},{status:404});

  const source=sourceFromInquiry(data);
  const sourceHash=createHash("sha256").update(JSON.stringify(source)).digest("hex");
  const cached=data?.supplier_form_translations?.[language];
  if(cached?.sourceHash===sourceHash&&cached?.data){
    return NextResponse.json({ok:true,cached:true,language});
  }

  const key=process.env.OPENAI_API_KEY;
  if(!key) return NextResponse.json({error:"AI translation is not configured."},{status:503});
  const target=language==="en"?"English":"Simplified Chinese";
  const instructions=[
    "You translate supplier inquiry content for a professional travel agency.",
    "Translate every non-empty value into "+target+".",
    "Keep airline codes, airport codes, flight numbers, dates, times, hotel brand names, personal/company names, and numeric values unchanged unless natural localization is necessary.",
    "Use professional travel-industry wording. Preserve meaning exactly; do not add facts.",
    "If a source value is already in the target language, keep it naturally as-is.",
    "Return only the structured JSON requested."
  ].join("\n");

  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({
      model:process.env.OPENAI_ITINERARY_MODEL||"gpt-5.6-terra",
      reasoning:{effort:"low"},
      instructions,
      input:[{role:"user",content:[{type:"input_text",text:JSON.stringify(source)}]}],
      text:{format:{type:"json_schema",name:"supplier_form_translation",strict:true,schema}}
    })
  });
  const raw=await response.json().catch(()=>({}));
  if(!response.ok) return NextResponse.json({error:raw?.error?.message||"Translation failed."},{status:502});
  const txt=outputText(raw);
  if(!txt) return NextResponse.json({error:"Translation returned no content."},{status:502});

  let translation:any;
  try{translation=JSON.parse(txt);}catch{return NextResponse.json({error:"Translation could not be parsed."},{status:502});}

  const {data:saved,error:saveError}=await db.rpc("staff_save_supplier_form_translation",{
    p_token:token,p_id:id,p_language:language,p_source_hash:sourceHash,p_translation:translation
  });
  if(saveError||!saved?.ok) return NextResponse.json({error:saved?.error||saveError?.message||"Unable to save translation."},{status:400});

  return NextResponse.json({ok:true,cached:false,language});
}

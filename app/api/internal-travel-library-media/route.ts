import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { internalDb, internalToken } from "@/lib/internalSession";

export const runtime="nodejs";
export const maxDuration=300;

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://iuvrzxvczzwndzpykssh.supabase.co";
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_vyaTRcn875RcK3mFoP-Now_mI1PlE4l";

type ExtractedImage={
  imageIndex:number;
  sourcePage:number|null;
  bytes:Buffer;
  width:number;
  height:number;
  nearbyText:string;
  originalName:string;
};

function outputText(payload:any){
  if(typeof payload?.output_text==="string") return payload.output_text;
  for(const item of payload?.output||[]){
    for(const part of item?.content||[]){
      if(part?.type==="output_text"&&typeof part?.text==="string") return part.text;
    }
  }
  return "";
}

async function signSource(token:string,path:string){
  const form=new FormData();
  form.set("action","sign");
  form.set("path",path);
  const res=await fetch(supabaseUrl+"/functions/v1/travel-library-storage",{
    method:"POST",
    headers:{"apikey":publishableKey,"x-staff-token":token},
    body:form
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data?.ok||!data.url) throw new Error(data?.error||"Unable to access source document");
  return String(data.url);
}

async function uploadExtracted(token:string,img:ExtractedImage,docId:string){
  const form=new FormData();
  const file=new File([img.bytes],`${docId}-${img.sourcePage?"p"+img.sourcePage:"doc"}-img${img.imageIndex}.jpg`,{type:"image/jpeg"});
  form.set("file",file,file.name);
  const res=await fetch(supabaseUrl+"/functions/v1/itinerary-image-storage",{
    method:"POST",
    headers:{"apikey":publishableKey,"x-staff-token":token},
    body:form
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data?.ok||!data.path||!data.url) throw new Error(data?.error||"Unable to save extracted image");
  return {path:String(data.path),url:String(data.url),name:file.name};
}

async function deleteExtracted(token:string,path:string){
  if(!path) return;
  const form=new FormData();
  form.set("action","delete");
  form.set("path",path);
  await fetch(supabaseUrl+"/functions/v1/itinerary-image-storage",{
    method:"POST",
    headers:{"apikey":publishableKey,"x-staff-token":token},
    body:form
  }).catch(()=>null);
}

async function imageObjectToJpeg(obj:any){
  const sharp=(await import("sharp")).default;
  const width=Number(obj?.width||0);
  const height=Number(obj?.height||0);
  const data=obj?.data;
  if(!width||!height||!data) return null;
  if(width<180||height<120||width*height<35000) return null;
  const pixels=width*height;
  const channels=Math.round(Number(data.length||0)/pixels);
  if(![1,3,4].includes(channels)) return null;
  const input=Buffer.from(data.buffer||data,data.byteOffset||0,data.byteLength||data.length);
  const out=await sharp(input,{raw:{width,height,channels:channels as 1|3|4}})
    .resize({width:1200,height:1200,fit:"inside",withoutEnlargement:true})
    .jpeg({quality:82})
    .toBuffer({resolveWithObject:true});
  return {bytes:out.data,width:out.info.width,height:out.info.height};
}

async function extractPdf(bytes:Buffer,maxImages=36){
  const pdfjs:any=await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes),disableWorker:true,useWorkerFetch:false,isEvalSupported:false}).promise;
  const results:ExtractedImage[]=[];
  const seen=new Set<string>();
  let index=0;

  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    const page=await pdf.getPage(pageNo);
    const textContent=await page.getTextContent();
    const pageText=(textContent.items||[]).map((x:any)=>String(x.str||"")).join(" ").replace(/\s+/g," ").trim().slice(0,5000);
    const ops=await page.getOperatorList();

    for(let i=0;i<ops.fnArray.length;i++){
      const fn=ops.fnArray[i];
      let obj:any=null;
      if(fn===pdfjs.OPS.paintInlineImageXObject){
        obj=ops.argsArray[i]?.[0];
      }else if(fn===pdfjs.OPS.paintImageXObject||fn===pdfjs.OPS.paintJpegXObject){
        const name=ops.argsArray[i]?.[0];
        if(!name) continue;
        obj=await new Promise(resolve=>{
          let settled=false;
          const timer=setTimeout(()=>{
            if(!settled){settled=true;resolve(null);}
          },1500);
          try{
            page.objs.get(name,(value:any)=>{
              if(settled) return;
              settled=true;
              clearTimeout(timer);
              resolve(value);
            });
          }catch{
            if(!settled){
              settled=true;
              clearTimeout(timer);
              resolve(null);
            }
          }
        });
      }else{
        continue;
      }

      try{
        const converted=await imageObjectToJpeg(obj);
        if(!converted) continue;
        const hash=createHash("sha1").update(converted.bytes).digest("hex");
        if(seen.has(hash)) continue;
        seen.add(hash);
        index++;
        results.push({
          imageIndex:index,sourcePage:pageNo,bytes:converted.bytes,
          width:converted.width,height:converted.height,nearbyText:pageText,
          originalName:`Page ${pageNo} Image ${index}`
        });
        if(results.length>=maxImages) return results;
      }catch{}
    }
  }
  return results;
}

async function extractDocx(bytes:Buffer,contextText:string){
  const JSZip=(await import("jszip")).default;
  const sharp=(await import("sharp")).default;
  const zip=await JSZip.loadAsync(bytes);
  const media=Object.values(zip.files).filter((x:any)=>!x.dir&&/^word\/media\//i.test(x.name));
  const results:ExtractedImage[]=[];
  const seen=new Set<string>();
  let index=0;
  for(const item of media as any[]){
    try{
      const raw=Buffer.from(await item.async("uint8array"));
      const meta=await sharp(raw).metadata();
      if(!meta.width||!meta.height||meta.width<180||meta.height<120||meta.width*meta.height<35000) continue;
      const out=await sharp(raw).resize({width:1200,height:1200,fit:"inside",withoutEnlargement:true}).jpeg({quality:82}).toBuffer({resolveWithObject:true});
      const hash=createHash("sha1").update(out.data).digest("hex");
      if(seen.has(hash)) continue;
      seen.add(hash);index++;
      results.push({
        imageIndex:index,sourcePage:null,bytes:out.data,width:out.info.width,height:out.info.height,
        nearbyText:contextText.slice(0,5000),originalName:item.name.split("/").pop()||`Image ${index}`
      });
      if(results.length>=36) break;
    }catch{}
  }
  return results;
}

const visionSchema={
  type:"object",
  additionalProperties:false,
  properties:{
    matches:{
      type:"array",
      items:{
        type:"object",additionalProperties:false,
        properties:{
          imageIndex:{type:"integer"},
          suggestedType:{type:"string",enum:["attraction","hotel","unknown"]},
          candidateName:{type:"string"},
          confidence:{type:"number"},
          reason:{type:"string"}
        },
        required:["imageIndex","suggestedType","candidateName","confidence","reason"]
      }
    }
  },
  required:["matches"]
};

async function identifyBatch(key:string,images:ExtractedImage[],source:any){
  const places=(source?.extraction?.places||[]).map((x:any)=>String(x?.name||"")).filter(Boolean);
  const hotels=(source?.extraction?.hotels||[]).map((x:any)=>String(x?.name||"")).filter(Boolean);
  const allowed=[...places.map((name:string)=>({type:"attraction",name})),...hotels.map((name:string)=>({type:"hotel",name}))];

  const content:any[]=[{
    type:"input_text",
    text:[
      "You are matching photos extracted from one travel itinerary document.",
      "For each image, choose ONLY from the supplied candidate attractions/hotels. Never invent a new place.",
      "Use BOTH visual evidence and the page/document text shown before each image.",
      "Logos, decorative graphics, food-only photos, transport-only photos, maps, QR codes, or ambiguous images must be unknown.",
      "Different hotel branches are different properties.",
      "Confidence is 0 to 1. Use >=0.90 only when the image and document context strongly agree.",
      "If context and image disagree, return unknown.",
      JSON.stringify({documentTitle:source?.title||"",destination:source?.destination||"",allowedCandidates:allowed})
    ].join("\n")
  }];

  for(const img of images){
    content.push({type:"input_text",text:`IMAGE #${img.imageIndex}\nSource page: ${img.sourcePage||"DOCX"}\nNearby document text: ${img.nearbyText||"(none)"}`});
    content.push({type:"input_image",image_url:`data:image/jpeg;base64,${img.bytes.toString("base64")}`,detail:"high"});
  }

  const res=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({
      model:process.env.OPENAI_ITINERARY_MODEL||"gpt-5.6-terra",
      reasoning:{effort:"low"},
      input:[{role:"user",content}],
      text:{format:{type:"json_schema",name:"document_media_matches",strict:true,schema:visionSchema}}
    })
  });
  const raw=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(raw?.error?.message||"AI could not identify extracted media");
  const text=outputText(raw);
  if(!text) throw new Error("AI returned no media matches");
  return JSON.parse(text)?.matches||[];
}

async function resolvePlace(db:any,token:string,type:string,name:string){
  if(!["attraction","hotel"].includes(type)||!name) return null;
  const {data}=await db.rpc("staff_match_travel_media",{
    p_token:token,p_place_type:type,p_query:name,p_limit:3
  });
  const best=data?.ok&&Array.isArray(data.matches)&&data.matches.length?data.matches[0]:null;
  if(!best) return null;
  const threshold=type==="hotel"?0.72:0.58;
  if(Number(best.score||0)<threshold) return null;
  return best;
}

function normalizeGroupName(value:string){
  return String(value||"")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_.·•・()（）【】\[\],，。\/\\]+/g,"")
    .trim();
}

async function getGroupAnchors(db:any,token:string,documentId:string){
  const {data,error}=await db.rpc("staff_get_travel_media_group_anchors",{
    p_token:token,p_document_id:documentId
  });
  if(error||!data?.ok) return [];
  return Array.isArray(data.anchors)?data.anchors:[];
}

function findGroupAnchor(anchors:any[],img:ExtractedImage,type:string,name:string){
  const normalized=normalizeGroupName(name);
  if(!normalized) return null;
  return anchors.find((anchor:any)=>
    Number(anchor?.sourcePage||0)===Number(img.sourcePage||0) &&
    String(anchor?.type||"")===type &&
    normalizeGroupName(String(anchor?.name||""))===normalized &&
    Boolean(anchor?.placeId)
  )||null;
}

async function processOne(token:string,db:any,doc:any,key:string){
  const sourceUrl=await signSource(token,String(doc.storagePath||""));
  const sourceRes=await fetch(sourceUrl);
  if(!sourceRes.ok) throw new Error("Unable to download Library Source");
  const sourceBytes=Buffer.from(await sourceRes.arrayBuffer());

  const itinerary=doc.extraction?.itineraryCase||{};
  const contextText=[
    doc.title,doc.destination,doc.extraction?.summary,
    ...(Array.isArray(itinerary?.dayOutline)?itinerary.dayOutline:[])
  ].filter(Boolean).join(" ");

  let images:ExtractedImage[]=[];
  if(String(doc.mimeType)==="application/pdf"){
    const prevProcessed=Math.max(0,Number(doc.mediaExtractionSummary?.processed||0));
    images=await extractPdf(sourceBytes,prevProcessed+2);
  }else if(String(doc.mimeType)==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
    images=await extractDocx(sourceBytes,contextText);
  }else{
    throw new Error("Unsupported source format for media extraction");
  }

  const prev=doc.mediaExtractionSummary||{};
  const processed=Math.max(0,Number(prev.processed||0));
  const previousMatched=Math.max(0,Number(prev.matched||0));
  const previousSkipped=Math.max(0,Number(prev.skipped||0));

  if(!images.length){
    const summary={found:0,processed:0,matched:0,needsReview:0,complete:true};
    const {data,error}=await db.rpc("staff_save_travel_media_extraction_chunk",{
      p_token:token,p_document_id:doc.id,p_candidates:[],p_summary:summary,p_complete:true
    });
    if(error||!data?.ok) throw new Error(data?.error||error?.message||"Unable to save empty extraction");
    return summary;
  }

  const chunk=images.filter(x=>x.imageIndex>processed).slice(0,1);
  if(!chunk.length){
    const summary={
      found:images.length,processed:images.length,matched:previousMatched,skipped:previousSkipped,
      needsReview:Math.max(0,images.length-previousMatched-previousSkipped),complete:true
    };
    const {data,error}=await db.rpc("staff_save_travel_media_extraction_chunk",{
      p_token:token,p_document_id:doc.id,p_candidates:[],p_summary:summary,p_complete:true
    });
    if(error||!data?.ok) throw new Error(data?.error||error?.message||"Unable to finalize media extraction");
    return summary;
  }

  const anchors=await getGroupAnchors(db,token,String(doc.id));
  const aiMatches:any[]=await identifyBatch(key,chunk,doc);
  const candidates:any[]=[];
  let matchedThisChunk=0;
  const uploadedPaths:string[]=[];

  try{
    for(const img of chunk){
      const ai=aiMatches.find((x:any)=>Number(x.imageIndex)===img.imageIndex)||{};
      const type=String(ai.suggestedType||"unknown");
      const name=String(ai.candidateName||"").trim();
      const confidence=Math.max(0,Math.min(1,Number(ai.confidence||0)));
      if(!["attraction","hotel"].includes(type)){
        continue;
      }

      const resolved=await resolvePlace(db,token,type,name);
      const resolvedScore=Number(resolved?.score||0);
      // An exact canonical / alias / staff keyword name is strong identity evidence
      // even when the photo itself is visually ambiguous. Keep the original vision
      // confidence visible and require human review, but attach the Library record.
      const exactNameMatch=Boolean(resolved)&&resolvedScore>=0.985;
      const accepted=Boolean(resolved)&&(exactNameMatch||confidence>=(type==="hotel"?0.92:0.86));
      const groupAnchor=!accepted?findGroupAnchor(anchors,img,type,name):null;
      const inherited=Boolean(groupAnchor?.placeId);
      const stored=await uploadExtracted(token,img,String(doc.id));
      uploadedPaths.push(stored.path);
      if(accepted||inherited) matchedThisChunk++;

      const suggestedPlaceId=accepted
        ? String(resolved.placeId||"")
        : inherited
          ? String(groupAnchor.placeId||"")
          : "";
      const suggestedName=accepted
        ? String(resolved.canonicalName||name)
        : inherited
          ? String(groupAnchor.name||name)
          : name;
      const matchMethod=accepted
        ? (resolvedScore>=0.985?"document_context_exact":"document_context_fuzzy")
        : inherited
          ? "document_group_context"
          : "document_context_vision";
      const reason=inherited
        ? [String(ai.reason||""),`Matched to a confirmed ${type} on the same source page with the same normalized name.`].filter(Boolean).join(" ")
        : String(ai.reason||"");

      candidates.push({
        imageIndex:img.imageIndex,
        sourcePage:img.sourcePage,
        storagePath:stored.path,
        imageUrl:stored.url,
        originalName:stored.name,
        width:img.width,
        height:img.height,
        nearbyText:img.nearbyText,
        suggestedType:type,
        suggestedPlaceId,
        suggestedName,
        confidence,
        matchMethod,
        reason
      });
    }

    const processedTotal=Math.min(images.length,processed+chunk.length);
    const matchedTotal=previousMatched+matchedThisChunk;
    const skippedThisChunk=Math.max(0,chunk.length-candidates.length);
    const skippedTotal=previousSkipped+skippedThisChunk;
    const complete=processedTotal>=images.length;
    const summary={
      found:images.length,
      processed:processedTotal,
      matched:matchedTotal,
      skipped:skippedTotal,
      needsReview:Math.max(0,processedTotal-matchedTotal-skippedTotal),
      complete
    };

    const {data,error}=await db.rpc("staff_save_travel_media_extraction_chunk",{
      p_token:token,p_document_id:doc.id,p_candidates:candidates,p_summary:summary,p_complete:complete
    });
    if(error||!data?.ok) throw new Error(data?.error||error?.message||"Unable to save media extraction chunk");
    return summary;
  }catch(error){
    for(const path of uploadedPaths) await deleteExtracted(token,path);
    throw error;
  }
}

export async function GET(){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=internalDb();
  const {data,error}=await db.rpc("staff_list_travel_media_review",{p_token:token,p_document_id:null});
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to load media review"},{status:400});
  return NextResponse.json(data);
}

export async function POST(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const key=process.env.OPENAI_API_KEY;
  const body=await request.json().catch(()=>({}));
  const action=String(body.action||"");
  const db=internalDb();

  if(action==="queue_existing"){
    const {data,error}=await db.rpc("staff_queue_existing_travel_media_sources",{p_token:token});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to queue sources"},{status:400});
    return NextResponse.json(data);
  }

  if(action==="process_next"){
    if(!key) return NextResponse.json({error:"AI is not configured."},{status:503});
    const {data:claim,error:claimError}=await db.rpc("staff_claim_next_travel_media_source",{p_token:token});
    if(claimError||!claim?.ok) return NextResponse.json({error:claim?.error||claimError?.message||"Unable to claim source"},{status:400});
    if(claim.done) return NextResponse.json({ok:true,done:true});
    const doc=claim.document;
    try{
      const summary=await processOne(token,db,doc,key);
      return NextResponse.json({ok:true,done:false,documentId:doc.id,title:doc.title,summary});
    }catch(error:any){
      await db.rpc("staff_fail_travel_media_extraction",{p_token:token,p_document_id:doc.id,p_error:String(error?.message||error)});
      return NextResponse.json({error:String(error?.message||"Media extraction failed"),documentId:doc.id},{status:500});
    }
  }

  if(action==="confirm"){
    const id=String(body.id||"");
    const {data,error}=await db.rpc("staff_confirm_travel_media_candidate",{p_token:token,p_candidate_id:id});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to confirm image"},{status:400});
    return NextResponse.json(data);
  }

  if(action==="ignore"){
    const id=String(body.id||"");
    const {data,error}=await db.rpc("staff_ignore_travel_media_candidate",{p_token:token,p_candidate_id:id});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to ignore image"},{status:400});
    if(data.path) await deleteExtracted(token,String(data.path));
    return NextResponse.json({ok:true});
  }

  return NextResponse.json({error:"Invalid action"},{status:400});
}

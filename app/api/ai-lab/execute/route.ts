import { NextResponse } from "next/server";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

const allowedTypes=new Set(["create_inquiry","update_inquiry","create_itinerary","update_itinerary"]);

const s=(v:any,max=4000)=>String(v??"").trim().slice(0,max);
const n=(v:any,fallback:number|null=null)=>{
  const x=Number(v);
  return Number.isFinite(x)?x:fallback;
};
const uid=()=>Math.random().toString(36).slice(2,10);

function normalizeFlights(raw:any){
  if(!Array.isArray(raw)) return [];
  return raw.slice(0,12).map((f:any)=>({
    id:s(f?.id||uid(),40),
    from:s(f?.from,8).toUpperCase(),
    to:s(f?.to,8).toUpperCase(),
    flightNo:s(f?.flightNo,30),
    date:s(f?.date,20),
    departureTime:s(f?.departureTime,20),
    arrivalTime:s(f?.arrivalTime,20),
    remarks:s(f?.remarks,1000)
  }));
}

function normalizeComposition(raw:any){
  const x=raw&&typeof raw==="object"?raw:{};
  return {
    adultCount:n(x.adultCount,null),
    seniorCount:n(x.seniorCount,null),
    childCount:n(x.childCount,null),
    seniorNotes:s(x.seniorNotes,1000),
    childAges:s(x.childAges,1000),
    childNotes:s(x.childNotes,1000),
    mobilityNotes:s(x.mobilityNotes,1000)
  };
}

function mentionsProvidedFlightDetails(text:any){
  const v=s(text,2500).toLowerCase();
  return /(已提供.*航班|航班.*已提供|航班信息|航班资料|客户.*航班|provided.*flight|flight.*provided|flight details|flight information|flight screenshot|航班截图)/i.test(v);
}

function inquiryPayload(raw:any,existing?:any){
  const old=existing||{};
  const oldData=old.inquiry_data||{};
  const data=raw&&typeof raw==="object"?raw:{};
  const start=s(data.travel_start_date||old.travel_start_date,20);
  const end=s(data.travel_end_date||old.travel_end_date,20);
  let days=n(data.days_count,n(old.days_count,1)??1)??1;
  let nights=n(data.nights_count,n(old.nights_count,Math.max(0,days-1))??Math.max(0,days-1))??Math.max(0,days-1);
  if(/^\d{4}-\d{2}-\d{2}$/.test(start)&&/^\d{4}-\d{2}-\d{2}$/.test(end)){
    const a=Date.parse(start+"T00:00:00Z"),b=Date.parse(end+"T00:00:00Z");
    if(Number.isFinite(a)&&Number.isFinite(b)&&b>=a){
      days=Math.floor((b-a)/86400000)+1;
      nights=Math.max(0,days-1);
    }
  }
  const flights=Array.isArray(data.suggestedFlights)?normalizeFlights(data.suggestedFlights):normalizeFlights(oldData.suggestedFlights);
  const composition=data.travellerComposition?normalizeComposition(data.travellerComposition):normalizeComposition(oldData.travellerComposition);
  return {
    customer_name:s(data.customer_name??old.customer_name,300),
    contact:s(data.contact??old.contact,500),
    destination:s(data.destination??old.destination,300),
    departure_city:s(data.departure_city??old.departure_city,300),
    travel_start_date:start,
    travel_end_date:end,
    days_count:Math.max(1,Math.round(days)),
    nights_count:Math.max(0,Math.round(nights)),
    pax:n(data.pax,old.pax??null),
    budget:s(data.budget??old.budget,500),
    tour_type:s(data.tour_type??old.tour_type,300),
    flight_requirement:s(data.flight_requirement??old.flight_requirement,2000),
    hotel_requirement:s(data.hotel_requirement??old.hotel_requirement,2000),
    meal_requirement:s(data.meal_requirement??old.meal_requirement,2000),
    special_request:s(data.special_request??old.special_request,4000),
    status:s(data.status??old.status??"new",60)||"new",
    inquiry_data:{...oldData,suggestedFlights:flights,travellerComposition:composition}
  };
}

function normalizeDays(raw:any){
  if(!Array.isArray(raw)) return [];
  return raw.slice(0,30).map((d:any)=>({
    id:s(d?.id||uid(),40),
    title:s(d?.title,300),
    content:s(d?.content,5000),
    hotel:s(d?.hotel,500),
    meals:{
      breakfast:s(d?.meals?.breakfast,500),
      lunch:s(d?.meals?.lunch,500),
      dinner:s(d?.meals?.dinner,500)
    },
    attractions:Array.isArray(d?.attractions)?d.attractions.slice(0,12).map((a:any)=>({
      id:uid(),
      name:s(typeof a==="string"?a:a?.name,500),
      images:[]
    })):[],
    completed:false,
    collapsed:false
  }));
}

function normalizeHotels(raw:any){
  if(!Array.isArray(raw)) return [];
  return raw.slice(0,12).map((h:any)=>({
    id:uid(),
    name:s(h?.name,500),
    cityArea:s(h?.cityArea,500),
    starRating:s(h?.starRating,100),
    stayNights:s(h?.stayNights,200),
    roomSize:n(h?.roomSize,null)??"",
    openingYear:s(h?.openingYear,20),
    renovationYear:s(h?.renovationYear,20),
    nearbyNotes:s(h?.nearbyNotes,1500),
    images:[]
  }));
}

function normalizePackage(raw:any){
  if(!Array.isArray(raw)) return [];
  return raw.slice(0,30).map((x:any)=>({id:uid(),preset:"other",name:s(typeof x==="string"?x:x?.name,500)})).filter((x:any)=>x.name);
}

function normalizeReminders(raw:any){
  if(!Array.isArray(raw)) return [];
  return raw.slice(0,20).map((x:any)=>({
    id:uid(),preset:"other",title:s(typeof x==="string"?"Reminder":x?.title,300),description:s(typeof x==="string"?x:x?.description,2000)
  }));
}

function finalInquiryValues(inquiry:any){
  const r=inquiry?.operation_review||{};
  const pick=(key:string,original:any)=>Object.prototype.hasOwnProperty.call(r,key)?r[key]:original;
  const salesFlights=Array.isArray(inquiry?.inquiry_data?.suggestedFlights)?inquiry.inquiry_data.suggestedFlights:[];
  const finalFlights=r?.overrideSuggestedFlights===true&&Array.isArray(r?.suggestedFlights)?r.suggestedFlights:salesFlights;
  return {
    destination:pick("destination",inquiry.destination)||"",
    departureCity:pick("departureCity",inquiry.departure_city)||"",
    travelStartDate:pick("travelStartDate",inquiry.travel_start_date)||"",
    travelEndDate:pick("travelEndDate",inquiry.travel_end_date)||"",
    daysCount:Number(pick("daysCount",inquiry.days_count))||1,
    nightsCount:Number(pick("nightsCount",inquiry.nights_count))||0,
    pax:pick("pax",inquiry.pax)||"",
    tourType:pick("tourType",inquiry.tour_type)||"",
    suggestedFlights:normalizeFlights(finalFlights)
  };
}

export async function POST(request:Request){
  const user=await internalUser();
  const token=await internalToken();
  if(!user||!token||user.username.toLowerCase()!=="long"){
    return NextResponse.json({error:"Not allowed"},{status:403});
  }

  const body=await request.json().catch(()=>({}));
  const threadId=s(body?.threadId,80);
  const type=s(body?.type,60);
  if(!allowedTypes.has(type)) return NextResponse.json({error:"Unsupported AI action"},{status:400});

  let proposed:any={};
  try{ proposed=JSON.parse(String(body?.payloadJson||"{}")); }catch{
    return NextResponse.json({error:"AI proposal could not be parsed"},{status:400});
  }

  const db=internalDb();

  if(type==="create_inquiry"){
    const payload=inquiryPayload(proposed);
    const proposedFlights=Array.isArray(payload?.inquiry_data?.suggestedFlights)?payload.inquiry_data.suggestedFlights:[];
    if(mentionsProvidedFlightDetails(payload.flight_requirement)&&proposedFlights.length===0){
      return NextResponse.json({error:"检测到客户已提供具体航班资料，但 Suggested Flights 仍为空。请先让 AI 结构化航班后再建立 Inquiry。",code:"FLIGHT_DETAILS_NOT_STRUCTURED"},{status:409});
    }
    if(!payload.destination&&!payload.customer_name){
      return NextResponse.json({error:"Inquiry needs at least a customer or destination"},{status:400});
    }
    const {data,error}=await db.rpc("staff_save_inquiry",{p_token:token,p_payload:payload,p_id:null});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to create inquiry"},{status:400});
    if(threadId){
      await db.rpc("staff_update_ai_thread",{p_token:token,p_thread_id:threadId,p_title:null,p_linked_inquiry_id:data.id,p_context_title:data.inquiry_no||"Inquiry",p_archived:null});
      await db.rpc("staff_clear_ai_thread_payload_key",{p_token:token,p_thread_id:threadId,p_key:"action"});
      await db.rpc("staff_append_ai_message",{p_token:token,p_thread_id:threadId,p_role:"assistant",p_text:"Inquiry 已建立："+(data.inquiry_no||data.id),p_payload:{links:[{label:"Open Inquiry",href:"/inquiries/"+data.id,kind:"inquiry"}]}});
    }
    return NextResponse.json({ok:true,type,id:data.id,recordNo:data.inquiry_no,href:"/inquiries/"+data.id,message:"Inquiry created",contextInquiryId:data.id,contextTitle:data.inquiry_no||"Inquiry"});
  }

  if(type==="update_inquiry"){
    const id=s(body?.targetId||proposed?.id,80);
    if(!id) return NextResponse.json({error:"Inquiry ID is required"},{status:400});
    const {data:existing,error:getError}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
    if(getError||!existing?.id) return NextResponse.json({error:getError?.message||"Inquiry not found"},{status:404});
    const payload=inquiryPayload(proposed,existing);
    const updatedFlights=Array.isArray(payload?.inquiry_data?.suggestedFlights)?payload.inquiry_data.suggestedFlights:[];
    if(mentionsProvidedFlightDetails(payload.flight_requirement)&&updatedFlights.length===0){
      return NextResponse.json({error:"检测到客户已提供具体航班资料，但 Suggested Flights 仍为空。请先让 AI 结构化航班后再更新 Inquiry。",code:"FLIGHT_DETAILS_NOT_STRUCTURED"},{status:409});
    }
    const {data,error}=await db.rpc("staff_save_inquiry",{p_token:token,p_payload:payload,p_id:id});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to update inquiry"},{status:400});
    if(threadId){
      await db.rpc("staff_clear_ai_thread_payload_key",{p_token:token,p_thread_id:threadId,p_key:"action"});
      await db.rpc("staff_append_ai_message",{p_token:token,p_thread_id:threadId,p_role:"assistant",p_text:"Inquiry 已更新："+(existing.inquiry_no||id),p_payload:{links:[{label:"Open Inquiry",href:"/inquiries/"+id,kind:"inquiry"}]}});
    }
    return NextResponse.json({ok:true,type,id,recordNo:existing.inquiry_no||"",href:"/inquiries/"+id,message:"Inquiry updated",contextInquiryId:id,contextTitle:existing.inquiry_no||"Inquiry"});
  }

  if(type==="create_itinerary"){
    const sourceInquiryId=s(proposed?.sourceInquiryId||body?.contextInquiryId,80);
    if(!sourceInquiryId) return NextResponse.json({error:"A source Inquiry is required before AI can create an Itinerary"},{status:400});
    const {data:inquiry,error:getError}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:sourceInquiryId});
    if(getError||!inquiry?.id) return NextResponse.json({error:getError?.message||"Source Inquiry not found"},{status:404});
    const base=finalInquiryValues(inquiry);
    const days=normalizeDays(proposed?.days);
    const count=Math.max(1,Number(proposed?.days_count)||base.daysCount||days.length||1);
    const nights=Math.max(0,Number(proposed?.nights_count)||base.nightsCount||Math.max(0,count-1));
    const sourceSnapshot={
      inquiryNo:inquiry.inquiry_no||"",
      destination:base.destination,
      departureCity:base.departureCity,
      travelStartDate:base.travelStartDate,
      travelEndDate:base.travelEndDate,
      daysCount:count,nightsCount:nights,pax:base.pax,tourType:base.tourType,
      salesOwner:inquiry.sales_owner_name||"",operationAssignee:inquiry.operation_assignee_name||""
    };
    const payload={
      source_inquiry_id:sourceInquiryId,
      title:s(proposed?.title,500)||`${base.destination||"Tour"} ${count}D${nights}N`,
      destination:s(proposed?.destination,300)||base.destination,
      days_count:count,
      nights_count:nights,
      customer_name:s(proposed?.customer_name,300)||s(inquiry.customer_name,300),
      status:"draft",
      itinerary_data:{
        departureCity:s(proposed?.departureCity,300)||base.departureCity,
        travelStartDate:s(proposed?.travelStartDate,20)||base.travelStartDate,
        travelEndDate:s(proposed?.travelEndDate,20)||base.travelEndDate,
        pax:n(proposed?.pax,base.pax)||base.pax,
        tourType:s(proposed?.tourType,300)||base.tourType,
        suggestedFlights:Array.isArray(proposed?.suggestedFlights)?normalizeFlights(proposed.suggestedFlights):base.suggestedFlights,
        days:days.length?days:Array.from({length:count},()=>({id:uid(),title:"",content:"",hotel:"",meals:{breakfast:"",lunch:"",dinner:""},attractions:[],completed:false,collapsed:false})),
        hotels:normalizeHotels(proposed?.hotels),
        includedItems:normalizePackage(proposed?.includedItems),
        notIncludedItems:normalizePackage(proposed?.notIncludedItems),
        reminders:normalizeReminders(proposed?.reminders),
        op:user.name||"",
        opStaffId:user.id||"",
        sourceInquiryId,
        sourceInquiryNo:inquiry.inquiry_no||"",
        sourceInquirySnapshot:sourceSnapshot
      }
    };
    const {data,error}=await db.rpc("staff_save_itinerary",{p_token:token,p_payload:payload,p_id:null});
    if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to create itinerary"},{status:400});
    if(threadId){
      await db.rpc("staff_clear_ai_thread_payload_key",{p_token:token,p_thread_id:threadId,p_key:"action"});
      await db.rpc("staff_append_ai_message",{p_token:token,p_thread_id:threadId,p_role:"assistant",p_text:"Itinerary Draft 已建立："+(data.itinerary_no||data.id),p_payload:{links:[{label:"Open Itinerary",href:"/itineraries/"+data.id+"/edit",kind:"itinerary"}]}});
    }
    return NextResponse.json({ok:true,type,id:data.id,recordNo:data.itinerary_no,href:"/itineraries/"+data.id+"/edit",message:"Itinerary draft created",contextInquiryId:sourceInquiryId});
  }

  const id=s(body?.targetId||proposed?.id,80);
  if(!id) return NextResponse.json({error:"Itinerary ID is required"},{status:400});
  const {data:existing,error:getError}=await db.rpc("staff_get_itinerary",{p_token:token,p_id:id});
  if(getError||!existing?.id) return NextResponse.json({error:getError?.message||"Itinerary not found"},{status:404});
  const old=existing.itinerary_data||{};
  const proposedDays=Array.isArray(proposed?.days)?normalizeDays(proposed.days):old.days||[];
  const count=Math.max(1,Number(proposed?.days_count)||Number(existing.days_count)||proposedDays.length||1);
  const payload={
    source_inquiry_id:s(existing.source_inquiry_id||old.sourceInquiryId,80),
    title:s(proposed?.title,500)||s(existing.title,500),
    destination:s(proposed?.destination,300)||s(existing.destination,300),
    days_count:count,
    nights_count:Math.max(0,Number(proposed?.nights_count)||Number(existing.nights_count)||Math.max(0,count-1)),
    customer_name:s(proposed?.customer_name,300)||s(existing.customer_name,300),
    status:s(proposed?.status,60)||s(existing.status,60)||"draft",
    itinerary_data:{
      ...old,
      departureCity:proposed?.departureCity!==undefined?s(proposed.departureCity,300):old.departureCity||"",
      travelStartDate:proposed?.travelStartDate!==undefined?s(proposed.travelStartDate,20):old.travelStartDate||"",
      travelEndDate:proposed?.travelEndDate!==undefined?s(proposed.travelEndDate,20):old.travelEndDate||"",
      pax:proposed?.pax!==undefined?n(proposed.pax,old.pax):old.pax,
      tourType:proposed?.tourType!==undefined?s(proposed.tourType,300):old.tourType||"",
      suggestedFlights:Array.isArray(proposed?.suggestedFlights)?normalizeFlights(proposed.suggestedFlights):(old.suggestedFlights||[]),
      days:proposedDays,
      hotels:Array.isArray(proposed?.hotels)?normalizeHotels(proposed.hotels):(old.hotels||[]),
      includedItems:Array.isArray(proposed?.includedItems)?normalizePackage(proposed.includedItems):(old.includedItems||[]),
      notIncludedItems:Array.isArray(proposed?.notIncludedItems)?normalizePackage(proposed.notIncludedItems):(old.notIncludedItems||[]),
      reminders:Array.isArray(proposed?.reminders)?normalizeReminders(proposed.reminders):(old.reminders||[])
    }
  };
  const {data,error}=await db.rpc("staff_save_itinerary",{p_token:token,p_payload:payload,p_id:id});
  if(error||!data?.ok) return NextResponse.json({error:data?.error||error?.message||"Unable to update itinerary"},{status:400});
  if(threadId){
    await db.rpc("staff_clear_ai_thread_payload_key",{p_token:token,p_thread_id:threadId,p_key:"action"});
    await db.rpc("staff_append_ai_message",{p_token:token,p_thread_id:threadId,p_role:"assistant",p_text:"Itinerary 已更新："+(existing.itinerary_no||id),p_payload:{links:[{label:"Open Itinerary",href:"/itineraries/"+id+"/edit",kind:"itinerary"}]}});
  }
  return NextResponse.json({ok:true,type,id,recordNo:existing.itinerary_no||"",href:"/itineraries/"+id+"/edit",message:"Itinerary updated",contextInquiryId:s(existing.source_inquiry_id||old.sourceInquiryId,80)});
}

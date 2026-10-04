import { NextResponse } from "next/server";
import { internalDb, internalToken } from "@/lib/internalSession";

export async function GET(request:Request){
  const token=await internalToken();
  if(!token) return NextResponse.json({error:"Unauthorized"},{status:401});
  const id=new URL(request.url).searchParams.get("id")||"";
  if(!id) return NextResponse.json({error:"Inquiry ID is required"},{status:400});

  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data?.id) return NextResponse.json({error:error?.message||"Inquiry not found"},{status:404});

  const r=data.operation_review||{};
  const pick=(key:string,original:any)=>Object.prototype.hasOwnProperty.call(r,key)?r[key]:original;
  const salesFlightInformation=data?.inquiry_data?.flightInformation||null;
  const finalFlightInformation=r?.overrideFlightInformation===true&&r?.flightInformation?r.flightInformation:salesFlightInformation;

  return NextResponse.json({ok:true,context:{
    id:data.id,
    inquiryNo:data.inquiry_no||"",
    customerName:data.customer_name||"",
    destination:pick("destination",data.destination)||"",
    departureCity:pick("departureCity",data.departure_city)||"",
    travelStartDate:pick("travelStartDate",data.travel_start_date)||"",
    travelEndDate:pick("travelEndDate",data.travel_end_date)||"",
    daysCount:Number(pick("daysCount",data.days_count))||1,
    pax:pick("pax",data.pax)||"",
    tourType:pick("tourType",data.tour_type)||"",
    flightInformation:finalFlightInformation,
    flightRequirement:pick("flightRequirement",data.flight_requirement)||"",
    hotelRequirement:pick("hotelRequirement",data.hotel_requirement)||"",
    mealRequirement:pick("mealRequirement",data.meal_requirement)||"",
    specialRequest:pick("specialRequest",data.special_request)||"",
    operationNotes:r.operationNotes||""
  }});
}

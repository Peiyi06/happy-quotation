import { notFound } from "next/navigation";
import AiSupplierImport from "@/components/AiSupplierImport";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

export default async function AiImportPage({searchParams}:{searchParams:Promise<{sourceInquiry?:string}>}){
  const user=await internalUser();
  if(!user||!["jess","long"].includes(user.username.toLowerCase())) notFound();

  const {sourceInquiry}=await searchParams;
  let inquiryContext:any=null;

  if(sourceInquiry){
    const token=await internalToken();
    if(token){
      const db=internalDb();
      const {data}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:sourceInquiry});
      if(data?.id){
        const r=data.operation_review||{};
        const pick=(key:string,original:any)=>Object.prototype.hasOwnProperty.call(r,key)?r[key]:original;
        const salesFlights=Array.isArray(data?.inquiry_data?.suggestedFlights)?data.inquiry_data.suggestedFlights:[];
        const finalFlights=r?.overrideSuggestedFlights===true&&Array.isArray(r?.suggestedFlights)?r.suggestedFlights:salesFlights;
        inquiryContext={
          id:data.id,
          inquiryNo:data.inquiry_no||"",
          customerName:data.customer_name||"",
          destination:pick("destination",data.destination)||"",
          departureCity:pick("departureCity",data.departure_city)||"",
          travelStartDate:pick("travelStartDate",data.travel_start_date)||"",
          travelEndDate:pick("travelEndDate",data.travel_end_date)||"",
          daysCount:Number(pick("daysCount",data.days_count))||1,
          nightsCount:Number(pick("nightsCount",data.nights_count))||0,
          pax:pick("pax",data.pax)||"",
          tourType:pick("tourType",data.tour_type)||"",
          suggestedFlights:finalFlights,
          flightRequirement:pick("flightRequirement",data.flight_requirement)||"",
          hotelRequirement:pick("hotelRequirement",data.hotel_requirement)||"",
          mealRequirement:pick("mealRequirement",data.meal_requirement)||"",
          specialRequest:pick("specialRequest",data.special_request)||"",
          operationNotes:r.operationNotes||""
        };
      }
    }
  }

  return <div>
    <div className="page-head">
      <div>
        <span className="page-kicker">OPERATION AI</span>
        <h1>Supplier Itinerary Import</h1>
        <p>供应商文件 → AI 结构化 → Operation Review → Draft Itinerary</p>
      </div>
    </div>
    <AiSupplierImport inquiryContext={inquiryContext}/>
  </div>;
}

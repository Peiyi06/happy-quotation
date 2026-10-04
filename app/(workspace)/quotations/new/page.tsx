import QuotationCalculator from "@/components/QuotationCalculator";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

function buildFlightPrefill(inquiry:any){
  const flights=Array.isArray(inquiry?.operation_review?.overrideSuggestedFlights)
    ? []
    : [];
  const sales=Array.isArray(inquiry?.inquiry_data?.suggestedFlights)?inquiry.inquiry_data.suggestedFlights:[];
  const review=inquiry?.operation_review||{};
  const finalFlights=review.overrideSuggestedFlights===true&&Array.isArray(review.suggestedFlights)?review.suggestedFlights:sales;
  const start=review.travelStartDate||inquiry.travel_start_date||"";
  const end=review.travelEndDate||inquiry.travel_end_date||"";

  let outbound=finalFlights.filter((f:any)=>f?.date===start).slice(0,2);
  let returning=finalFlights.filter((f:any)=>f?.date===end).slice(0,2);

  if(!outbound.length&&!returning.length&&finalFlights.length){
    if(finalFlights.length>=4){
      outbound=finalFlights.slice(0,2);
      returning=finalFlights.slice(-2);
    }else if(finalFlights.length>=2){
      outbound=[finalFlights[0]];
      returning=[finalFlights[finalFlights.length-1]];
    }else{
      outbound=[finalFlights[0]];
    }
  }

  const o1=outbound[0]||{};
  const o2=outbound[1]||{};
  const r1=returning[0]||{};
  const r2=returning[1]||{};

  return {
    outboundFromAirport:o1.from||"",
    outboundToAirport:o1.to||"",
    outboundFlightNo:o1.flightNo||"",
    outboundFlightDate:o1.date||start,
    outboundDepartureTime:o1.departureTime||"",
    outboundArrivalTime:o1.arrivalTime||"",
    outboundTransitOpen:Boolean(outbound[1]),
    outboundTransitFromAirport:o2.from||"",
    outboundTransitToAirport:o2.to||"",
    outboundTransitFlightNo:o2.flightNo||"",
    outboundTransitFlightDate:o2.date||"",
    outboundTransitDepartureTime:o2.departureTime||"",
    outboundTransitArrivalTime:o2.arrivalTime||"",
    returnFromAirport:r1.from||"",
    returnToAirport:r1.to||"",
    returnFlightNo:r1.flightNo||"",
    returnFlightDate:r1.date||end,
    returnDepartureTime:r1.departureTime||"",
    returnArrivalTime:r1.arrivalTime||"",
    returnTransitOpen:Boolean(returning[1]),
    returnTransitFromAirport:r2.from||"",
    returnTransitToAirport:r2.to||"",
    returnTransitFlightNo:r2.flightNo||"",
    returnTransitFlightDate:r2.date||"",
    returnTransitDepartureTime:r2.departureTime||"",
    returnTransitArrivalTime:r2.arrivalTime||""
  };
}

export default async function NewQuotationPage({searchParams}:{searchParams:Promise<{sourceInquiry?:string}>}){
  const user=await internalUser();
  const {sourceInquiry}=await searchParams;
  let initialQuotation:any=undefined;
  let sourceInquiryNo="";
  let sourceInquirySnapshot:any=undefined;

  if(sourceInquiry){
    const token=await internalToken();
    if(token){
      const db=internalDb();
      const {data}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:sourceInquiry});
      if(data?.id){
        const r=data.operation_review||{};
        const pick=(key:string,original:any)=>Object.prototype.hasOwnProperty.call(r,key)?r[key]:original;
        const composition=data?.inquiry_data?.travellerComposition||{};
        const finalComposition=r?.overrideTravellerComposition===true&&r?.travellerComposition?r.travellerComposition:composition;
        const flightPrefill=buildFlightPrefill(data);
        sourceInquiryNo=data.inquiry_no||"";
        sourceInquirySnapshot={
          inquiryNo:data.inquiry_no||"",
          customerName:data.customer_name||"",
          contact:data.contact||"",
          destination:pick("destination",data.destination)||"",
          departureCity:pick("departureCity",data.departure_city)||"",
          travelStartDate:pick("travelStartDate",data.travel_start_date)||"",
          travelEndDate:pick("travelEndDate",data.travel_end_date)||"",
          daysCount:pick("daysCount",data.days_count)||null,
          nightsCount:pick("nightsCount",data.nights_count)||null,
          pax:pick("pax",data.pax)||null,
          tourType:pick("tourType",data.tour_type)||"",
          travellerComposition:finalComposition,
          requirements:{
            flightRequirement:pick("flightRequirement",data.flight_requirement)||"",
            hotelRequirement:pick("hotelRequirement",data.hotel_requirement)||"",
            mealRequirement:pick("mealRequirement",data.meal_requirement)||"",
            transportRequirement:pick("transportRequirement","")||"",
            itineraryRequirement:pick("itineraryRequirement","")||"",
            specialRequest:pick("specialRequest",data.special_request)||""
          },
          salesOwner:data.sales_owner_name||"",
          operationAssignee:data.operation_assignee_name||""
        };
        initialQuotation={
          title:`${sourceInquirySnapshot.destination||"Tour"} Outbound Quotation`,
          destination:sourceInquirySnapshot.destination,
          departure_date:sourceInquirySnapshot.travelStartDate,
          return_date:sourceInquirySnapshot.travelEndDate,
          customer_name:data.customer_name||"",
          business_type:sourceInquirySnapshot.tourType,
          pax:Number(sourceInquirySnapshot.pax)||1,
          status:"draft",
          quotation_data:{
            ...flightPrefill,
            op:data.operation_assignee_name||user?.name||"",
            pax:Number(sourceInquirySnapshot.pax)||1,
            sourceInquiryId:data.id,
            sourceInquiryNo:data.inquiry_no||"",
            sourceInquirySnapshot
          }
        };
      }
    }
  }

  return <QuotationCalculator
    workspaceMode
    initialQuotation={initialQuotation}
    sourceInquiryId={sourceInquiry||""}
    sourceInquiryNo={sourceInquiryNo}
    sourceInquirySnapshot={sourceInquirySnapshot}
    currentStaffId={user?.id||""}
    currentStaffName={user?.name||""}
  />;
}

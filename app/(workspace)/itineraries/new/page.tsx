import ItineraryEditor from "@/components/ItineraryEditor";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

export default async function NewItineraryPage({searchParams}:{searchParams:Promise<{sourceInquiry?:string}>}){
  const user=await internalUser();
  const {sourceInquiry}=await searchParams;
  let initialItinerary:any=undefined;
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
        const salesFlightInformation=data?.inquiry_data?.flightInformation||{};
        const finalFlightInformation=r?.overrideFlightInformation===true&&r?.flightInformation?r.flightInformation:salesFlightInformation;
        const flightLegs=[
          finalFlightInformation?.outbound,
          finalFlightInformation?.outboundTransitOpen?finalFlightInformation?.outboundTransit:null,
          finalFlightInformation?.returning,
          finalFlightInformation?.returnTransitOpen?finalFlightInformation?.returnTransit:null
        ].filter(Boolean);
        const finalFlights=flightLegs.filter((leg:any)=>leg?.fromAirport||leg?.toAirport||leg?.flightNo||leg?.flightDate||leg?.departureTime||leg?.arrivalTime).map((leg:any)=>({
          from:leg.fromAirport||"",
          to:leg.toAirport||"",
          flightNo:leg.flightNo||"",
          date:leg.flightDate||"",
          departureTime:leg.departureTime||"",
          arrivalTime:leg.arrivalTime||"",
          remarks:leg.nextDay?"+1 Next Day":""
        }));
        sourceInquiryNo=data.inquiry_no||"";
        sourceInquirySnapshot={
          inquiryNo:data.inquiry_no||"",
          destination:pick("destination",data.destination)||"",
          departureCity:pick("departureCity",data.departure_city)||"",
          travelStartDate:pick("travelStartDate",data.travel_start_date)||"",
          travelEndDate:pick("travelEndDate",data.travel_end_date)||"",
          daysCount:Number(pick("daysCount",data.days_count))||1,
          pax:pick("pax",data.pax)||"",
          tourType:pick("tourType",data.tour_type)||"",
          salesOwner:data.sales_owner_name||"",
          operationAssignee:data.operation_assignee_name||""
        };
        initialItinerary={
          title:`${sourceInquirySnapshot.destination||"Tour"} ${sourceInquirySnapshot.daysCount}D`,
          destination:sourceInquirySnapshot.destination,
          days_count:sourceInquirySnapshot.daysCount,
          nights_count:0,
          customer_name:data.customer_name||"",
          status:"draft",
          source_inquiry_id:data.id,
          itinerary_data:{
            departureCity:sourceInquirySnapshot.departureCity,
            travelStartDate:sourceInquirySnapshot.travelStartDate,
            travelEndDate:sourceInquirySnapshot.travelEndDate,
            pax:sourceInquirySnapshot.pax,
            tourType:sourceInquirySnapshot.tourType,
            suggestedFlights:finalFlights,
            sourceInquiryId:data.id,
            sourceInquiryNo:data.inquiry_no||"",
            sourceInquirySnapshot,
            days:[]
          }
        };
      }
    }
  }

  return <ItineraryEditor
    initialItinerary={initialItinerary}
    sourceInquiryId={sourceInquiry||""}
    sourceInquiryNo={sourceInquiryNo}
    sourceInquirySnapshot={sourceInquirySnapshot}
    currentStaffId={user?.id||""}
    currentStaffName={user?.name||""}
  />;
}

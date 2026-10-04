import QuotationCalculator from "@/components/QuotationCalculator";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";

function buildFlightInformation(inquiry:any){
  const review=inquiry?.operation_review||{};
  if(review.overrideFlightInformation===true&&review.flightInformation) return review.flightInformation;
  return inquiry?.inquiry_data?.flightInformation||null;
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
        const flightInformation=buildFlightInformation(data);
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
          tour_type:sourceInquirySnapshot.tourType,
          pax:Number(sourceInquirySnapshot.pax)||1,
          status:"draft",
          quotation_data:{
            flightInformation,
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

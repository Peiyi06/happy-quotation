import { createHash } from "crypto";
import { notFound } from "next/navigation";
import { internalDb,internalToken } from "@/lib/internalSession";
import PrintSupplierFormButton from "@/components/PrintSupplierFormButton";
import SupplierFormLanguageControls from "@/components/SupplierFormLanguageControls";

const has=(obj:any,key:string)=>Object.prototype.hasOwnProperty.call(obj||{},key);
const displayDate=(v:string)=>{
  if(!v) return "—";
  const p=v.split("-");
  return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v;
};

export default async function SupplierInquiryFormPage({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{lang?:string;returnTo?:string}>;
}){
  const {id}=await params;
  const sp=await searchParams;
  const token=await internalToken();
  if(!token) notFound();

  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const r=data.operation_review||{};
  const s=data.supplier_inquiry||{};
  const pick=(key:string,original:any)=>has(r,key)?r[key]:original;

  const destination=pick("destination",data.destination)||"";
  const departureCity=pick("departureCity",data.departure_city)||"";
  const startDate=pick("travelStartDate",data.travel_start_date)||"";
  const endDate=pick("travelEndDate",data.travel_end_date)||"";
  const days=Number(pick("daysCount",data.days_count))||1;
  const nights=Number(pick("nightsCount",data.nights_count))||0;
  const pax=pick("pax",data.pax);
  const budget=pick("budget",data.budget)||"";
  const tourType=pick("tourType",data.tour_type)||"";
  const flight=pick("flightRequirement",data.flight_requirement)||"";
  const hotel=pick("hotelRequirement",data.hotel_requirement)||"";
  const meals=pick("mealRequirement",data.meal_requirement)||"";
  const special=pick("specialRequest",data.special_request)||"";
  const transport=pick("transportRequirement","")||"";
  const itinerary=pick("itineraryRequirement","")||"";
  const salesFlights=Array.isArray(data?.inquiry_data?.suggestedFlights)?data.inquiry_data.suggestedFlights:[];
  const finalFlights=r?.overrideSuggestedFlights===true&&Array.isArray(r?.suggestedFlights)?r.suggestedFlights:salesFlights;
  const salesComposition=data?.inquiry_data?.travellerComposition||{};
  const finalComposition=r?.overrideTravellerComposition===true&&r?.travellerComposition?r.travellerComposition:salesComposition;

  const translationSource={
    destination:String(destination),
    departureCity:String(departureCity),
    tourType:String(tourType),
    flightRequirement:String(flight),
    hotelRequirement:String(hotel),
    mealRequirement:String(meals),
    transportationRequirement:String(transport),
    itineraryRequirement:String(itinerary),
    specialRequest:String(special),
    supplierRemarks:String(s.remarks||""),
    seniorNotes:String(finalComposition.seniorNotes||""),
    childAges:String(finalComposition.childAges||""),
    childNotes:String(finalComposition.childNotes||""),
    mobilityNotes:String(finalComposition.mobilityNotes||""),
    flightRemarks:finalFlights.map((f:any)=>String(f?.remarks||""))
  };
  const sourceHash=createHash("sha256").update(JSON.stringify(translationSource)).digest("hex");
  const translations=data.supplier_form_translations||{};
  const englishReady=translations?.en?.sourceHash===sourceHash&&Boolean(translations?.en?.data);
  const chineseReady=translations?.zh?.sourceHash===sourceHash&&Boolean(translations?.zh?.data);
  const requestedLanguage=sp.lang==="en"?"en":sp.lang==="zh"?"zh":"original";
  const translated=requestedLanguage==="en"&&englishReady?translations.en.data:requestedLanguage==="zh"&&chineseReady?translations.zh.data:null;
  const language:( "original"|"en"|"zh")=translated?requestedLanguage:"original";
  const rawReturnTo=String(sp.returnTo||"");
  const returnTo=rawReturnTo.startsWith("/")&&!rawReturnTo.startsWith("//")?rawReturnTo:"/inquiries";
  const returnParam=encodeURIComponent(returnTo);
  const operationReviewHref="/inquiries/"+id+"/operation?returnTo="+returnParam;

  const L=(en:string,zh:string)=>language==="en"?en:language==="zh"?zh:`${en}｜${zh}`;
  const V=(key:string,original:any)=>translated&&typeof translated[key]==="string"&&translated[key]?translated[key]:original;

  const displayDestination=V("destination",destination)||"—";
  const displayDepartureCity=V("departureCity",departureCity)||"—";
  const displayTourType=V("tourType",tourType)||"—";
  const displayFlight=V("flightRequirement",flight)||"—";
  const displayHotel=V("hotelRequirement",hotel)||"—";
  const displayMeals=V("mealRequirement",meals)||"—";
  const displayTransport=V("transportationRequirement",transport)||"—";
  const displayItinerary=V("itineraryRequirement",itinerary)||"—";
  const displaySpecial=V("specialRequest",special)||"—";
  const displaySupplierRemarks=V("supplierRemarks",s.remarks||"")||"—";

  const hasComposition=finalComposition.adultCount!=null||finalComposition.seniorCount!=null||finalComposition.childCount!=null;
  const compositionTotal=(Number(finalComposition.adultCount)||0)+(Number(finalComposition.seniorCount)||0)+(Number(finalComposition.childCount)||0);

  const tripRows=[
    [L("Destination","目的地"),displayDestination],
    [L("Departure City","出发城市"),displayDepartureCity],
    [L("Travel Date","旅游日期"),`${displayDate(startDate)} - ${displayDate(endDate)}`],
    [L("Duration","天数"),language==="zh"?`${days}天${nights}晚`:`${days} Days ${nights} Nights`],
    [L("Pax","人数"),pax?String(pax):"—"],
    [L("Tour Type","团型"),displayTourType]
  ];

  const requirementRows=[
    [L("Flight Requirement","航班需求"),displayFlight],
    [L("Hotel Requirement","酒店需求"),displayHotel],
    [L("Meal Requirement","餐食需求"),displayMeals],
    [L("Transportation","交通需求"),displayTransport],
    [L("Itinerary Requirement","行程要求"),displayItinerary]
  ];
  if(s.showBudget) requirementRows.push([L("Budget","预算"),budget||"—"]);

  const Header=()=> <header className="supplier-pro-header">
    <div>
      <span>HAPPY EXPRESS TRAVEL</span>
      <h1>{language==="zh"?"供应商询价单":"SUPPLIER INQUIRY FORM"}</h1>
      <p>{language==="zh"?"地接安排 / 旅游报价请求":"Ground Arrangement / Tour Quotation Request"}</p>
    </div>
    <div className="supplier-pro-map" aria-hidden="true"><span>✈</span></div>
  </header>;

  const Footer=()=> <footer className="supplier-pro-footer">
    <strong>Happy Express Travel</strong>
    <span>{language==="zh"?"请根据以上需求提供贵司最优惠报价及建议安排。":"Please provide your best quotation and proposed arrangement based on the requirements above."}</span>
  </footer>;

  const InfoCards=()=> <section className="supplier-info-cards">
    <div><b>▣</b><span>{language==="zh"?"询价编号":"INQUIRY NO."}</span><strong>{data.inquiry_no}</strong></div>
    <div><b>👥</b><span>{language==="zh"?"客户 / 公司":"CUSTOMER / COMPANY"}</span><strong>{data.customer_name||"—"}</strong></div>
    <div><b>●</b><span>{language==="zh"?"负责人":"PREPARED BY"}</span><strong>{data.operation_assignee_name||"Operation"}</strong></div>
    <div><b>▦</b><span>{language==="zh"?"报价截止":"QUOTATION DEADLINE"}</span><strong>{displayDate(s.quoteDeadline||"")}</strong></div>
  </section>;

  const SectionTitle=({icon,en,zh}:{icon:string;en:string;zh:string})=><div className="supplier-section-title"><span>{icon}</span><h2>{L(en,zh)}</h2></div>;

  const detailRows=(rows:any[])=><div className="supplier-pro-table">
    {rows.map(([label,value])=><div className="supplier-pro-row" key={label}><span>{label}</span><p>{value}</p></div>)}
  </div>;

  return <div className="supplier-form-page">
    <div className="supplier-form-toolbar">
      <a className="btn" href={operationReviewHref}>← Operation Review</a>
      <div className="supplier-form-toolbar-right">
        <SupplierFormLanguageControls
          inquiryId={id}
          currentLanguage={language}
          englishReady={englishReady}
          chineseReady={chineseReady}
          returnTo={returnTo}
        />
        <PrintSupplierFormButton
          inquiryId={id}
          inquiryNo={data.inquiry_no||""}
          destination={String(destination||"")}
          customerName={String(data.customer_name||"")}
          startDate={String(startDate||"")}
        />
      </div>
    </div>

    <main className="supplier-pro-document">
      <section className="supplier-print-page supplier-print-page-one">
        <Header/>
        <InfoCards/>

        <div className="supplier-two-column">
          <section className="supplier-pro-section">
            <SectionTitle icon="▣" en="TRIP DETAILS" zh="行程资料"/>
            {detailRows(tripRows)}
          </section>

          {hasComposition&&<section className="supplier-pro-section">
            <SectionTitle icon="👥" en="TRAVELLER COMPOSITION" zh="旅客组成"/>
            {detailRows([
              [L("Adult","成人"),finalComposition.adultCount??"—"],
              [L("Senior","老人"),finalComposition.seniorCount??"—"],
              [L("Child","小孩"),finalComposition.childCount??"—"],
              [L("Child Age(s)","小孩年龄"),V("childAges",finalComposition.childAges||"")||"—"],
              [L("Special Needs","特殊需求"),V("mobilityNotes",finalComposition.mobilityNotes||"")||"—"],
              [L("Notes","备注"),[
                V("seniorNotes",finalComposition.seniorNotes||""),
                V("childNotes",finalComposition.childNotes||"")
              ].filter(Boolean).join(language==="zh"?"；":"; ")||"—"],
              [L("Total","合计"),compositionTotal]
            ])}
          </section>}
        </div>

        <section className="supplier-pro-section">
          <SectionTitle icon="⚙" en="ARRANGEMENT REQUIREMENTS" zh="安排要求"/>
          {detailRows(requirementRows)}
        </section>

        <section className="supplier-pro-section">
          <SectionTitle icon="▤" en="SPECIAL REQUEST & REMARKS" zh="特别要求 & 备注"/>
          {detailRows([
            [L("Special Request","特别要求"),displaySpecial],
            [L("Remarks","备注"),displaySupplierRemarks]
          ])}
        </section>

        {finalFlights.length>0&&<section className="supplier-pro-section supplier-flight-section">
          <SectionTitle icon="✈" en="SUGGESTED FLIGHTS" zh="建议航班"/>
          <div className="supplier-flight-table supplier-pro-flight-table">
            <div className="supplier-flight-head">
              <span>{language==="zh"?"航线":"Route"}</span>
              <span>{language==="zh"?"航班":"Flight"}</span>
              <span>{language==="zh"?"日期":"Date"}</span>
              <span>{language==="zh"?"出发":"Departure"}</span>
              <span>{language==="zh"?"抵达":"Arrival"}</span>
              <span>{language==="zh"?"备注":"Remarks"}</span>
            </div>
            {finalFlights.map((f:any,index:number)=><div className="supplier-flight-row" key={f.id||index}>
              <span><strong>{f.from||"—"} → {f.to||"—"}</strong></span>
              <span>{f.flightNo||"—"}</span>
              <span>{displayDate(f.date||"")}</span>
              <span>{f.departureTime||"—"}</span>
              <span>{f.arrivalTime||"—"}</span>
              <span>{translated?.flightRemarks?.[index]||f.remarks||"—"}</span>
            </div>)}
          </div>
        </section>}

        <Footer/>
      </section>
    </main>
  </div>;
}

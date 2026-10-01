import { notFound } from "next/navigation";
import { internalDb,internalToken } from "@/lib/internalSession";
import PrintSupplierFormButton from "@/components/PrintSupplierFormButton";

const has=(obj:any,key:string)=>Object.prototype.hasOwnProperty.call(obj||{},key);
const displayDate=(v:string)=>{
  if(!v) return "—";
  const p=v.split("-");
  return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v;
};

export default async function SupplierInquiryFormPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
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

  const hasComposition=finalComposition.adultCount!=null||finalComposition.seniorCount!=null||finalComposition.childCount!=null;
  const compositionTotal=(Number(finalComposition.adultCount)||0)+(Number(finalComposition.seniorCount)||0)+(Number(finalComposition.childCount)||0);

  const tripRows=[
    ["Destination｜目的地",destination||"—"],
    ["Departure City｜出发城市",departureCity||"—"],
    ["Travel Date｜旅游日期",`${displayDate(startDate)} - ${displayDate(endDate)}`],
    ["Duration｜天数",`${days} Days ${nights} Nights`],
    ["Pax｜人数",pax?String(pax):"—"],
    ["Tour Type｜团型",tourType||"—"]
  ];

  const requirementRows=[
    ["Flight Requirement｜航班需求",flight||"—"],
    ["Hotel Requirement｜酒店需求",hotel||"—"],
    ["Meal Requirement｜餐食需求",meals||"—"],
    ["Transportation｜交通需求",transport||"—"],
    ["Itinerary Requirement｜行程要求",itinerary||"—"]
  ];
  if(s.showBudget) requirementRows.push(["Budget｜预算",budget||"—"]);

  const Header=()=> <header className="supplier-pro-header">
    <div>
      <span>HAPPY EXPRESS TRAVEL</span>
      <h1>SUPPLIER INQUIRY FORM</h1>
      <p>Ground Arrangement / Tour Quotation Request</p>
    </div>
    <div className="supplier-pro-map" aria-hidden="true">
      <span>✈</span>
    </div>
  </header>;

  const Footer=()=> <footer className="supplier-pro-footer">
    <strong>Happy Express Travel</strong>
    <span>Please provide your best quotation and proposed arrangement based on the requirements above.</span>
  </footer>;

  const InfoCards=()=> <section className="supplier-info-cards">
    <div><b>▣</b><span>INQUIRY NO.</span><strong>{data.inquiry_no}</strong></div>
    <div><b>👥</b><span>CUSTOMER / COMPANY</span><strong>{data.customer_name||"—"}</strong></div>
    <div><b>●</b><span>PREPARED BY</span><strong>{data.operation_assignee_name||"Operation"}</strong></div>
    <div><b>▦</b><span>QUOTATION DEADLINE</span><strong>{displayDate(s.quoteDeadline||"")}</strong></div>
  </section>;

  const SectionTitle=({icon,title}:{icon:string;title:string})=><div className="supplier-section-title"><span>{icon}</span><h2>{title}</h2></div>;

  const detailRows=(rows:any[])=><div className="supplier-pro-table">
    {rows.map(([label,value])=><div className="supplier-pro-row" key={label}><span>{label}</span><p>{value}</p></div>)}
  </div>;

  const hasPageTwo=finalFlights.length>0||Boolean(s.remarks);

  return <div className="supplier-form-page">
    <div className="supplier-form-toolbar">
      <a className="btn" href={"/inquiries/"+id+"/operation"}>← Operation Review</a>
      <PrintSupplierFormButton/>
    </div>

    <main className="supplier-pro-document">
      <section className="supplier-print-page supplier-print-page-one">
        <Header/>
        <InfoCards/>

        <div className="supplier-two-column">
          <section className="supplier-pro-section">
            <SectionTitle icon="▣" title="TRIP DETAILS｜行程资料"/>
            {detailRows(tripRows)}
          </section>

          {hasComposition&&<section className="supplier-pro-section">
            <SectionTitle icon="👥" title="TRAVELLER COMPOSITION｜旅客组成"/>
            {detailRows([
              ["Adult｜成人",finalComposition.adultCount??"—"],
              ["Senior｜老人",finalComposition.seniorCount??"—"],
              ["Child｜小孩",finalComposition.childCount??"—"],
              ["Child Age(s)｜小孩年龄",finalComposition.childAges||"—"],
              ["Special Needs｜特殊需求",finalComposition.mobilityNotes||"—"],
              ["Notes｜备注",[finalComposition.seniorNotes,finalComposition.childNotes].filter(Boolean).join("；")||"—"],
              ["Total｜合计",compositionTotal]
            ])}
          </section>}
        </div>

        <section className="supplier-pro-section">
          <SectionTitle icon="⚙" title="ARRANGEMENT REQUIREMENTS｜安排要求"/>
          {detailRows(requirementRows)}
        </section>

        {!hasPageTwo&&<section className="supplier-pro-section">
          <SectionTitle icon="▤" title="SPECIAL REQUEST & REMARKS｜特别要求 & 备注"/>
          {detailRows([
            ["Special Request｜特别要求",special||"—"],
            ["Remarks｜备注",s.remarks||"—"]
          ])}
        </section>}

        <Footer/>
      </section>

      {hasPageTwo&&<section className="supplier-print-page supplier-print-page-two">
        <Header/>

        {finalFlights.length>0&&<section className="supplier-pro-section supplier-flight-section">
          <SectionTitle icon="✈" title="SUGGESTED FLIGHTS｜建议航班"/>
          <div className="supplier-flight-table supplier-pro-flight-table">
            <div className="supplier-flight-head"><span>Route</span><span>Flight</span><span>Date</span><span>Departure</span><span>Arrival</span><span>Remarks</span></div>
            {finalFlights.map((f:any,index:number)=><div className="supplier-flight-row" key={f.id||index}>
              <span><strong>{f.from||"—"} → {f.to||"—"}</strong></span>
              <span>{f.flightNo||"—"}</span>
              <span>{displayDate(f.date||"")}</span>
              <span>{f.departureTime||"—"}</span>
              <span>{f.arrivalTime||"—"}</span>
              <span>{f.remarks||"—"}</span>
            </div>)}
          </div>
        </section>}

        <section className="supplier-pro-section supplier-long-section">
          <SectionTitle icon="▤" title="SPECIAL REQUEST & REMARKS｜特别要求 & 备注"/>
          {detailRows([
            ["Special Request｜特别要求",special||"—"],
            ["Remarks｜备注",s.remarks||"—"]
          ])}
        </section>

        <Footer/>
      </section>}
    </main>
  </div>;
}

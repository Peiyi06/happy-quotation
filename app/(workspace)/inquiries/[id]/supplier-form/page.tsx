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
  const compositionTotal=(Number(finalComposition.adultCount)||0)+(Number(finalComposition.seniorCount)||0)+(Number(finalComposition.childCount)||0);

  const rows=[
    ["Destination｜目的地",destination],
    ["Departure City｜出发城市",departureCity],
    ["Travel Date｜旅游日期",`${displayDate(startDate)} - ${displayDate(endDate)}`],
    ["Duration｜天数",`${days} Days ${nights} Nights`],
    ["Pax｜人数",pax?String(pax):"—"],
    ["Tour Type｜团型",tourType||"—"],
    ["Flight Requirement｜航班需求",flight||"—"],
    ["Hotel Requirement｜酒店需求",hotel||"—"],
    ["Meal Requirement｜餐食需求",meals||"—"],
    ["Transportation｜交通需求",transport||"—"],
    ["Itinerary Requirement｜行程要求",itinerary||"—"],
    ["Special Request｜特别要求",special||"—"]
  ];
  if(s.showBudget) rows.splice(6,0,["Budget｜预算",budget||"—"]);

  return <div className="supplier-form-page">
    <div className="supplier-form-toolbar">
      <a className="btn" href={"/inquiries/"+id+"/operation"}>← Operation Review</a>
      <PrintSupplierFormButton/>
    </div>

    <main className="supplier-form-sheet">
      <header className="supplier-form-header">
        <div>
          <span>HAPPY EXPRESS TRAVEL</span>
          <h1>SUPPLIER INQUIRY FORM</h1>
          <p>Ground Arrangement / Tour Quotation Request</p>
        </div>
        <div className="supplier-form-ref">
          <small>INQUIRY NO.</small>
          <strong>{data.inquiry_no}</strong>
        </div>
      </header>

      <section className="supplier-form-intro">
        <div><span>Customer / Company</span><strong>{data.customer_name||"—"}</strong></div>
        <div><span>Prepared By</span><strong>{data.operation_assignee_name||"Operation"}</strong></div>
        <div><span>Quotation Deadline</span><strong>{displayDate(s.quoteDeadline||"")}</strong></div>
      </section>

      <section className="supplier-form-details">
        {rows.map(([label,value])=><div key={label} className="supplier-form-row">
          <span>{label}</span>
          <p>{value}</p>
        </div>)}
      </section>

      {(finalComposition.adultCount!=null||finalComposition.seniorCount!=null||finalComposition.childCount!=null)&&<section className="supplier-form-composition">
        <h2>Traveller Composition｜旅客组成</h2>
        <div className="supplier-composition-grid">
          <div><span>Adult｜成人</span><strong>{finalComposition.adultCount??"—"}</strong></div>
          <div><span>Senior｜老人</span><strong>{finalComposition.seniorCount??"—"}</strong></div>
          <div><span>Child｜小孩</span><strong>{finalComposition.childCount??"—"}</strong></div>
          <div><span>Total｜合计</span><strong>{compositionTotal}</strong></div>
        </div>
        {(finalComposition.seniorNotes||finalComposition.childAges||finalComposition.childNotes||finalComposition.mobilityNotes)&&<div className="supplier-composition-notes">
          {finalComposition.seniorNotes&&<div><span>Senior Notes｜老人备注</span><p>{finalComposition.seniorNotes}</p></div>}
          {finalComposition.childAges&&<div><span>Child Ages｜小孩年龄</span><p>{finalComposition.childAges}</p></div>}
          {finalComposition.childNotes&&<div><span>Child Notes｜小孩备注</span><p>{finalComposition.childNotes}</p></div>}
          {finalComposition.mobilityNotes&&<div><span>Mobility / Care｜行动与照顾需求</span><p>{finalComposition.mobilityNotes}</p></div>}
        </div>}
      </section>}

      {finalFlights.length>0&&<section className="supplier-form-flights">
        <h2>Suggested Flights｜推荐航班</h2>
        <div className="supplier-flight-table">
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

      {s.remarks&&<section className="supplier-form-remarks"><h2>Remarks｜备注</h2><p>{s.remarks}</p></section>}

      <footer className="supplier-form-footer">
        <strong>Happy Express Travel</strong>
        <span>Please provide your best quotation and proposed arrangement based on the requirements above.</span>
      </footer>
    </main>
  </div>;
}

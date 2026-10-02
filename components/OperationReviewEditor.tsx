"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const has=(obj:any,key:string)=>Object.prototype.hasOwnProperty.call(obj||{},key);
type InquiryFlight={id:string;from:string;to:string;flightNo:string;date:string;departureTime:string;arrivalTime:string;remarks:string};
const flightUid=()=>Math.random().toString(36).slice(2,10);
const emptyFlight=():InquiryFlight=>({id:flightUid(),from:"",to:"",flightNo:"",date:"",departureTime:"",arrivalTime:"",remarks:""});

function FlightSummary({flights}:{flights:InquiryFlight[]}){
  if(!flights.length) return <div className="operation-inline-empty">No suggested flights.</div>;
  return <div className="operation-flight-summary-list">
    {flights.map((f,index)=><div className="operation-flight-summary" key={f.id||index}>
      <b>{f.from||"—"} → {f.to||"—"}</b>
      <span>{f.flightNo||"—"}</span>
      <span>{f.date||"—"}</span>
      <span>{f.departureTime||"—"} → {f.arrivalTime||"—"}</span>
      {f.remarks&&<em>{f.remarks}</em>}
    </div>)}
  </div>;
}

export default function OperationReviewEditor({
  inquiry,
  canEdit,
  returnTo="/inquiries"
}:{inquiry:any;canEdit:boolean;returnTo?:string}){
  const router=useRouter();
  const returnParam=encodeURIComponent(returnTo);
  const inquiryHref="/inquiries/"+inquiry.id+"?returnTo="+returnParam;
  const supplierFormHref="/inquiries/"+inquiry.id+"/supplier-form?returnTo="+returnParam;
  const initial=inquiry.operation_review||{};
  const initialSupplier=inquiry.supplier_inquiry||{};
  const salesComposition=inquiry?.inquiry_data?.travellerComposition||{};
  const salesSuggestedFlights:InquiryFlight[]=Array.isArray(inquiry?.inquiry_data?.suggestedFlights)?inquiry.inquiry_data.suggestedFlights:[];

  const [showFullSales,setShowFullSales]=useState(false);
  const [destination,setDestination]=useState(has(initial,"destination")?initial.destination:(inquiry.destination||""));
  const [departureCity,setDepartureCity]=useState(has(initial,"departureCity")?initial.departureCity:(inquiry.departure_city||""));
  const [startDate,setStartDate]=useState(has(initial,"travelStartDate")?initial.travelStartDate:(inquiry.travel_start_date||""));
  const [endDate,setEndDate]=useState(has(initial,"travelEndDate")?initial.travelEndDate:(inquiry.travel_end_date||""));
  const [days,setDays]=useState(Number(has(initial,"daysCount")?initial.daysCount:inquiry.days_count)||1);
  const [nights,setNights]=useState(Number(has(initial,"nightsCount")?initial.nightsCount:inquiry.nights_count)||0);
  const [pax,setPax]=useState<number|"">(has(initial,"pax")?initial.pax:(inquiry.pax??""));
  const [budget,setBudget]=useState(has(initial,"budget")?initial.budget:(inquiry.budget||""));
  const [tourType,setTourType]=useState(has(initial,"tourType")?initial.tourType:(inquiry.tour_type||""));
  const [flight,setFlight]=useState(has(initial,"flightRequirement")?initial.flightRequirement:(inquiry.flight_requirement||""));
  const [hotel,setHotel]=useState(has(initial,"hotelRequirement")?initial.hotelRequirement:(inquiry.hotel_requirement||""));
  const [meals,setMeals]=useState(has(initial,"mealRequirement")?initial.mealRequirement:(inquiry.meal_requirement||""));
  const [special,setSpecial]=useState(has(initial,"specialRequest")?initial.specialRequest:(inquiry.special_request||""));
  const [transport,setTransport]=useState(initial.transportRequirement||"");
  const [itineraryReq,setItineraryReq]=useState(initial.itineraryRequirement||"");
  const [operationNotes,setOperationNotes]=useState(initial.operationNotes||"");

  const [overrideFlights,setOverrideFlights]=useState(Boolean(initial.overrideSuggestedFlights));
  const [editingFlights,setEditingFlights]=useState(false);
  const [operationFlights,setOperationFlights]=useState<InquiryFlight[]>(
    Array.isArray(initial.suggestedFlights)&&initial.suggestedFlights.length?initial.suggestedFlights:salesSuggestedFlights
  );

  const [quoteDeadline,setQuoteDeadline]=useState(initialSupplier.quoteDeadline||"");
  const [supplierRemarks,setSupplierRemarks]=useState(initialSupplier.remarks||"");
  const [showBudget,setShowBudget]=useState(Boolean(initialSupplier.showBudget));
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  function startEditingFlights(){
    if(!overrideFlights){
      setOverrideFlights(true);
      setOperationFlights(salesSuggestedFlights.length?salesSuggestedFlights.map(f=>({...f,id:f.id||flightUid()})):[emptyFlight()]);
    }else if(operationFlights.length===0){
      setOperationFlights([emptyFlight()]);
    }
    setEditingFlights(true);
  }

  function useSalesFlights(){
    setOverrideFlights(false);
    setEditingFlights(false);
  }

  async function save(){
    setSaving(true);setMessage("");
    try{
      const review={
        destination,departureCity,travelStartDate:startDate,travelEndDate:endDate,
        daysCount:days,nightsCount:nights,pax,budget,tourType,
        flightRequirement:flight,hotelRequirement:hotel,mealRequirement:meals,
        specialRequest:special,transportRequirement:transport,
        itineraryRequirement:itineraryReq,operationNotes,
        overrideSuggestedFlights:overrideFlights,
        suggestedFlights:overrideFlights?operationFlights:salesSuggestedFlights,
        overrideTravellerComposition:false,
        travellerComposition:salesComposition
      };
      const supplier={quoteDeadline,remarks:supplierRemarks,showBudget};
      const res=await fetch("/api/internal-operation-review",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          id:inquiry.id,
          review,
          supplier,
          supplierStatus:inquiry.supplier_inquiry_status||"draft"
        })
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setMessage(data?.error||"Unable to save.");return;}
      setMessage("Saved");
      router.refresh();
    }finally{setSaving(false);}
  }

  const activeFlights=overrideFlights?operationFlights:salesSuggestedFlights;

  return <div className="operation-review-editor operation-review-simplified">
    <section className="panel operation-customer-brief">
      <div className="panel-head">
        <div>
          <h2>Customer Brief｜客户需求摘要</h2>
          <p className="panel-subtext">快速确认 Sales 收到的原始客户需求；Operation 修改不会覆盖 Sales 原始资料。</p>
        </div>
        <button className="btn operation-secondary-btn" type="button" onClick={()=>setShowFullSales(v=>!v)}>
          {showFullSales?"Hide Full Details":"View Full Sales Details"}
        </button>
      </div>

      <div className="operation-brief-grid">
        <div><span>Customer</span><strong>{inquiry.customer_name||"—"}</strong></div>
        <div><span>Destination</span><strong>{inquiry.destination||"—"}</strong></div>
        <div><span>Travel Date</span><strong>{inquiry.travel_start_date||"—"}{inquiry.travel_end_date?" → "+inquiry.travel_end_date:""}</strong></div>
        <div><span>Duration</span><strong>{inquiry.days_count}D{inquiry.nights_count}N</strong></div>
        <div><span>Pax</span><strong>{inquiry.pax||"—"}</strong></div>
        <div><span>Budget</span><strong>{inquiry.budget||"—"}</strong></div>
        <div><span>Tour Type</span><strong>{inquiry.tour_type||"—"}</strong></div>
        <div><span>Sales Owner</span><strong>{inquiry.sales_owner_name||"—"}</strong></div>
      </div>

      <div className="operation-brief-requirements">
        <div><span>Flight</span><p>{inquiry.flight_requirement||"—"}</p></div>
        <div><span>Hotel</span><p>{inquiry.hotel_requirement||"—"}</p></div>
        <div><span>Meal</span><p>{inquiry.meal_requirement||"—"}</p></div>
        <div><span>Special Request</span><p>{inquiry.special_request||"—"}</p></div>
      </div>

      {showFullSales&&<div className="operation-full-sales">
        <div className="operation-subsection-head">
          <div><h3>Traveller Details｜旅客资料</h3><p>只读 · 使用 Sales 原始资料</p></div>
        </div>
        <div className="traveller-summary-grid">
          <div><span>Adult</span><strong>{salesComposition.adultCount??"—"}</strong></div>
          <div><span>Senior</span><strong>{salesComposition.seniorCount??"—"}</strong></div>
          <div><span>Child</span><strong>{salesComposition.childCount??"—"}</strong></div>
        </div>
        {(salesComposition.seniorNotes||salesComposition.childAges||salesComposition.childNotes||salesComposition.mobilityNotes)&&
          <div className="inquiry-detail-grid composition-detail-grid">
            <div><span>Senior Notes</span><p>{salesComposition.seniorNotes||"—"}</p></div>
            <div><span>Child Ages</span><p>{salesComposition.childAges||"—"}</p></div>
            <div><span>Child Notes</span><p>{salesComposition.childNotes||"—"}</p></div>
            <div><span>Mobility / Care</span><p>{salesComposition.mobilityNotes||"—"}</p></div>
          </div>}
        <div className="operation-subsection-head operation-sales-flights-head">
          <div><h3>Sales Suggested Flights｜销售推荐航班</h3><p>只读 · Sales 原始推荐</p></div>
        </div>
        <FlightSummary flights={salesSuggestedFlights}/>
      </div>}
    </section>

    <section className="panel operation-plan-panel">
      <div className="panel-head">
        <div>
          <h2>Operation Plan｜操作确认</h2>
          <p className="panel-subtext">整理真正需要给 Supplier 执行的版本。</p>
        </div>
      </div>

      <div className="operation-subsection">
        <div className="operation-subsection-head"><div><h3>Trip Details</h3><p>行程基础资料</p></div></div>
        <div className="itinerary-meta-grid">
          <label className="field"><span>Departure City</span><input disabled={!canEdit} value={departureCity} onChange={e=>setDepartureCity(e.target.value)}/></label>
          <label className="field"><span>Destination</span><input disabled={!canEdit} value={destination} onChange={e=>setDestination(e.target.value)}/></label>
          <label className="field"><span>Travel Start Date</span><input disabled={!canEdit} type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
          <label className="field"><span>Travel End Date</span><input disabled={!canEdit} type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
          <label className="field"><span>Days</span><input disabled={!canEdit} type="number" min="1" value={days} onChange={e=>setDays(Math.max(1,Number(e.target.value)||1))}/></label>
          <label className="field"><span>Nights</span><input disabled={!canEdit} type="number" min="0" value={nights} onChange={e=>setNights(Math.max(0,Number(e.target.value)||0))}/></label>
          <label className="field"><span>Pax</span><input disabled={!canEdit} type="number" min="1" value={pax} onChange={e=>setPax(e.target.value===""?"":Math.max(1,Number(e.target.value)||1))}/></label>
          <label className="field"><span>Tour Type</span><input disabled={!canEdit} value={tourType} onChange={e=>setTourType(e.target.value)}/></label>
          <label className="field"><span>Budget</span><input disabled={!canEdit} value={budget} onChange={e=>setBudget(e.target.value)}/></label>
        </div>
      </div>

      <div className="operation-subsection operation-traveller-readonly">
        <div className="operation-subsection-head">
          <div><h3>Traveller Details｜旅客资料</h3><p>沿用 Sales 原始资料，Operation 不需要再次编辑。</p></div>
        </div>
        <div className="operation-traveller-line">
          <span>Adult <b>{salesComposition.adultCount??"—"}</b></span>
          <span>Senior <b>{salesComposition.seniorCount??"—"}</b></span>
          <span>Child <b>{salesComposition.childCount??"—"}</b></span>
        </div>
      </div>

      <div className="operation-subsection">
        <div className="operation-subsection-head">
          <div>
            <h3>Suggested Flights｜推荐航班</h3>
            <p>{overrideFlights?"Using Operation flights":"Using Sales suggested flights"}</p>
          </div>
          {canEdit&&<div className="operation-subsection-actions">
            {overrideFlights&&<button className="btn operation-secondary-btn" type="button" onClick={useSalesFlights}>Use Sales Flights</button>}
            <button className="btn" type="button" onClick={startEditingFlights}>{overrideFlights?"Edit Flights":"Change Flights"}</button>
          </div>}
        </div>

        {!editingFlights&&<FlightSummary flights={activeFlights}/>}
        {editingFlights&&<div className="inquiry-flight-list operation-flight-editor">
          {operationFlights.map((f,index)=><div className="inquiry-flight-card" key={f.id}>
            <div className="inquiry-flight-card-head">
              <strong>Operation Flight {index+1}</strong>
              <button disabled={!canEdit} className="btn danger" type="button" onClick={()=>setOperationFlights(prev=>prev.filter(x=>x.id!==f.id))}>Delete</button>
            </div>
            <div className="itinerary-meta-grid">
              <label className="field"><span>From</span><input disabled={!canEdit} maxLength={3} value={f.from} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,from:e.target.value.toUpperCase()}:x))}/></label>
              <label className="field"><span>To</span><input disabled={!canEdit} maxLength={3} value={f.to} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,to:e.target.value.toUpperCase()}:x))}/></label>
              <label className="field"><span>Flight No.</span><input disabled={!canEdit} value={f.flightNo} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,flightNo:e.target.value.toUpperCase()}:x))}/></label>
              <label className="field"><span>Date</span><input disabled={!canEdit} type="date" value={f.date} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,date:e.target.value}:x))}/></label>
              <label className="field"><span>Departure</span><input disabled={!canEdit} type="time" value={f.departureTime} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,departureTime:e.target.value}:x))}/></label>
              <label className="field"><span>Arrival</span><input disabled={!canEdit} type="time" value={f.arrivalTime} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,arrivalTime:e.target.value}:x))}/></label>
              <label className="field inquiry-flight-remarks"><span>Remarks</span><input disabled={!canEdit} value={f.remarks} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,remarks:e.target.value}:x))}/></label>
            </div>
          </div>)}
          <div className="operation-flight-editor-actions">
            <button className="btn" type="button" onClick={()=>setOperationFlights(prev=>[...prev,emptyFlight()])}>+ Add Flight</button>
            <button className="btn primary" type="button" onClick={()=>setEditingFlights(false)}>Done</button>
          </div>
        </div>}
      </div>

      <div className="operation-subsection">
        <div className="operation-subsection-head"><div><h3>Requirements</h3><p>Supplier 执行时需要参考的要求</p></div></div>
        <div className="inquiry-requirement-grid operation-review-fields">
          <label className="field"><span>Flight Requirement｜航班需求</span><textarea disabled={!canEdit} value={flight} onChange={e=>setFlight(e.target.value)}/></label>
          <label className="field"><span>Hotel Requirement｜酒店需求</span><textarea disabled={!canEdit} value={hotel} onChange={e=>setHotel(e.target.value)}/></label>
          <label className="field"><span>Meal Requirement｜餐食需求</span><textarea disabled={!canEdit} value={meals} onChange={e=>setMeals(e.target.value)}/></label>
          <label className="field"><span>Transportation Requirement｜交通需求</span><textarea disabled={!canEdit} value={transport} onChange={e=>setTransport(e.target.value)} placeholder="Coach / MPV / airport transfer / cross-border..."/></label>
          <label className="field"><span>Itinerary Requirement｜行程要求</span><textarea disabled={!canEdit} value={itineraryReq} onChange={e=>setItineraryReq(e.target.value)} placeholder="Must-visit attractions, pacing, free time, shopping stops..."/></label>
          <label className="field"><span>Special Request｜特别要求</span><textarea disabled={!canEdit} value={special} onChange={e=>setSpecial(e.target.value)}/></label>
        </div>
      </div>

      <div className="operation-subsection operation-internal-notes">
        <div className="operation-subsection-head"><div><h3>Internal Operation Notes｜内部操作备注</h3><p>Internal only · Not shown to supplier</p></div></div>
        <label className="field"><textarea disabled={!canEdit} value={operationNotes} onChange={e=>setOperationNotes(e.target.value)} placeholder="Internal notes for the Operation team..."/></label>
      </div>
    </section>

    <section className="panel supplier-form-settings operation-supplier-panel">
      <div className="panel-head">
        <div>
          <h2>Supplier Inquiry｜供应商询价</h2>
          <p className="panel-subtext">这里只设置发给 Supplier 前需要确认的内容；Status 统一在页面右上角管理。</p>
        </div>
        <button className="btn" type="button" onClick={()=>window.open(supplierFormHref,"_blank")}>Preview Supplier Form</button>
      </div>
      <div className="operation-supplier-grid">
        <label className="field"><span>Quotation Deadline｜报价截止</span><input disabled={!canEdit} type="date" value={quoteDeadline} onChange={e=>setQuoteDeadline(e.target.value)}/></label>
        <label className="supplier-budget-toggle operation-budget-toggle">
          <input disabled={!canEdit} type="checkbox" checked={showBudget} onChange={e=>setShowBudget(e.target.checked)}/>
          <span>Show Budget to Supplier</span>
        </label>
      </div>
      <label className="field supplier-remarks"><span>Remarks to Supplier｜给供应商备注</span><textarea disabled={!canEdit} value={supplierRemarks} onChange={e=>setSupplierRemarks(e.target.value)} placeholder="Quotation format, response request, or commercial notes that are safe to send to supplier..."/></label>
    </section>

    <div className="detail-actions operation-review-actions">
      <button className="btn" type="button" onClick={()=>router.push(inquiryHref)}>← Inquiry</button>
      {canEdit&&<button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?"Saving...":"Save Operation Review"}</button>}
    </div>
    {message&&<div className="save-message">{message}</div>}
  </div>;
}

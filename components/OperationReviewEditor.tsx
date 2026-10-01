"use client";

import { useMemo,useState } from "react";
import { useRouter } from "next/navigation";

const has=(obj:any,key:string)=>Object.prototype.hasOwnProperty.call(obj||{},key);

export default function OperationReviewEditor({
  inquiry,
  canEdit
}:{inquiry:any;canEdit:boolean}){
  const router=useRouter();
  const initial=inquiry.operation_review||{};
  const initialSupplier=inquiry.supplier_inquiry||{};

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

  const [quoteDeadline,setQuoteDeadline]=useState(initialSupplier.quoteDeadline||"");
  const [supplierRemarks,setSupplierRemarks]=useState(initialSupplier.remarks||"");
  const [showBudget,setShowBudget]=useState(Boolean(initialSupplier.showBudget));
  const [supplierStatus,setSupplierStatus]=useState(inquiry.supplier_inquiry_status||"draft");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  const review=useMemo(()=>({
    destination,departureCity,travelStartDate:startDate,travelEndDate:endDate,
    daysCount:days,nightsCount:nights,pax,budget,tourType,
    flightRequirement:flight,hotelRequirement:hotel,mealRequirement:meals,
    specialRequest:special,transportRequirement:transport,
    itineraryRequirement:itineraryReq,operationNotes
  }),[destination,departureCity,startDate,endDate,days,nights,pax,budget,tourType,flight,hotel,meals,special,transport,itineraryReq,operationNotes]);

  async function save(nextStatus=supplierStatus){
    setSaving(true);setMessage("");
    try{
      const supplier={quoteDeadline,remarks:supplierRemarks,showBudget};
      const res=await fetch("/api/internal-operation-review",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:inquiry.id,review,supplier,supplierStatus:nextStatus})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setMessage(data?.error||"Unable to save.");return;}
      setSupplierStatus(nextStatus);
      setMessage("Saved");
      router.refresh();
    }finally{setSaving(false);}
  }

  return <div className="operation-review-editor">
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Original Sales Inquiry｜销售原始需求</h2>
          <p className="panel-subtext">保留 Sales 最初提交的资料作为原始记录。Operation 的修改不会覆盖这里。</p>
        </div>
      </div>
      <div className="inquiry-detail-grid">
        <div><span>Destination</span><strong>{inquiry.destination||"—"}</strong></div>
        <div><span>Travel Dates</span><strong>{inquiry.travel_start_date||"—"}{inquiry.travel_end_date?" → "+inquiry.travel_end_date:""}</strong></div>
        <div><span>Duration</span><strong>{inquiry.days_count}D{inquiry.nights_count}N</strong></div>
        <div><span>Pax</span><strong>{inquiry.pax||"—"}</strong></div>
        <div><span>Flight</span><p>{inquiry.flight_requirement||"—"}</p></div>
        <div><span>Hotel</span><p>{inquiry.hotel_requirement||"—"}</p></div>
        <div><span>Meals</span><p>{inquiry.meal_requirement||"—"}</p></div>
        <div><span>Special Request</span><p>{inquiry.special_request||"—"}</p></div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Operation Review｜操作审核版本</h2>
          <p className="panel-subtext">Jess 根据实际可行性整理后，Supplier Inquiry Form 会使用这一版资料。</p>
        </div>
      </div>

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

      <div className="inquiry-requirement-grid operation-review-fields">
        <label className="field"><span>Flight Requirement｜航班需求</span><textarea disabled={!canEdit} value={flight} onChange={e=>setFlight(e.target.value)}/></label>
        <label className="field"><span>Hotel Requirement｜酒店需求</span><textarea disabled={!canEdit} value={hotel} onChange={e=>setHotel(e.target.value)}/></label>
        <label className="field"><span>Meal Requirement｜餐食需求</span><textarea disabled={!canEdit} value={meals} onChange={e=>setMeals(e.target.value)}/></label>
        <label className="field"><span>Transportation Requirement｜交通需求</span><textarea disabled={!canEdit} value={transport} onChange={e=>setTransport(e.target.value)} placeholder="Coach / MPV / airport transfer / cross-border..."/></label>
        <label className="field"><span>Itinerary Requirement｜行程要求</span><textarea disabled={!canEdit} value={itineraryReq} onChange={e=>setItineraryReq(e.target.value)} placeholder="Must-visit attractions, pacing, free time, shopping stops..."/></label>
        <label className="field"><span>Special Request｜特别要求</span><textarea disabled={!canEdit} value={special} onChange={e=>setSpecial(e.target.value)}/></label>
        <label className="field operation-notes-field"><span>Internal Operation Notes｜内部操作备注</span><textarea disabled={!canEdit} value={operationNotes} onChange={e=>setOperationNotes(e.target.value)} placeholder="Internal only. This will NOT appear in Supplier Inquiry Form."/></label>
      </div>
    </section>

    <section className="panel supplier-form-settings">
      <div className="panel-head">
        <div>
          <h2>Supplier Inquiry Form｜供应商询价单设置</h2>
          <p className="panel-subtext">询价单会自动使用上面的 Operation Review，不需要再重复输入一次。</p>
        </div>
      </div>
      <div className="itinerary-meta-grid">
        <label className="field"><span>Quotation Deadline｜报价截止</span><input disabled={!canEdit} type="date" value={quoteDeadline} onChange={e=>setQuoteDeadline(e.target.value)}/></label>
        <label className="field"><span>Supplier Form Status</span><select disabled={!canEdit} value={supplierStatus} onChange={e=>setSupplierStatus(e.target.value)}>
          <option value="draft">Draft</option>
          <option value="ready">Ready to Send Supplier</option>
          <option value="waiting_quote">Waiting Supplier Quote</option>
          <option value="quote_received">Supplier Quote Received</option>
        </select></label>
        <label className="supplier-budget-toggle"><input disabled={!canEdit} type="checkbox" checked={showBudget} onChange={e=>setShowBudget(e.target.checked)}/><span>Show customer budget on Supplier Inquiry Form</span></label>
      </div>
      <label className="field supplier-remarks"><span>Remarks to Supplier｜给供应商备注</span><textarea disabled={!canEdit} value={supplierRemarks} onChange={e=>setSupplierRemarks(e.target.value)} placeholder="Quotation format, response request, special commercial notes that are safe to send to supplier..."/></label>
    </section>

    <div className="detail-actions operation-review-actions">
      <button className="btn" type="button" onClick={()=>router.push("/inquiries/"+inquiry.id)}>← Inquiry</button>
      <button className="btn" type="button" onClick={()=>window.open("/inquiries/"+inquiry.id+"/supplier-form","_blank")}>Preview / Export Supplier Form</button>
      {canEdit&&<button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?"Saving...":"Save Operation Review"}</button>}
    </div>
    {message&&<div className="save-message">{message}</div>}
  </div>;
}

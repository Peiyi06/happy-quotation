"use client";

import { useMemo,useState } from "react";
import { useRouter } from "next/navigation";

const has=(obj:any,key:string)=>Object.prototype.hasOwnProperty.call(obj||{},key);
type InquiryFlight={id:string;from:string;to:string;flightNo:string;date:string;departureTime:string;arrivalTime:string;remarks:string};
const flightUid=()=>Math.random().toString(36).slice(2,10);
const emptyFlight=():InquiryFlight=>({id:flightUid(),from:"",to:"",flightNo:"",date:"",departureTime:"",arrivalTime:"",remarks:""});

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
  const salesComposition=inquiry?.inquiry_data?.travellerComposition||{};
  const [overrideComposition,setOverrideComposition]=useState(Boolean(initial.overrideTravellerComposition));
  const [adultCount,setAdultCount]=useState<number|"">(initial?.travellerComposition?.adultCount??salesComposition.adultCount??"");
  const [seniorCount,setSeniorCount]=useState<number|"">(initial?.travellerComposition?.seniorCount??salesComposition.seniorCount??"");
  const [childCount,setChildCount]=useState<number|"">(initial?.travellerComposition?.childCount??salesComposition.childCount??"");
  const [seniorNotes,setSeniorNotes]=useState(initial?.travellerComposition?.seniorNotes??salesComposition.seniorNotes??"");
  const [childAges,setChildAges]=useState(initial?.travellerComposition?.childAges??salesComposition.childAges??"");
  const [childNotes,setChildNotes]=useState(initial?.travellerComposition?.childNotes??salesComposition.childNotes??"");
  const [mobilityNotes,setMobilityNotes]=useState(initial?.travellerComposition?.mobilityNotes??salesComposition.mobilityNotes??"");
  const [budget,setBudget]=useState(has(initial,"budget")?initial.budget:(inquiry.budget||""));
  const [tourType,setTourType]=useState(has(initial,"tourType")?initial.tourType:(inquiry.tour_type||""));
  const [flight,setFlight]=useState(has(initial,"flightRequirement")?initial.flightRequirement:(inquiry.flight_requirement||""));
  const salesSuggestedFlights:InquiryFlight[]=Array.isArray(inquiry?.inquiry_data?.suggestedFlights)?inquiry.inquiry_data.suggestedFlights:[];
  const [overrideFlights,setOverrideFlights]=useState(Boolean(initial.overrideSuggestedFlights));
  const [operationFlights,setOperationFlights]=useState<InquiryFlight[]>(Array.isArray(initial.suggestedFlights)?initial.suggestedFlights:salesSuggestedFlights);
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
    itineraryRequirement:itineraryReq,operationNotes,
    overrideSuggestedFlights:overrideFlights,
    suggestedFlights:overrideFlights?operationFlights:salesSuggestedFlights,
    overrideTravellerComposition:overrideComposition,
    travellerComposition:overrideComposition?{
      adultCount:adultCount===""?null:Number(adultCount),
      seniorCount:seniorCount===""?null:Number(seniorCount),
      childCount:childCount===""?null:Number(childCount),
      seniorNotes,childAges,childNotes,mobilityNotes
    }:salesComposition
  }),[destination,departureCity,startDate,endDate,days,nights,pax,budget,tourType,flight,hotel,meals,special,transport,itineraryReq,operationNotes,overrideFlights,operationFlights,salesSuggestedFlights,overrideComposition,adultCount,seniorCount,childCount,seniorNotes,childAges,childNotes,mobilityNotes,salesComposition]);

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
        <div><span>Flight Requirement</span><p>{inquiry.flight_requirement||"—"}</p></div>
        <div><span>Hotel</span><p>{inquiry.hotel_requirement||"—"}</p></div>
        <div><span>Meals</span><p>{inquiry.meal_requirement||"—"}</p></div>
        <div><span>Special Request</span><p>{inquiry.special_request||"—"}</p></div>
      </div>
      <div className="operation-sales-flight-source">
        <div className="panel-head compact">
          <div><h3>Sales Suggested Flights｜销售推荐航班</h3><p className="panel-subtext">这是 Sales 原始推荐，会保留作为记录。</p></div>
        </div>
        {salesSuggestedFlights.length===0?<div className="empty">Sales 没有填写推荐航班。</div>:<div className="inquiry-flight-list readonly">
          {salesSuggestedFlights.map((f,index)=><div className="inquiry-flight-card" key={f.id||index}>
            <div className="inquiry-flight-card-head"><strong>Flight {index+1}</strong></div>
            <div className="flight-summary-line"><b>{f.from||"—"} → {f.to||"—"}</b><span>{f.flightNo||"—"}</span><span>{f.date||"—"}</span><span>{f.departureTime||"—"} → {f.arrivalTime||"—"}</span>{f.remarks&&<em>{f.remarks}</em>}</div>
          </div>)}
        </div>}
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

      <div className="operation-composition-source">
        <div className="panel-head compact">
          <div><h3>Sales Traveller Composition｜销售旅客组成</h3><p className="panel-subtext">Sales 原始人数结构会保留，Operation 可选择是否覆盖。</p></div>
        </div>
        <div className="traveller-summary-grid">
          <div><span>Adult</span><strong>{salesComposition.adultCount??"—"}</strong></div>
          <div><span>Senior</span><strong>{salesComposition.seniorCount??"—"}</strong></div>
          <div><span>Child</span><strong>{salesComposition.childCount??"—"}</strong></div>
        </div>
        {(salesComposition.seniorNotes||salesComposition.childAges||salesComposition.childNotes||salesComposition.mobilityNotes)&&<div className="inquiry-detail-grid composition-detail-grid">
          <div><span>Senior Notes</span><p>{salesComposition.seniorNotes||"—"}</p></div>
          <div><span>Child Ages</span><p>{salesComposition.childAges||"—"}</p></div>
          <div><span>Child Notes</span><p>{salesComposition.childNotes||"—"}</p></div>
          <div><span>Mobility / Care</span><p>{salesComposition.mobilityNotes||"—"}</p></div>
        </div>}
      </div>

      <div className="operation-composition-override">
        <label className="supplier-budget-toggle">
          <input disabled={!canEdit} type="checkbox" checked={overrideComposition} onChange={e=>setOverrideComposition(e.target.checked)}/>
          <span>Override Traveller Composition｜Operation 更改旅客组成</span>
        </label>
        <p>{overrideComposition?"Supplier Inquiry Form 将使用 Operation 调整后的旅客组成。":"目前沿用 Sales 的旅客组成。"}</p>
        {overrideComposition&&<>
          <div className="itinerary-meta-grid">
            <label className="field"><span>Adult｜成人</span><input disabled={!canEdit} type="number" min="0" value={adultCount} onChange={e=>setAdultCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
            <label className="field"><span>Senior｜老人</span><input disabled={!canEdit} type="number" min="0" value={seniorCount} onChange={e=>setSeniorCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
            <label className="field"><span>Child｜小孩</span><input disabled={!canEdit} type="number" min="0" value={childCount} onChange={e=>setChildCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
          </div>
          <div className="inquiry-requirement-grid traveller-composition-notes">
            <label className="field"><span>Senior Notes</span><textarea disabled={!canEdit} value={seniorNotes} onChange={e=>setSeniorNotes(e.target.value)}/></label>
            <label className="field"><span>Child Ages</span><textarea disabled={!canEdit} value={childAges} onChange={e=>setChildAges(e.target.value)}/></label>
            <label className="field"><span>Child Notes</span><textarea disabled={!canEdit} value={childNotes} onChange={e=>setChildNotes(e.target.value)}/></label>
            <label className="field"><span>Mobility / Care Notes</span><textarea disabled={!canEdit} value={mobilityNotes} onChange={e=>setMobilityNotes(e.target.value)}/></label>
          </div>
          <div className={"traveller-composition-check "+((((Number(adultCount)||0)+(Number(seniorCount)||0)+(Number(childCount)||0))!==Number(pax))?"warning":"ok")}>
            <strong>Composition Total: {(Number(adultCount)||0)+(Number(seniorCount)||0)+(Number(childCount)||0)}</strong>
            <span>{pax===""?"请先填写总 Pax。":((Number(adultCount)||0)+(Number(seniorCount)||0)+(Number(childCount)||0))!==Number(pax)?`与 Pax ${pax} 不一致，请检查。`:`与 Pax ${pax} 一致。`}</span>
          </div>
        </>}
      </div>

      <div className="operation-flight-override">
        <label className="supplier-budget-toggle">
          <input disabled={!canEdit} type="checkbox" checked={overrideFlights} onChange={e=>{
            const checked=e.target.checked;
            setOverrideFlights(checked);
            if(checked&&operationFlights.length===0) setOperationFlights(salesSuggestedFlights.length?salesSuggestedFlights.map(f=>({...f,id:flightUid()})):[emptyFlight()]);
          }}/>
          <span>Override Sales Suggested Flights｜Operation 更改推荐航班</span>
        </label>
        <p>{overrideFlights?"Supplier Inquiry Form 将使用 Operation 推荐航班。":"目前沿用 Sales 推荐航班。"}</p>
        {overrideFlights&&<div className="inquiry-flight-list">
          {operationFlights.map((f,index)=><div className="inquiry-flight-card" key={f.id}>
            <div className="inquiry-flight-card-head"><strong>Operation Flight {index+1}</strong><button disabled={!canEdit} className="btn danger" type="button" onClick={()=>setOperationFlights(prev=>prev.filter(x=>x.id!==f.id))}>Delete</button></div>
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
          {canEdit&&<button className="btn" type="button" onClick={()=>setOperationFlights(prev=>[...prev,emptyFlight()])}>+ Add Operation Flight</button>}
        </div>}
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
        <label className="field"><span>Supplier Workflow Status</span><input value={supplierStatus==="quote_received"?"Quote Received":supplierStatus==="waiting_quote"?"Waiting Supplier Quote":supplierStatus==="ready"?"Ready to Send Supplier":"Supplier Draft"} readOnly className="system-fixed-input"/></label>
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

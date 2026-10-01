"use client";

import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";

export default function InquiryEditor({initialInquiry,currentStaffName}:{initialInquiry?:any;currentStaffName:string}){
  const router=useRouter();
  const [customerName,setCustomerName]=useState(initialInquiry?.customer_name||"");
  const [contact,setContact]=useState(initialInquiry?.contact||"");
  const [destination,setDestination]=useState(initialInquiry?.destination||"");
  const [departureCity,setDepartureCity]=useState(initialInquiry?.departure_city||"");
  const [startDate,setStartDate]=useState(initialInquiry?.travel_start_date||"");
  const [endDate,setEndDate]=useState(initialInquiry?.travel_end_date||"");
  const [days,setDays]=useState(Number(initialInquiry?.days_count)||1);
  const [nights,setNights]=useState(Number(initialInquiry?.nights_count)||0);
  const [pax,setPax]=useState<number|"">(initialInquiry?.pax??"");
  const [budget,setBudget]=useState(initialInquiry?.budget||"");
  const [tourType,setTourType]=useState(initialInquiry?.tour_type||"");
  const [flightRequirement,setFlightRequirement]=useState(initialInquiry?.flight_requirement||"");
  const [hotelRequirement,setHotelRequirement]=useState(initialInquiry?.hotel_requirement||"");
  const [mealRequirement,setMealRequirement]=useState(initialInquiry?.meal_requirement||"");
  const [specialRequest,setSpecialRequest]=useState(initialInquiry?.special_request||"");
  const [status,setStatus]=useState(initialInquiry?.status||"new");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return;
    const [sy,sm,sd]=startDate.split("-").map(Number);
    const [ey,em,ed]=endDate.split("-").map(Number);
    const s=Date.UTC(sy,sm-1,sd), e=Date.UTC(ey,em-1,ed);
    if(e<s) return;
    const d=Math.floor((e-s)/86400000)+1;
    setDays(d);setNights(Math.max(0,d-1));
  },[startDate,endDate]);

  async function save(){
    setSaving(true);setMessage("");
    try{
      const payload={
        customer_name:customerName,contact,destination,departure_city:departureCity,
        travel_start_date:startDate,travel_end_date:endDate,days_count:days,nights_count:nights,
        pax,budget,tour_type:tourType,flight_requirement:flightRequirement,hotel_requirement:hotelRequirement,
        meal_requirement:mealRequirement,special_request:specialRequest,status,
        inquiry_data:{}
      };
      const res=await fetch("/api/internal-inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:initialInquiry?.id||null,payload})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setMessage(data?.error||"Unable to save inquiry.");return;}
      if(!initialInquiry?.id&&data.id) router.replace("/inquiries/"+data.id);
      else {setMessage("Saved");router.refresh();}
    }finally{setSaving(false);}
  }

  return <div className="inquiry-editor">
    <section className="panel">
      <div className="panel-head">
        <div><h2>Customer Request｜客户需求</h2><p className="panel-subtext">Sales 只需在 Inquiry 输入一次，后续 Itinerary / Quotation 会复用这些资料。</p></div>
      </div>
      <div className="itinerary-meta-grid">
        <label className="field"><span>Customer / Company</span><input value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label>
        <label className="field"><span>Contact</span><input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Phone / WhatsApp / Email"/></label>
        <label className="field"><span>Departure City｜出发城市</span><input value={departureCity} onChange={e=>setDepartureCity(e.target.value)} placeholder="Kuala Lumpur"/></label>
        <label className="field"><span>Destination｜目的地</span><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Hokkaido / Chongqing"/></label>
        <label className="field"><span>Travel Start Date</span><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
        <label className="field"><span>Travel End Date</span><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
        <label className="field"><span>Days</span><input type="number" min="1" value={days} onChange={e=>setDays(Math.max(1,Number(e.target.value)||1))}/></label>
        <label className="field"><span>Nights</span><input type="number" min="0" value={nights} onChange={e=>setNights(Math.max(0,Number(e.target.value)||0))}/></label>
        <label className="field"><span>Pax｜人数</span><input type="number" min="1" value={pax} onChange={e=>setPax(e.target.value===""?"":Math.max(1,Number(e.target.value)||1))}/></label>
        <label className="field"><span>Budget｜预算</span><input value={budget} onChange={e=>setBudget(e.target.value)} placeholder="RM 3,500/pax"/></label>
        <label className="field"><span>Tour Type｜团型</span><input value={tourType} onChange={e=>setTourType(e.target.value)} placeholder="Private / Company Trip"/></label>
        <label className="field"><span>Sales Owner</span><input value={initialInquiry?.sales_owner_name||currentStaffName} readOnly className="system-fixed-input"/></label>
        <label className="field"><span>Operation Assignee</span><input value={initialInquiry?.operation_assignee_name||"Jess"} readOnly className="system-fixed-input"/></label>
        <label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="new">New Inquiry</option><option value="assigned">Assigned to Operation</option><option value="planning">Sourcing / Planning</option><option value="itinerary_draft">Itinerary Draft</option><option value="quotation_draft">Quotation Draft</option><option value="ready_sales">Ready for Sales</option><option value="sent">Sent to Customer</option><option value="confirmed">Confirmed</option>
        </select></label>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head"><h2>Travel Requirements｜旅游需求</h2></div>
      <div className="inquiry-requirement-grid">
        <label className="field"><span>Flight Requirement｜航班需求</span><textarea value={flightRequirement} onChange={e=>setFlightRequirement(e.target.value)} placeholder="Preferred airline, flight time, baggage..."/></label>
        <label className="field"><span>Hotel Requirement｜酒店需求</span><textarea value={hotelRequirement} onChange={e=>setHotelRequirement(e.target.value)} placeholder="Star rating, room type, location..."/></label>
        <label className="field"><span>Meal Requirement｜餐食需求</span><textarea value={mealRequirement} onChange={e=>setMealRequirement(e.target.value)} placeholder="Vegetarian, halal, no beef..."/></label>
        <label className="field"><span>Special Request｜特别要求</span><textarea value={specialRequest} onChange={e=>setSpecialRequest(e.target.value)} placeholder="Activities, elderly guests, children, special arrangements..."/></label>
      </div>
    </section>

    <div className="detail-actions inquiry-save-actions">
      <button className="btn" type="button" onClick={()=>router.push("/inquiries")}>← Back</button>
      <button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?"Saving...":"Save Inquiry"}</button>
    </div>
    {message&&<div className="save-message">{message}</div>}
  </div>;
}

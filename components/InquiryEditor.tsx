"use client";

import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";

type InquiryFlight={id:string;from:string;to:string;flightNo:string;date:string;departureTime:string;arrivalTime:string;remarks:string};
const flightUid=()=>Math.random().toString(36).slice(2,10);
const emptyFlight=():InquiryFlight=>({id:flightUid(),from:"",to:"",flightNo:"",date:"",departureTime:"",arrivalTime:"",remarks:""});

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
  const initialComposition=initialInquiry?.inquiry_data?.travellerComposition||{};
  const [adultCount,setAdultCount]=useState<number|"">(initialComposition.adultCount??"");
  const [seniorCount,setSeniorCount]=useState<number|"">(initialComposition.seniorCount??"");
  const [childCount,setChildCount]=useState<number|"">(initialComposition.childCount??"");
  const [seniorNotes,setSeniorNotes]=useState(initialComposition.seniorNotes||"");
  const [childAges,setChildAges]=useState(initialComposition.childAges||"");
  const [childNotes,setChildNotes]=useState(initialComposition.childNotes||"");
  const [mobilityNotes,setMobilityNotes]=useState(initialComposition.mobilityNotes||"");
  const [budget,setBudget]=useState(initialInquiry?.budget||"");
  const [tourType,setTourType]=useState(initialInquiry?.tour_type||"");
  const [flightRequirement,setFlightRequirement]=useState(initialInquiry?.flight_requirement||"");
  const [suggestedFlights,setSuggestedFlights]=useState<InquiryFlight[]>(Array.isArray(initialInquiry?.inquiry_data?.suggestedFlights)?initialInquiry.inquiry_data.suggestedFlights:[]);
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

  const compositionTotal=(Number(adultCount)||0)+(Number(seniorCount)||0)+(Number(childCount)||0);
  const compositionHasValues=adultCount!==""||seniorCount!==""||childCount!=="";
  const compositionMismatch=compositionHasValues&&pax!==""&&compositionTotal!==Number(pax);

  async function save(){
    setSaving(true);setMessage("");
    try{
      const payload={
        customer_name:customerName,contact,destination,departure_city:departureCity,
        travel_start_date:startDate,travel_end_date:endDate,days_count:days,nights_count:nights,
        pax,budget,tour_type:tourType,flight_requirement:flightRequirement,hotel_requirement:hotelRequirement,
        meal_requirement:mealRequirement,special_request:specialRequest,status,
        inquiry_data:{...(initialInquiry?.inquiry_data||{}),suggestedFlights,travellerComposition:{
          adultCount:adultCount===""?null:Number(adultCount),
          seniorCount:seniorCount===""?null:Number(seniorCount),
          childCount:childCount===""?null:Number(childCount),
          seniorNotes,childAges,childNotes,mobilityNotes
        }}
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
          <option value="new">New Inquiry</option><option value="assigned">Assigned to Operation</option><option value="operation_review">Operation Review</option><option value="ready_supplier">Ready to Send Supplier</option><option value="waiting_supplier_quote">Waiting Supplier Quote</option><option value="supplier_quote_received">Supplier Quote Received</option><option value="planning">Sourcing / Planning</option><option value="itinerary_draft">Itinerary Draft</option><option value="quotation_draft">Quotation Draft</option><option value="ready_sales">Ready for Sales</option><option value="sent">Sent to Customer</option><option value="confirmed">Confirmed</option>
        </select></label>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Traveller Composition｜旅客组成</h2>
          <p className="panel-subtext">填写成人、老人及小孩人数，方便 Operation 与供应商判断行程强度、车辆、门票及餐食安排。</p>
        </div>
      </div>
      <div className="itinerary-meta-grid">
        <label className="field"><span>Adult｜成人</span><input type="number" min="0" value={adultCount} onChange={e=>setAdultCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
        <label className="field"><span>Senior｜老人</span><input type="number" min="0" value={seniorCount} onChange={e=>setSeniorCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
        <label className="field"><span>Child｜小孩</span><input type="number" min="0" value={childCount} onChange={e=>setChildCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
      </div>
      <div className="inquiry-requirement-grid traveller-composition-notes">
        <label className="field"><span>Senior Notes｜老人备注</span><textarea value={seniorNotes} onChange={e=>setSeniorNotes(e.target.value)} placeholder="例如：65岁、72岁，其中1位走路较慢"/></label>
        <label className="field"><span>Child Ages｜小孩年龄</span><textarea value={childAges} onChange={e=>setChildAges(e.target.value)} placeholder="例如：6岁、10岁"/></label>
        <label className="field"><span>Child Notes｜小孩备注</span><textarea value={childNotes} onChange={e=>setChildNotes(e.target.value)} placeholder="婴儿车、儿童餐、儿童座椅等"/></label>
        <label className="field"><span>Mobility / Care Notes｜行动与照顾需求</span><textarea value={mobilityNotes} onChange={e=>setMobilityNotes(e.target.value)} placeholder="例如：减少长时间步行、需要轮椅协助"/></label>
      </div>
      <div className={"traveller-composition-check "+(compositionMismatch?"warning":"ok")}>
        <strong>Composition Total: {compositionTotal}</strong>
        <span>{pax===""?"请先填写总 Pax。":compositionMismatch?`与 Pax ${pax} 不一致，请检查。`:`与 Pax ${pax} 一致。`}</span>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Suggested Flights｜推荐航班</h2>
          <p className="panel-subtext">Sales 可先填写推荐航班。Operation 后续可以沿用或提出替代航班，不会覆盖原始版本。</p>
        </div>
        <button className="btn" type="button" onClick={()=>setSuggestedFlights(prev=>[...prev,emptyFlight()])}>+ Add Flight</button>
      </div>
      <div className="inquiry-flight-list">
        {suggestedFlights.length===0&&<div className="empty">Optional｜如暂时没有推荐航班，可以留空。</div>}
        {suggestedFlights.map((flight,index)=><div className="inquiry-flight-card" key={flight.id}>
          <div className="inquiry-flight-card-head"><strong>Flight {index+1}</strong><button className="btn danger" type="button" onClick={()=>setSuggestedFlights(prev=>prev.filter(x=>x.id!==flight.id))}>Delete</button></div>
          <div className="itinerary-meta-grid">
            <label className="field"><span>From</span><input maxLength={3} value={flight.from} onChange={e=>setSuggestedFlights(prev=>prev.map(x=>x.id===flight.id?{...x,from:e.target.value.toUpperCase()}:x))} placeholder="KUL"/></label>
            <label className="field"><span>To</span><input maxLength={3} value={flight.to} onChange={e=>setSuggestedFlights(prev=>prev.map(x=>x.id===flight.id?{...x,to:e.target.value.toUpperCase()}:x))} placeholder="CTS"/></label>
            <label className="field"><span>Flight No.</span><input value={flight.flightNo} onChange={e=>setSuggestedFlights(prev=>prev.map(x=>x.id===flight.id?{...x,flightNo:e.target.value.toUpperCase()}:x))} placeholder="MH 52"/></label>
            <label className="field"><span>Date</span><input type="date" value={flight.date} onChange={e=>setSuggestedFlights(prev=>prev.map(x=>x.id===flight.id?{...x,date:e.target.value}:x))}/></label>
            <label className="field"><span>Departure Time</span><input type="time" value={flight.departureTime} onChange={e=>setSuggestedFlights(prev=>prev.map(x=>x.id===flight.id?{...x,departureTime:e.target.value}:x))}/></label>
            <label className="field"><span>Arrival Time</span><input type="time" value={flight.arrivalTime} onChange={e=>setSuggestedFlights(prev=>prev.map(x=>x.id===flight.id?{...x,arrivalTime:e.target.value}:x))}/></label>
            <label className="field inquiry-flight-remarks"><span>Remarks</span><input value={flight.remarks} onChange={e=>setSuggestedFlights(prev=>prev.map(x=>x.id===flight.id?{...x,remarks:e.target.value}:x))} placeholder="+1 / transit / baggage..."/></label>
          </div>
        </div>)}
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

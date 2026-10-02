"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import InquiryAiIntake from "@/components/InquiryAiIntake";

type InquiryFlight={id:string;from:string;to:string;flightNo:string;date:string;departureTime:string;arrivalTime:string;remarks:string};
const flightUid=()=>Math.random().toString(36).slice(2,10);
const emptyFlight=():InquiryFlight=>({id:flightUid(),from:"",to:"",flightNo:"",date:"",departureTime:"",arrivalTime:"",remarks:""});

export default function InquiryEditor({initialInquiry,currentStaffName,backHref="/inquiries"}:{initialInquiry?:any;currentStaffName:string;backHref?:string}){
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
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [copyMessage,setCopyMessage]=useState("");
  const [isDirty,setIsDirty]=useState(false);
  const [pendingHref,setPendingHref]=useState<string|null>(null);
  const [showUnsavedPrompt,setShowUnsavedPrompt]=useState(false);
  const baselineRef=useRef("");

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

  const editorSnapshot=useMemo(()=>JSON.stringify({
    customerName,contact,destination,departureCity,startDate,endDate,days,nights,pax,budget,tourType,
    adultCount,seniorCount,childCount,seniorNotes,childAges,childNotes,mobilityNotes,
    flightRequirement,suggestedFlights,hotelRequirement,mealRequirement,specialRequest
  }),[customerName,contact,destination,departureCity,startDate,endDate,days,nights,pax,budget,tourType,adultCount,seniorCount,childCount,seniorNotes,childAges,childNotes,mobilityNotes,flightRequirement,suggestedFlights,hotelRequirement,mealRequirement,specialRequest]);

  useEffect(()=>{
    if(!baselineRef.current){
      baselineRef.current=editorSnapshot;
      return;
    }
    setIsDirty(editorSnapshot!==baselineRef.current);
  },[editorSnapshot]);

  useEffect(()=>{
    const beforeUnload=(e:BeforeUnloadEvent)=>{
      if(!isDirty) return;
      e.preventDefault();
      e.returnValue="";
    };
    window.addEventListener("beforeunload",beforeUnload);
    return ()=>window.removeEventListener("beforeunload",beforeUnload);
  },[isDirty]);

  useEffect(()=>{
    const onLinkClick=(e:MouseEvent)=>{
      if(!isDirty||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
      const target=e.target as HTMLElement|null;
      const anchor=target?.closest?.("a[href]") as HTMLAnchorElement|null;
      if(!anchor||anchor.target==="_blank"||anchor.hasAttribute("download")) return;
      const url=new URL(anchor.href,window.location.href);
      if(url.origin!==window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname+url.search+url.hash);
      setShowUnsavedPrompt(true);
    };
    document.addEventListener("click",onLinkClick,true);
    return ()=>document.removeEventListener("click",onLinkClick,true);
  },[isDirty]);

  function requestNavigate(href:string){
    if(!isDirty){router.push(href);return;}
    setPendingHref(href);
    setShowUnsavedPrompt(true);
  }

  async function copyText(text:string,label:string){
    try{
      await navigator.clipboard.writeText(text);
      setCopyMessage(label+" copied ✓");
      window.setTimeout(()=>setCopyMessage(""),1800);
    }catch{
      setCopyMessage("Unable to copy. Please copy manually.");
      window.setTimeout(()=>setCopyMessage(""),2200);
    }
  }

  function basicRequestText(){
    return [
      "您好，为了方便我们为您规划合适的旅游行程与报价，请提供以下资料：",
      "",
      "1. 出发城市：",
      "2. 旅游目的地：",
      "3. 出发日期：",
      "4. 回程日期：",
      "5. 总人数：",
      "6. 成人：",
      "7. 老人：",
      "8. 小孩：",
      "9. 小孩年龄：",
      "10. 预算范围：",
      "11. 想去的景点 / 特别要求：",
      "12. 如有老人行动不便、轮椅需求、婴儿车等，请注明：",
      "",
      "收到资料后，我们会根据您的需求进一步规划，谢谢 😊"
    ].join("\n");
  }

  function detailedRequestText(){
    return [
      "您好，为了方便我们为您安排更完整的旅游行程与报价，请提供以下资料：",
      "",
      "1. 出发城市：",
      "2. 旅游目的地：",
      "3. 出发日期：",
      "4. 回程日期：",
      "5. 总人数：",
      "6. 成人：",
      "7. 老人：",
      "8. 小孩：",
      "9. 小孩年龄：",
      "10. 预算范围：",
      "11. 酒店要求（星级 / 房型 / 地点）：",
      "12. 餐食要求：",
      "13. 航班要求 / 是否已有推荐航班：",
      "14. 想去的景点 / 特别要求：",
      "15. 老人情况（年龄 / 行动情况）：",
      "16. 小孩特别需求（儿童餐 / 儿童座椅 / 婴儿车等）：",
      "17. 其他行动或照顾需求：",
      "",
      "收到以上资料后，我们会根据您的需求进一步规划与报价，谢谢 😊"
    ].join("\n");
  }

  function applyAiIntake(payload:any){
    if(payload.trip){
      if(payload.trip.departureCity) setDepartureCity(payload.trip.departureCity);
      if(payload.trip.destination) setDestination(payload.trip.destination);
      if(payload.trip.travelStartDate) setStartDate(payload.trip.travelStartDate);
      if(payload.trip.travelEndDate) setEndDate(payload.trip.travelEndDate);
      if(payload.trip.pax!=null) setPax(payload.trip.pax);
      if(payload.trip.budget) setBudget(payload.trip.budget);
      if(payload.trip.tourType) setTourType(payload.trip.tourType);
    }
    if(payload.composition){
      if(payload.composition.adultCount!=null) setAdultCount(payload.composition.adultCount);
      if(payload.composition.seniorCount!=null) setSeniorCount(payload.composition.seniorCount);
      if(payload.composition.childCount!=null) setChildCount(payload.composition.childCount);
      if(payload.composition.seniorNotes) setSeniorNotes(payload.composition.seniorNotes);
      if(payload.composition.childAges) setChildAges(payload.composition.childAges);
      if(payload.composition.childNotes) setChildNotes(payload.composition.childNotes);
      if(payload.composition.mobilityNotes) setMobilityNotes(payload.composition.mobilityNotes);
    }
    if(payload.requirements){
      if(payload.requirements.flightRequirement) setFlightRequirement(payload.requirements.flightRequirement);
      if(payload.requirements.hotelRequirement) setHotelRequirement(payload.requirements.hotelRequirement);
      if(payload.requirements.mealRequirement) setMealRequirement(payload.requirements.mealRequirement);
      const combinedSpecial=[payload.requirements.specialRequest,payload.requirements.extraNotes].filter(Boolean).join("\n");
      if(combinedSpecial) setSpecialRequest(combinedSpecial);
    }
    if(Array.isArray(payload.flights)){
      const onlyFlights=payload.flights.filter((x:any)=>x.segmentType==="flight").map((x:any)=>({
        id:flightUid(),
        from:x.from||"",
        to:x.to||"",
        flightNo:x.flightNo||"",
        date:x.date||"",
        departureTime:x.departureTime||"",
        arrivalTime:x.arrivalTime||"",
        remarks:[
          x.departureTerminal?"Departure Terminal: "+x.departureTerminal:"",
          x.arrivalTerminal?"Arrival Terminal: "+x.arrivalTerminal:"",
          x.cabin?"Cabin: "+x.cabin:"",
          x.baggage?"Baggage: "+x.baggage:"",
          x.operatingCarrier?"Operated by: "+x.operatingCarrier:"",
          x.duration?"Duration: "+x.duration:"",
          x.remarks||""
        ].filter(Boolean).join(" · ")
      }));
      if(onlyFlights.length) setSuggestedFlights(onlyFlights);
    }
    setMessage("AI information applied — remember to Save Inquiry.");
  }

  async function save(){
    setSaving(true);setMessage("");
    try{
      const payload={
        customer_name:customerName,contact,destination,departure_city:departureCity,
        travel_start_date:startDate,travel_end_date:endDate,days_count:days,nights_count:nights,
        pax,budget,tour_type:tourType,flight_requirement:flightRequirement,hotel_requirement:hotelRequirement,
        meal_requirement:mealRequirement,special_request:specialRequest,
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
      baselineRef.current=editorSnapshot;
      setIsDirty(false);
      setShowUnsavedPrompt(false);
      setPendingHref(null);
      if(!initialInquiry?.id&&data.id) router.replace("/inquiries/"+data.id);
      else {setMessage("All changes saved ✓");router.refresh();}
    }finally{setSaving(false);}
  }

  return <div className="inquiry-editor">
    <section className="panel">
      <div className="panel-head">
        <div><h2>Customer Request｜客户需求</h2><p className="panel-subtext">Sales 只需在 Inquiry 输入一次，后续 Itinerary / Quotation 会复用这些资料。</p></div>
        <div className="customer-request-copy-actions">
          <InquiryAiIntake
            inquiryContext={{departureCity,destination,travelStartDate:startDate,travelEndDate:endDate,pax,budget,tourType}}
            onApply={applyAiIntake}
          />
          <button className="btn" type="button" onClick={()=>void copyText(basicRequestText(),"Basic request")}>Copy Basic Request</button>
          <button className="btn" type="button" onClick={()=>void copyText(detailedRequestText(),"Detailed request")}>Copy Detailed Request</button>
        </div>
      </div>
      {copyMessage&&<div className="copy-feedback">{copyMessage}</div>}
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

    <div className={"inquiry-save-state "+(isDirty?"unsaved":"saved")}>
      <div>
        <strong>{isDirty?"● Unsaved Changes｜有未存档修改":"✓ All changes saved｜所有修改已存档"}</strong>
        <span>{isDirty?"离开、刷新或关闭页面前请先 Save Inquiry。":"目前页面资料已存档。"}</span>
      </div>
      {isDirty&&<button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?"Saving...":"Save Inquiry"}</button>}
    </div>

    <div className="detail-actions inquiry-save-actions">
      <button className="btn" type="button" onClick={()=>requestNavigate(backHref)}>← Back</button>
      <button className="btn primary" type="button" disabled={saving||!isDirty} onClick={()=>void save()}>{saving?"Saving...":isDirty?"Save Inquiry":"Saved ✓"}</button>
    </div>
    {message&&<div className="save-message">{message}</div>}

    {showUnsavedPrompt&&<div className="unsaved-overlay" onMouseDown={()=>setShowUnsavedPrompt(false)}>
      <div className="unsaved-modal" onMouseDown={e=>e.stopPropagation()}>
        <span className="page-kicker">UNSAVED CHANGES</span>
        <h3>You have unsaved changes.</h3>
        <p>尚有修改未存档，离开后这些资料会丢失。</p>
        <div className="detail-actions">
          <button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?"Saving...":"Stay & Save"}</button>
          <button className="btn" type="button" onClick={()=>{
            const href=pendingHref||backHref;
            baselineRef.current=editorSnapshot;
            setIsDirty(false);
            setShowUnsavedPrompt(false);
            setPendingHref(null);
            router.push(href);
          }}>Leave Without Saving</button>
        </div>
      </div>
    </div>}
  </div>;
}

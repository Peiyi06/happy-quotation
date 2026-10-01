"use client";

import { useRef,useState } from "react";

type Flight={
  direction:"outbound"|"return"|"unknown";
  segmentType:"flight"|"transit"|"airport_transfer";
  from:string;to:string;flightNo:string;date:string;departureTime:string;arrivalTime:string;
  departureTerminal:string;arrivalTerminal:string;cabin:string;baggage:string;operatingCarrier:string;duration:string;remarks:string;
  confidence:"high"|"review"|"warning";
};

type IntakeResult={
  trip:{departureCity:string;destination:string;travelStartDate:string;travelEndDate:string;pax:number|null;budget:string;tourType:string};
  composition:{adultCount:number|null;seniorCount:number|null;childCount:number|null;seniorNotes:string;childAges:string;childNotes:string;mobilityNotes:string};
  requirements:{flightRequirement:string;hotelRequirement:string;mealRequirement:string;specialRequest:string;extraNotes:string};
  flights:Flight[];
  warnings:string[];
  missingFields:string[];
};

type ApplyPayload={
  trip?:IntakeResult["trip"];
  composition?:IntakeResult["composition"];
  requirements?:IntakeResult["requirements"];
  flights?:Flight[];
};

export default function InquiryAiIntake({
  inquiryContext,
  onApply
}:{
  inquiryContext:any;
  onApply:(payload:ApplyPayload)=>void;
}){
  const [open,setOpen]=useState(false);
  const [customerReply,setCustomerReply]=useState("");
  const [manualNotes,setManualNotes]=useState("");
  const [files,setFiles]=useState<File[]>([]);
  const [result,setResult]=useState<IntakeResult|null>(null);
  const [analyzing,setAnalyzing]=useState(false);
  const [error,setError]=useState("");
  const [model,setModel]=useState("");
  const inputRef=useRef<HTMLInputElement|null>(null);

  async function analyze(){
    setAnalyzing(true);setError("");
    try{
      const form=new FormData();
      form.set("customerReply",customerReply);
      form.set("manualNotes",manualNotes);
      form.set("inquiryContext",JSON.stringify(inquiryContext||{}));
      files.forEach(f=>form.append("flightScreenshots",f));
      const res=await fetch("/api/ai-inquiry-intake",{method:"POST",body:form});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to analyze customer information.");return;}
      setResult(data.result);
      setModel(data.model||"");
    }finally{setAnalyzing(false);}
  }

  function updateTrip(key:keyof IntakeResult["trip"],value:any){
    if(!result) return;
    setResult({...result,trip:{...result.trip,[key]:value}});
  }
  function updateComposition(key:keyof IntakeResult["composition"],value:any){
    if(!result) return;
    setResult({...result,composition:{...result.composition,[key]:value}});
  }
  function updateReq(key:keyof IntakeResult["requirements"],value:string){
    if(!result) return;
    setResult({...result,requirements:{...result.requirements,[key]:value}});
  }
  function updateFlight(index:number,key:keyof Flight,value:any){
    if(!result) return;
    setResult({...result,flights:result.flights.map((f,i)=>i===index?{...f,[key]:value}:f)});
  }

  function close(){setOpen(false);}

  return <>
    <button className="btn ai-intake-launch" type="button" onClick={()=>setOpen(true)}>✨ AI Intake</button>

    {open&&<div className="ai-intake-overlay" onMouseDown={close}>
      <div className="ai-intake-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="ai-intake-head">
          <div>
            <span className="page-kicker">AI INTAKE</span>
            <h2>AI 资料录入</h2>
            <p>粘贴客户 WhatsApp 回复或上传航班截图，AI 先整理成可编辑预览，再由 Sales 决定是否套用。</p>
          </div>
          <button className="quotation-type-close" type="button" onClick={close}>×</button>
        </div>

        <div className="ai-intake-input-grid">
          <label className="field">
            <span>Paste Customer Reply｜粘贴客户回复</span>
            <textarea value={customerReply} onChange={e=>setCustomerReply(e.target.value)} placeholder={"直接粘贴客户的 WhatsApp 回复，例如：\n12人，8成人2老人2小孩，小孩6岁和10岁..."} />
          </label>
          <label className="field">
            <span>Manual Notes｜补充说明</span>
            <textarea value={manualNotes} onChange={e=>setManualNotes(e.target.value)} placeholder="Sales 已知但客户讯息里没有写清楚的资料，可以补充在这里。"/>
          </label>
        </div>

        <div className="ai-intake-upload">
          <div>
            <strong>Upload Flight Screenshot｜上传航班截图</strong>
            <span>支持 JPG / PNG / WEBP，最多 4 张。可以是直飞、转机或机场更换的航班截图。</span>
          </div>
          <button className="btn" type="button" onClick={()=>inputRef.current?.click()}>Choose Screenshot</button>
          <input ref={inputRef} hidden type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={e=>{
            const selected=Array.from(e.target.files||[]).slice(0,4);
            setFiles(selected);
          }}/>
        </div>
        {files.length>0&&<div className="ai-intake-filechips">{files.map((f,i)=><span key={i} className="ai-intake-filechip">
          <span>{f.name}</span>
          <button type="button" aria-label={"Remove "+f.name} onClick={()=>{
            setFiles(prev=>prev.filter((_,index)=>index!==i));
            if(inputRef.current) inputRef.current.value="";
          }}>×</button>
        </span>)}</div>}

        <div className="ai-intake-actionbar">
          <button className="btn primary" type="button" disabled={analyzing||(!customerReply.trim()&&!manualNotes.trim()&&!files.length)} onClick={()=>void analyze()}>
            {analyzing?"AI Analyzing...":"Analyze with AI"}
          </button>
          {model&&<span className="ai-model-badge">{model}</span>}
        </div>
        {error&&<div className="ai-import-error">{error}</div>}

        {result&&<div className="ai-intake-results">
          {(result.warnings.length>0||result.missingFields.length>0)&&<section className="ai-intake-alerts">
            {result.warnings.map((w,i)=><div className="ai-intake-warning" key={"w"+i}>⚠ {w}</div>)}
            {result.missingFields.length>0&&<div className="ai-intake-missing"><strong>Missing / Needs follow-up:</strong> {result.missingFields.join(", ")}</div>}
          </section>}

          <section className="ai-intake-result-section">
            <div className="panel-head compact">
              <div><h3>Trip Basics｜基本资料</h3><p className="panel-subtext">所有 AI 识别结果都可以先修改再套用。</p></div>
              <button className="btn" type="button" onClick={()=>onApply({trip:result.trip})}>Apply Trip Info</button>
            </div>
            <div className="itinerary-meta-grid">
              <label className="field"><span>Departure City</span><input value={result.trip.departureCity} onChange={e=>updateTrip("departureCity",e.target.value)}/></label>
              <label className="field"><span>Destination</span><input value={result.trip.destination} onChange={e=>updateTrip("destination",e.target.value)}/></label>
              <label className="field"><span>Travel Start Date</span><input type="date" value={result.trip.travelStartDate} onChange={e=>updateTrip("travelStartDate",e.target.value)}/></label>
              <label className="field"><span>Travel End Date</span><input type="date" value={result.trip.travelEndDate} onChange={e=>updateTrip("travelEndDate",e.target.value)}/></label>
              <label className="field"><span>Pax</span><input type="number" min="1" value={result.trip.pax??""} onChange={e=>updateTrip("pax",e.target.value===""?null:Number(e.target.value))}/></label>
              <label className="field"><span>Budget</span><input value={result.trip.budget} onChange={e=>updateTrip("budget",e.target.value)}/></label>
              <label className="field"><span>Tour Type</span><input value={result.trip.tourType} onChange={e=>updateTrip("tourType",e.target.value)}/></label>
            </div>
          </section>

          <section className="ai-intake-result-section">
            <div className="panel-head compact">
              <div><h3>Traveller Composition｜旅客组成</h3></div>
              <button className="btn" type="button" onClick={()=>onApply({composition:result.composition})}>Apply Composition</button>
            </div>
            <div className="itinerary-meta-grid">
              <label className="field"><span>Adult</span><input type="number" min="0" value={result.composition.adultCount??""} onChange={e=>updateComposition("adultCount",e.target.value===""?null:Number(e.target.value))}/></label>
              <label className="field"><span>Senior</span><input type="number" min="0" value={result.composition.seniorCount??""} onChange={e=>updateComposition("seniorCount",e.target.value===""?null:Number(e.target.value))}/></label>
              <label className="field"><span>Child</span><input type="number" min="0" value={result.composition.childCount??""} onChange={e=>updateComposition("childCount",e.target.value===""?null:Number(e.target.value))}/></label>
            </div>
            <div className="inquiry-requirement-grid">
              <label className="field"><span>Senior Notes</span><textarea value={result.composition.seniorNotes} onChange={e=>updateComposition("seniorNotes",e.target.value)}/></label>
              <label className="field"><span>Child Ages</span><textarea value={result.composition.childAges} onChange={e=>updateComposition("childAges",e.target.value)}/></label>
              <label className="field"><span>Child Notes</span><textarea value={result.composition.childNotes} onChange={e=>updateComposition("childNotes",e.target.value)}/></label>
              <label className="field"><span>Mobility / Care Notes</span><textarea value={result.composition.mobilityNotes} onChange={e=>updateComposition("mobilityNotes",e.target.value)}/></label>
            </div>
          </section>

          <section className="ai-intake-result-section">
            <div className="panel-head compact">
              <div><h3>Travel Requirements｜旅游需求</h3></div>
              <button className="btn" type="button" onClick={()=>onApply({requirements:result.requirements})}>Apply Requirements</button>
            </div>
            <div className="inquiry-requirement-grid">
              <label className="field"><span>Flight Requirement</span><textarea value={result.requirements.flightRequirement} onChange={e=>updateReq("flightRequirement",e.target.value)}/></label>
              <label className="field"><span>Hotel Requirement</span><textarea value={result.requirements.hotelRequirement} onChange={e=>updateReq("hotelRequirement",e.target.value)}/></label>
              <label className="field"><span>Meal Requirement</span><textarea value={result.requirements.mealRequirement} onChange={e=>updateReq("mealRequirement",e.target.value)}/></label>
              <label className="field"><span>Special Request</span><textarea value={result.requirements.specialRequest} onChange={e=>updateReq("specialRequest",e.target.value)}/></label>
              <label className="field ai-intake-extra-notes"><span>Extra Notes</span><textarea value={result.requirements.extraNotes} onChange={e=>updateReq("extraNotes",e.target.value)}/></label>
            </div>
          </section>

          <section className="ai-intake-result-section">
            <div className="panel-head compact">
              <div><h3>Suggested Flights｜推荐航班</h3><p className="panel-subtext">Flight 会加入 Inquiry；Transit / Airport Transfer 作为识别提示保留，不会误建成航班。</p></div>
              <button className="btn" type="button" disabled={!result.flights.some(f=>f.segmentType==="flight")} onClick={()=>onApply({flights:result.flights})}>Apply Flights</button>
            </div>
            {result.flights.length===0?<div className="empty">没有识别到航班资料。</div>:<div className="ai-flight-preview-list">
              {result.flights.map((f,index)=><div className={"ai-flight-preview "+f.confidence} key={index}>
                <div className="ai-flight-preview-head">
                  <div><strong>{f.segmentType==="flight"?"✈ Flight":f.segmentType==="transit"?"⏱ Transit":"⇄ Airport Transfer"}</strong><span>{f.direction}</span></div>
                  <span className={"ai-confidence "+f.confidence}>{f.confidence}</span>
                </div>
                <div className="itinerary-meta-grid">
                  <label className="field"><span>From</span><input value={f.from} onChange={e=>updateFlight(index,"from",e.target.value.toUpperCase())}/></label>
                  <label className="field"><span>To</span><input value={f.to} onChange={e=>updateFlight(index,"to",e.target.value.toUpperCase())}/></label>
                  <label className="field"><span>Flight No.</span><input value={f.flightNo} onChange={e=>updateFlight(index,"flightNo",e.target.value.toUpperCase())}/></label>
                  <label className="field"><span>Date</span><input type="date" value={f.date} onChange={e=>updateFlight(index,"date",e.target.value)}/></label>
                  <label className="field"><span>Departure</span><input type="time" value={f.departureTime} onChange={e=>updateFlight(index,"departureTime",e.target.value)}/></label>
                  <label className="field"><span>Arrival</span><input type="time" value={f.arrivalTime} onChange={e=>updateFlight(index,"arrivalTime",e.target.value)}/></label>
                  <label className="field"><span>Departure Terminal</span><input value={f.departureTerminal} onChange={e=>updateFlight(index,"departureTerminal",e.target.value)}/></label>
                  <label className="field"><span>Arrival Terminal</span><input value={f.arrivalTerminal} onChange={e=>updateFlight(index,"arrivalTerminal",e.target.value)}/></label>
                  <label className="field"><span>Cabin</span><input value={f.cabin} onChange={e=>updateFlight(index,"cabin",e.target.value)}/></label>
                  <label className="field"><span>Baggage</span><input value={f.baggage} onChange={e=>updateFlight(index,"baggage",e.target.value)}/></label>
                  <label className="field"><span>Operating Carrier</span><input value={f.operatingCarrier} onChange={e=>updateFlight(index,"operatingCarrier",e.target.value)}/></label>
                  <label className="field"><span>Duration</span><input value={f.duration} onChange={e=>updateFlight(index,"duration",e.target.value)}/></label>
                  <label className="field ai-intake-flight-remarks"><span>Remarks</span><input value={f.remarks} onChange={e=>updateFlight(index,"remarks",e.target.value)}/></label>
                </div>
              </div>)}
            </div>}
          </section>

          <div className="ai-intake-apply-all">
            <button className="btn primary" type="button" onClick={()=>{
              onApply({trip:result.trip,composition:result.composition,requirements:result.requirements,flights:result.flights});
              setOpen(false);
            }}>Apply All to Inquiry</button>
          </div>
        </div>}
      </div>
    </div>}
  </>;
}

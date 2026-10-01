"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ImportResult={
  title:string;destination:string;departureCity:string;travelStartDate:string;travelEndDate:string;pax:number|null;tourType:string;
  suggestedFlights:Array<{from:string;to:string;flightNo:string;date:string;departureTime:string;arrivalTime:string;remarks:string}>;
  days:Array<{title:string;content:string;hotel:string;meals:{breakfast:string;lunch:string;dinner:string};attractions:string[]}>;
  hotels:Array<{name:string;cityArea:string;starRating:string;stayNights:string;roomSize:number|null;openingYear:string;renovationYear:string;nearbyNotes:string}>;
  includedItems:string[];notIncludedItems:string[];
  reminders:Array<{title:string;description:string}>;
  internalFindings:Array<{category:string;text:string;reason:string}>;
  warnings:string[];
};

const uid=()=>Math.random().toString(36).slice(2,10);

export default function AiSupplierImport(){
  const router=useRouter();
  const [file,setFile]=useState<File|null>(null);
  const [result,setResult]=useState<ImportResult|null>(null);
  const [analyzing,setAnalyzing]=useState(false);
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState("");
  const [model,setModel]=useState("");

  async function analyze(){
    if(!file) return;
    setAnalyzing(true);setError("");setResult(null);
    try{
      const form=new FormData();
      form.set("file",file);
      const res=await fetch("/api/ai-import-supplier",{method:"POST",body:form});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to analyze supplier file.");return;}
      setResult(data.result);
      setModel(data.model||"");
    }finally{setAnalyzing(false);}
  }

  async function createDraft(){
    if(!result) return;
    setCreating(true);setError("");
    try{
      const days=(result.days.length?result.days:[{title:"",content:"",hotel:"",meals:{breakfast:"",lunch:"",dinner:""},attractions:[]}]).map(day=>({
        id:uid(),title:day.title||"",content:day.content||"",hotel:day.hotel||"",
        meals:{breakfast:day.meals?.breakfast||"",lunch:day.meals?.lunch||"",dinner:day.meals?.dinner||""},
        attractions:(day.attractions||[]).map(name=>({id:uid(),name,images:[]})),
        completed:false,collapsed:false
      }));
      const hotels=(result.hotels||[]).map(h=>({
        id:uid(),name:h.name||"",cityArea:h.cityArea||"",starRating:h.starRating||"",stayNights:h.stayNights||"",
        roomSize:h.roomSize??"",openingYear:h.openingYear||"",renovationYear:h.renovationYear||"",nearbyNotes:h.nearbyNotes||"",images:[]
      }));
      const suggestedFlights=(result.suggestedFlights||[]).map(f=>({id:uid(),...f}));
      const includedItems=(result.includedItems||[]).map(name=>({id:uid(),preset:"other",name}));
      const notIncludedItems=(result.notIncludedItems||[]).map(name=>({id:uid(),preset:"other",name}));
      const reminders=(result.reminders||[]).map(r=>({id:uid(),preset:"other",title:r.title,description:r.description}));

      const payload={
        title:result.title||`AI Imported Itinerary - ${file?.name||"Supplier File"}`,
        destination:result.destination||"",
        days_count:Math.max(1,days.length),
        nights_count:Math.max(0,days.length-1),
        customer_name:"",
        status:"draft",
        itinerary_data:{
          departureCity:result.departureCity||"",
          travelStartDate:result.travelStartDate||"",
          travelEndDate:result.travelEndDate||"",
          pax:result.pax??"",
          tourType:result.tourType||"",
          suggestedFlights,days,hotels,includedItems,notIncludedItems,reminders,
          aiImportMeta:{sourceFileName:file?.name||"",model,warnings:result.warnings||[],importedAt:new Date().toISOString()}
        }
      };
      const res=await fetch("/api/internal-itineraries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:null,payload})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to create itinerary draft.");return;}
      router.push("/itineraries/"+data.id+"/edit");
    }finally{setCreating(false);}
  }

  return <div className="ai-import-workspace">
    <section className="panel ai-import-upload-panel">
      <div className="panel-head">
        <div>
          <h2>AI Import Supplier Itinerary</h2>
          <p className="panel-subtext">Operation only｜上传供应商文件，AI 会生成客户版 Draft，并把疑似成本/内部资料分开显示。</p>
        </div>
      </div>
      <div className="ai-import-upload-box">
        <label className="field">
          <span>Supplier File｜供应商文件</span>
          <input type="file" accept=".pdf,.doc,.docx,.rtf,.txt,.jpg,.jpeg,.png,.webp" onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);setError("");}}/>
        </label>
        <div className="ai-import-file-note">
          <strong>{file?file.name:"尚未选择文件"}</strong>
          <span>MVP 支持 PDF / Word / RTF / TXT / JPG / PNG / WEBP · 单个文件 ≤ 3.5MB</span>
        </div>
        <button className="btn primary" type="button" disabled={!file||analyzing} onClick={()=>void analyze()}>{analyzing?"AI Analyzing...":"Analyze with AI"}</button>
      </div>
      {error&&<div className="ai-import-error">{error}</div>}
    </section>

    {result&&<>
      <section className="panel">
        <div className="panel-head">
          <div><h2>Customer-facing Draft｜客户版草稿</h2><p className="panel-subtext">请 Operation 检查后再建立 Itinerary。AI 不确定的内容不会自行猜测。</p></div>
          {model&&<span className="ai-model-badge">{model}</span>}
        </div>
        <div className="ai-import-summary-grid">
          <div><span>Title</span><strong>{result.title||"—"}</strong></div>
          <div><span>Destination</span><strong>{result.destination||"—"}</strong></div>
          <div><span>Travel Dates</span><strong>{result.travelStartDate||"—"}{result.travelEndDate?" → "+result.travelEndDate:""}</strong></div>
          <div><span>Pax</span><strong>{result.pax??"—"}</strong></div>
          <div><span>Days</span><strong>{result.days.length}</strong></div>
          <div><span>Hotels</span><strong>{result.hotels.length}</strong></div>
        </div>

        <div className="ai-import-day-preview">
          {result.days.map((day,index)=><article key={index}>
            <div className="ai-import-day-no">DAY {String(index+1).padStart(2,"0")}</div>
            <div>
              <h3>{day.title||"Untitled Day"}</h3>
              <p>{day.content||"—"}</p>
              <small>Hotel: {day.hotel||"—"} · B: {day.meals?.breakfast||"—"} · L: {day.meals?.lunch||"—"} · D: {day.meals?.dinner||"—"}</small>
              {day.attractions?.length>0&&<div className="ai-import-tags">{day.attractions.map((a,i)=><span key={i}>{a}</span>)}</div>}
            </div>
          </article>)}
        </div>
      </section>

      {(result.internalFindings.length>0||result.warnings.length>0)&&<section className="panel ai-internal-review">
        <div className="panel-head"><div><h2>Operation Review｜内部检查</h2><p className="panel-subtext">以下内容不会写入客户版 Itinerary。</p></div></div>
        {result.internalFindings.length>0&&<div className="ai-internal-findings">
          {result.internalFindings.map((item,index)=><div key={index}>
            <strong>{item.category||"Internal"}</strong>
            <p>{item.text}</p>
            <small>{item.reason}</small>
          </div>)}
        </div>}
        {result.warnings.length>0&&<div className="ai-warning-list">
          {result.warnings.map((warning,index)=><div key={index}>⚠ {warning}</div>)}
        </div>}
      </section>}

      <section className="panel ai-import-apply-panel">
        <div>
          <strong>确认 AI Draft 没有把供应商成本或内部资料放进客户内容后，再建立行程。</strong>
          <span>建立后会直接进入现有 New Itinerary Editor，Jess 可以继续修改。</span>
        </div>
        <button className="btn primary" type="button" disabled={creating} onClick={()=>void createDraft()}>{creating?"Creating...":"Create Draft Itinerary"}</button>
      </section>
    </>}
  </div>;
}

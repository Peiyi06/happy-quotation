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

type ChatMessage={role:"user"|"assistant";text:string};
type AdjustmentProposal={reply:string;changeSummary:string[];revisedDraft:Omit<ImportResult,"internalFindings">};

const uid=()=>Math.random().toString(36).slice(2,10);

export default function AiSupplierImport(){
  const router=useRouter();
  const [file,setFile]=useState<File|null>(null);
  const [result,setResult]=useState<ImportResult|null>(null);
  const [analyzing,setAnalyzing]=useState(false);
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState("");
  const [model,setModel]=useState("");
  const [adjustmentNotes,setAdjustmentNotes]=useState("");

  const [chatInput,setChatInput]=useState("");
  const [chatting,setChatting]=useState(false);
  const [chatMessages,setChatMessages]=useState<ChatMessage[]>([]);
  const [proposal,setProposal]=useState<AdjustmentProposal|null>(null);

  async function analyze(){
    if(!file) return;
    setAnalyzing(true);setError("");setResult(null);setProposal(null);setChatMessages([]);
    try{
      const form=new FormData();
      form.set("file",file);
      form.set("adjustmentNotes",adjustmentNotes.trim());
      const res=await fetch("/api/ai-import-supplier",{method:"POST",body:form});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||"Unable to analyze supplier file.");return;}
      setResult(data.result);
      setModel(data.model||"");
    }finally{setAnalyzing(false);}
  }

  async function askAssistant(){
    if(!result||!chatInput.trim()) return;
    const instruction=chatInput.trim();
    const nextMessages=[...chatMessages,{role:"user" as const,text:instruction}];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatting(true);
    setProposal(null);
    setError("");
    try{
      const currentDraft={
        title:result.title,
        destination:result.destination,
        departureCity:result.departureCity,
        travelStartDate:result.travelStartDate,
        travelEndDate:result.travelEndDate,
        pax:result.pax,
        tourType:result.tourType,
        suggestedFlights:result.suggestedFlights,
        days:result.days,
        hotels:result.hotels,
        includedItems:result.includedItems,
        notIncludedItems:result.notIncludedItems,
        reminders:result.reminders,
        warnings:result.warnings
      };
      const res=await fetch("/api/ai-adjust-itinerary",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({currentDraft,instruction,history:chatMessages})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setError(data?.error||"AI could not adjust this itinerary.");
        return;
      }
      const p=data.result as AdjustmentProposal;
      setProposal(p);
      setChatMessages([...nextMessages,{role:"assistant",text:p.reply||"I prepared a revised itinerary for your review."}]);
      if(data.model) setModel(data.model);
    }finally{setChatting(false);}
  }

  function applyProposal(){
    if(!result||!proposal) return;
    setResult({
      ...proposal.revisedDraft,
      internalFindings:result.internalFindings
    });
    setProposal(null);
    setChatMessages(prev=>[...prev,{role:"assistant",text:"Changes applied to the current draft."}]);
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
          aiImportMeta:{sourceFileName:file?.name||"",adjustmentNotes:adjustmentNotes.trim(),model,warnings:result.warnings||[],importedAt:new Date().toISOString()}
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
          <input type="file" accept=".pdf,.doc,.docx,.rtf,.txt,.jpg,.jpeg,.png,.webp" onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);setError("");setProposal(null);setChatMessages([]);}}/>
        </label>
        <div className="ai-import-file-note">
          <strong>{file?file.name:"尚未选择文件"}</strong>
          <span>MVP 支持 PDF / Word / RTF / TXT / JPG / PNG / WEBP · 单个文件 ≤ 3.5MB</span>
        </div>
      </div>

      <div className="ai-pre-adjustment">
        <label className="field">
          <span>Adjustment Notes｜调整备注 <small>Optional</small></span>
          <textarea
            value={adjustmentNotes}
            onChange={e=>setAdjustmentNotes(e.target.value)}
            placeholder={"例如：供应商原本是 6D5N，但实际航班为 7D6N。\nDay 1 上午抵达，请增加轻松行程；原供应商 Day 1 内容顺延。\nDay 7 晚班机，白天可继续安排市区活动。\n尽量保留原本主要景点和酒店结构。"}
          />
        </label>
        <div className="ai-adjustment-hint">
          <strong>AI 会在第一次分析时同时参考这段备注</strong>
          <span>已知航班、天数变化、景点移动、节奏要求、酒店要求等都可以先写在这里。没有备注也可以直接分析。</span>
        </div>
      </div>

      <div className="ai-import-primary-action">
        <button className="btn primary" type="button" disabled={!file||analyzing} onClick={()=>void analyze()}>{analyzing?"AI Analyzing...":"Analyze & Generate Draft"}</button>
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

      <section className="panel ai-assistant-panel">
        <div className="panel-head">
          <div>
            <h2>AI Itinerary Assistant｜AI 行程调整助手</h2>
            <p className="panel-subtext">告诉 AI 实际航班、天数或调整要求。AI 会先提出修改方案，确认后才套用到 Draft。</p>
          </div>
        </div>

        <div className="ai-assistant-layout">
          <div className="ai-chat-column">
            <div className="ai-chat-log">
              {chatMessages.length===0&&<div className="ai-chat-empty">
                例如：供应商是 6D5N，但我们实际航班变成 7D6N。第一天上午抵达，请安排轻松景点，不要删除原本主要景点。
              </div>}
              {chatMessages.map((m,index)=><div key={index} className={"ai-chat-message "+m.role}>
                <span>{m.role==="user"?"Operation":"AI Assistant"}</span>
                <p>{m.text}</p>
              </div>)}
              {chatting&&<div className="ai-chat-thinking">AI is preparing a revised itinerary...</div>}
            </div>

            <div className="ai-chat-compose">
              <textarea
                value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                placeholder="Ask AI to adjust this itinerary..."
                onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();void askAssistant();}}}
              />
              <div className="ai-chat-compose-foot">
                <span>Ctrl / Cmd + Enter to send</span>
                <button className="btn primary" type="button" disabled={!chatInput.trim()||chatting} onClick={()=>void askAssistant()}>{chatting?"Adjusting...":"Ask AI to Adjust"}</button>
              </div>
            </div>
          </div>

          <div className="ai-change-column">
            {!proposal&&<div className="ai-change-empty">
              <strong>Changes Preview</strong>
              <span>AI 调整后会先在这里列出修改内容，不会直接覆盖当前 Draft。</span>
            </div>}

            {proposal&&<div className="ai-change-preview">
              <div className="ai-change-preview-head">
                <div><strong>Proposed Changes｜建议修改</strong><span>{proposal.revisedDraft.days.length} Days · {Math.max(0,proposal.revisedDraft.days.length-1)} Nights</span></div>
              </div>
              <div className="ai-change-list">
                {proposal.changeSummary.map((item,index)=><div key={index}><span>{index+1}</span><p>{item}</p></div>)}
              </div>
              {proposal.revisedDraft.warnings.length>0&&<div className="ai-warning-list">
                {proposal.revisedDraft.warnings.map((w,index)=><div key={index}>⚠ {w}</div>)}
              </div>}
              <div className="ai-change-actions">
                <button className="btn" type="button" onClick={()=>setProposal(null)}>Reject</button>
                <button className="btn primary" type="button" onClick={applyProposal}>Apply Changes</button>
              </div>
            </div>}
          </div>
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

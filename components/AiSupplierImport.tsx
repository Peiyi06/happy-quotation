"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

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
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const [file,setFile]=useState<File|null>(null);
  const [result,setResult]=useState<ImportResult|null>(null);
  const [analyzing,setAnalyzing]=useState(false);
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState("");
  const [model,setModel]=useState("");
  const supplierInputRef=useRef<HTMLInputElement|null>(null);
  const [adjustmentNotes,setAdjustmentNotes]=useState("");

  const [chatInput,setChatInput]=useState("");
  const [chatting,setChatting]=useState(false);
  const [chatMessages,setChatMessages]=useState<ChatMessage[]>([]);
  const [proposal,setProposal]=useState<AdjustmentProposal|null>(null);
  const [inquiryContext,setInquiryContext]=useState<any>(null);

  useEffect(()=>{
    const sourceInquiry=new URLSearchParams(window.location.search).get("sourceInquiry");
    if(!sourceInquiry) return;
    let cancelled=false;
    fetch("/api/internal-inquiry-context?id="+encodeURIComponent(sourceInquiry),{cache:"no-store"})
      .then(async res=>{
        const data=await res.json().catch(()=>({}));
        if(!cancelled&&res.ok&&data?.ok) setInquiryContext(data.context||null);
      })
      .catch(()=>{});
    return ()=>{cancelled=true;};
  },[]);

  async function analyze(){
    if(!file) return;
    setAnalyzing(true);setError("");setResult(null);setProposal(null);setChatMessages([]);
    try{
      const form=new FormData();
      form.set("file",file);
      form.set("adjustmentNotes",adjustmentNotes.trim());
      const res=await fetch("/api/ai-import-supplier",{method:"POST",body:form});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||t("Unable to analyze supplier file.","无法分析供应商文件。"));return;}
      const parsed=data.result as ImportResult;
      const linked=inquiryContext||{};
      setResult({
        ...parsed,
        destination:parsed.destination||linked.destination||"",
        departureCity:parsed.departureCity||linked.departureCity||"",
        travelStartDate:parsed.travelStartDate||linked.travelStartDate||"",
        travelEndDate:parsed.travelEndDate||linked.travelEndDate||"",
        pax:parsed.pax??linked.pax??null,
        tourType:parsed.tourType||linked.tourType||"",
        suggestedFlights:(parsed.suggestedFlights||[]).length?parsed.suggestedFlights:(Array.isArray(linked.suggestedFlights)?linked.suggestedFlights:[])
      });
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
        setError(data?.error||t("AI could not adjust this itinerary.","AI 无法调整这份行程。"));
        return;
      }
      const p=data.result as AdjustmentProposal;
      setProposal(p);
      setChatMessages([...nextMessages,{role:"assistant",text:p.reply||t("I prepared a revised itinerary for your review.","我已经准备了一版修改后的行程供你检查。")}]);
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
    setChatMessages(prev=>[...prev,{role:"assistant",text:t("Changes applied to the current draft.","修改已套用到当前草稿。")}]);
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
        source_inquiry_id:inquiryContext?.id||"",
        title:result.title||`AI Itinerary - ${file?.name||"Source File"}`,
        destination:result.destination||inquiryContext?.destination||"",
        days_count:Math.max(1,days.length),
        nights_count:Math.max(0,days.length-1),
        customer_name:inquiryContext?.customerName||"",
        status:"draft",
        itinerary_data:{
          departureCity:result.departureCity||inquiryContext?.departureCity||"",
          travelStartDate:result.travelStartDate||inquiryContext?.travelStartDate||"",
          travelEndDate:result.travelEndDate||inquiryContext?.travelEndDate||"",
          pax:result.pax??inquiryContext?.pax??"",
          tourType:result.tourType||inquiryContext?.tourType||"",
          suggestedFlights:suggestedFlights.length?suggestedFlights:(Array.isArray(inquiryContext?.suggestedFlights)?inquiryContext.suggestedFlights.map((f:any)=>({id:uid(),...f})):[]),
          days,hotels,includedItems,notIncludedItems,reminders,
          sourceInquiryId:inquiryContext?.id||"",
          sourceInquiryNo:inquiryContext?.inquiryNo||"",
          sourceInquirySnapshot:inquiryContext||null,
          aiImportMeta:{sourceFileName:file?.name||"",adjustmentNotes:adjustmentNotes.trim(),model,warnings:result.warnings||[],importedAt:new Date().toISOString()}
        }
      };
      const res=await fetch("/api/internal-itineraries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:null,payload})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setError(data?.error||t("Unable to create itinerary draft.","无法建立行程草稿。"));return;}
      router.push("/itineraries/"+data.id+"/edit");
    }finally{setCreating(false);}
  }

  return <div className="ai-import-workspace">
    {inquiryContext&&<section className="quote-source-inquiry">
      <div>
        <span>{t("SOURCE INQUIRY","来源询价")}</span>
        <strong>{inquiryContext.inquiryNo||t("Linked Inquiry","关联询价")}</strong>
        <small>{[inquiryContext.destination,inquiryContext.daysCount&&inquiryContext.nightsCount?`${inquiryContext.daysCount}D${inquiryContext.nightsCount}N`:"",inquiryContext.pax?`${inquiryContext.pax} Pax`:""].filter(Boolean).join(" · ")}</small>
      </div>
      <button className="btn" type="button" onClick={()=>router.push("/inquiries/"+inquiryContext.id)}>{t("Open Inquiry","打开询价")}</button>
    </section>}
    <section className="panel ai-import-upload-panel">
      <div className="panel-head">
        <div>
          <h2>{t("AI Itinerary Generator","智能行程生成")}</h2>
          <p className="panel-subtext">{t("Upload an itinerary file or combine it with Inquiry data. AI will create an editable customer-facing draft while separating suspected cost and internal content.","上传行程文件或结合 Inquiry 资料，AI 会快速整理并生成可编辑的客户版 Itinerary Draft，同时把疑似成本与内部资料分开显示。")}</p>
        </div>
      </div>
      <div className="ai-import-upload-box">
        <label className="field">
          <span>{t("Source File","行程来源文件")}</span>
          <input ref={supplierInputRef} type="file" accept=".pdf,.doc,.docx,.rtf,.txt,.jpg,.jpeg,.png,.webp" onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);setError("");setProposal(null);setChatMessages([]);}}/>
        </label>
        <div className="ai-import-file-note">
          <div className="ai-import-file-note-head">
            <strong>{file?file.name:t("No file selected","尚未选择文件")}</strong>
            {file&&<button className="ai-import-remove-file" type="button" onClick={()=>{
              setFile(null);
              setResult(null);
              setError("");
              setProposal(null);
              setChatMessages([]);
              setModel("");
              if(supplierInputRef.current) supplierInputRef.current.value="";
            }}>{t("× Remove File","× 移除文件")}</button>}
          </div>
          <span>{t("MVP supports PDF / Word / RTF / TXT / JPG / PNG / WEBP · Maximum 3.5MB per file","MVP 支持 PDF / Word / RTF / TXT / JPG / PNG / WEBP · 单个文件 ≤ 3.5MB")}</span>
        </div>
      </div>

      <div className="ai-pre-adjustment">
        <label className="field">
          <span>{t("Adjustment Notes","调整备注")} <small>{t("Optional","选填")}</small></span>
          <textarea
            value={adjustmentNotes}
            onChange={e=>setAdjustmentNotes(e.target.value)}
            placeholder={t("e.g. Supplier itinerary is 6D5N but actual flights make it 7D6N.\nDay 1 arrives in the morning; add light activities and shift the original Day 1 plan.\nDay 7 has an evening flight, so daytime city activities are still possible.\nKeep the main attractions and hotel structure where possible.","例如：供应商原本是 6D5N，但实际航班为 7D6N。\nDay 1 上午抵达，请增加轻松行程；原供应商 Day 1 内容顺延。\nDay 7 晚班机，白天可继续安排市区活动。\n尽量保留原本主要景点和酒店结构。")}
          />
        </label>
        <div className="ai-adjustment-hint">
          <strong>{t("AI will use these notes during the first analysis","AI 会在第一次分析时同时参考这段备注")}</strong>
          <span>{t("Add known flight details, duration changes, attraction moves, pacing or hotel requirements here. You can also analyze without notes.","已知航班、天数变化、景点移动、节奏要求、酒店要求等都可以先写在这里。没有备注也可以直接分析。")}</span>
        </div>
      </div>

      <div className="ai-import-primary-action">
        <button className="btn primary" type="button" disabled={!file||analyzing} onClick={()=>void analyze()}>{analyzing?t("AI Generating...","AI 生成中..."):t("Generate Itinerary Draft","生成行程草稿")}</button>
      </div>
      {error&&<div className="ai-import-error">{error}</div>}
    </section>

    {result&&<>
      <section className="panel">
        <div className="panel-head">
          <div><h2>{t("AI Itinerary Draft","智能行程草稿")}</h2><p className="panel-subtext">{t("AI generated an editable itinerary from the source material. Review it before creating the formal Itinerary.","AI 已根据来源资料生成可编辑行程，请检查内容后再建立正式 Itinerary。")}</p></div>
          {model&&<span className="ai-model-badge">{model}</span>}
        </div>
        <div className="ai-import-summary-grid">
          <div><span>{t("Title","标题")}</span><strong>{result.title||"—"}</strong></div>
          <div><span>{t("Destination","目的地")}</span><strong>{result.destination||"—"}</strong></div>
          <div><span>{t("Travel Dates","旅游日期")}</span><strong>{result.travelStartDate||"—"}{result.travelEndDate?" → "+result.travelEndDate:""}</strong></div>
          <div><span>{t("Pax","人数")}</span><strong>{result.pax??"—"}</strong></div>
          <div><span>{t("Days","天数")}</span><strong>{result.days.length}</strong></div>
          <div><span>{t("Hotels","酒店")}</span><strong>{result.hotels.length}</strong></div>
        </div>

        <div className="ai-import-day-preview">
          {result.days.map((day,index)=><article key={index}>
            <div className="ai-import-day-no">{t("DAY","第")} {String(index+1).padStart(2,"0")}{language==="zh"?" 天":""}</div>
            <div>
              <h3>{day.title||t("Untitled Day","未命名行程日")}</h3>
              <p>{day.content||"—"}</p>
              <small>{t("Hotel","酒店")}: {day.hotel||"—"} · {t("B","早")}: {day.meals?.breakfast||"—"} · {t("L","午")}: {day.meals?.lunch||"—"} · {t("D","晚")}: {day.meals?.dinner||"—"}</small>
              {day.attractions?.length>0&&<div className="ai-import-tags">{day.attractions.map((a,i)=><span key={i}>{a}</span>)}</div>}
            </div>
          </article>)}
        </div>
      </section>

      <section className="panel ai-assistant-panel">
        <div className="panel-head">
          <div>
            <h2>{t("AI Itinerary Assistant","AI 行程调整助手")}</h2>
            <p className="panel-subtext">{t("Tell AI the actual flights, duration or adjustment requirements. AI proposes changes first and applies them only after confirmation.","告诉 AI 实际航班、天数或调整要求。AI 会先提出修改方案，确认后才套用到 Draft。")}</p>
          </div>
        </div>

        <div className="ai-assistant-layout">
          <div className="ai-chat-column">
            <div className="ai-chat-log">
              {chatMessages.length===0&&<div className="ai-chat-empty">
                {t("Example: The supplier itinerary is 6D5N but our actual flights make it 7D6N. We arrive on Day 1 morning, so add light activities without removing the main attractions.","例如：供应商是 6D5N，但我们实际航班变成 7D6N。第一天上午抵达，请安排轻松景点，不要删除原本主要景点。")}
              </div>}
              {chatMessages.map((m,index)=><div key={index} className={"ai-chat-message "+m.role}>
                <span>{m.role==="user"?t("Operation","运营"):t("AI Assistant","AI 助手")}</span>
                <p>{m.text}</p>
              </div>)}
              {chatting&&<div className="ai-chat-thinking">{t("AI is preparing a revised itinerary...","AI 正在准备修改后的行程...")}</div>}
            </div>

            <div className="ai-chat-compose">
              <textarea
                value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                placeholder={t("Ask AI to adjust this itinerary...","请 AI 调整这份行程...")}
                onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();void askAssistant();}}}
              />
              <div className="ai-chat-compose-foot">
                <span>{t("Ctrl / Cmd + Enter to send","Ctrl / Cmd + Enter 发送")}</span>
                <button className="btn primary" type="button" disabled={!chatInput.trim()||chatting} onClick={()=>void askAssistant()}>{chatting?t("Adjusting...","调整中..."):t("Ask AI to Adjust","请 AI 调整")}</button>
              </div>
            </div>
          </div>

          <div className="ai-change-column">
            {!proposal&&<div className="ai-change-empty">
              <strong>{t("Changes Preview","修改预览")}</strong>
              <span>{t("AI will list proposed changes here first and will not overwrite the current draft automatically.","AI 调整后会先在这里列出修改内容，不会直接覆盖当前 Draft。")}</span>
            </div>}

            {proposal&&<div className="ai-change-preview">
              <div className="ai-change-preview-head">
                <div><strong>{t("Proposed Changes","建议修改")}</strong><span>{proposal.revisedDraft.days.length} {t("Days","天")} · {Math.max(0,proposal.revisedDraft.days.length-1)} {t("Nights","晚")}</span></div>
              </div>
              <div className="ai-change-list">
                {proposal.changeSummary.map((item,index)=><div key={index}><span>{index+1}</span><p>{item}</p></div>)}
              </div>
              {proposal.revisedDraft.warnings.length>0&&<div className="ai-warning-list">
                {proposal.revisedDraft.warnings.map((w,index)=><div key={index}>⚠ {w}</div>)}
              </div>}
              <div className="ai-change-actions">
                <button className="btn" type="button" onClick={()=>setProposal(null)}>{t("Reject","拒绝")}</button>
                <button className="btn primary" type="button" onClick={applyProposal}>{t("Apply Changes","套用修改")}</button>
              </div>
            </div>}
          </div>
        </div>
      </section>

      {(result.internalFindings.length>0||result.warnings.length>0)&&<section className="panel ai-internal-review">
        <div className="panel-head"><div><h2>{t("Operation Review","内部检查")}</h2><p className="panel-subtext">{t("The content below will not be written into the customer-facing Itinerary.","以下内容不会写入客户版 Itinerary。")}</p></div></div>
        {result.internalFindings.length>0&&<div className="ai-internal-findings">
          {result.internalFindings.map((item,index)=><div key={index}>
            <strong>{item.category||t("Internal","内部")}</strong>
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
          <strong>{t("Create the itinerary only after confirming the AI Draft does not include supplier costs or internal information in customer content.","确认 AI Draft 没有把供应商成本或内部资料放进客户内容后，再建立行程。")}</strong>
          <span>{t("After creation, you will enter the existing New Itinerary Editor for further editing.","建立后会直接进入现有 New Itinerary Editor，Jess 可以继续修改。")}</span>
        </div>
        <button className="btn primary" type="button" disabled={creating} onClick={()=>void createDraft()}>{creating?t("Creating...","建立中..."):t("Create Draft Itinerary","建立行程草稿")}</button>
      </section>
    </>}
  </div>;
}

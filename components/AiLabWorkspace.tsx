"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type LinkItem={label:string;href:string;kind:string};
type PendingAction={type:string;inquiryId:string;targetId:string;label:string;confirmText:string;nextStatus:string;payloadJson:string};
type MemorySuggestion={shouldSuggest:boolean;category:string;title:string;ruleText:string;reason:string};
type Attachment={name:string;url?:string;type?:string;size?:number};
type WorkThread={id:string;title:string;linked_inquiry_id?:string|null;context_title?:string;inquiry_no?:string|null;destination?:string|null;inquiry_status?:string|null;last_active_at?:string;archived?:boolean};
type Message={role:"user"|"assistant";text:string;links?:LinkItem[];action?:PendingAction;memorySuggestion?:MemorySuggestion;attachments?:Attachment[]};

const starterPrompts=[
  "今天有什么需要我注意？",
  "哪些 Inquiry 还在等 Supplier Quote？",
  "帮我找最近更新的 Inquiry",
  "有哪些 Quotation 还在 Draft？"
];

export default function AiLabWorkspace(){
  const router=useRouter();
  const [messages,setMessages]=useState<Message[]>([
    {role:"assistant",text:"这是独立的 AI Lab Beta。现有系统页面不会被改变。你可以直接问我 Inquiry、Quotation、Itinerary 的状态，或让我带你去下一步。"}
  ]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [actionLoading,setActionLoading]=useState(false);
  const [memorySaving,setMemorySaving]=useState(false);
  const [contextInquiryId,setContextInquiryId]=useState("");
  const [contextTitle,setContextTitle]=useState("");
  const [threadId,setThreadId]=useState("");
  const [threads,setThreads]=useState<WorkThread[]>([]);
  const [archivedThreads,setArchivedThreads]=useState<WorkThread[]>([]);
  const [showArchived,setShowArchived]=useState(false);
  const [threadsLoading,setThreadsLoading]=useState(false);
  const [saveState,setSaveState]=useState<"saved"|"saving"|"">("");
  const [imageFiles,setImageFiles]=useState<File[]>([]);
  const [imagePreviews,setImagePreviews]=useState<Attachment[]>([]);
  const fileInputRef=useRef<HTMLInputElement|null>(null);


  async function loadThreads(){
    setThreadsLoading(true);
    try{
      const [activeRes,archivedRes]=await Promise.all([
        fetch("/api/ai-lab/threads",{cache:"no-store"}),
        fetch("/api/ai-lab/threads?archived=true",{cache:"no-store"})
      ]);
      const activeData=await activeRes.json().catch(()=>({}));
      const archivedData=await archivedRes.json().catch(()=>({}));
      if(activeRes.ok&&activeData?.ok) setThreads(Array.isArray(activeData.threads)?activeData.threads:[]);
      if(archivedRes.ok&&archivedData?.ok) setArchivedThreads(Array.isArray(archivedData.threads)?archivedData.threads:[]);
    }finally{setThreadsLoading(false);}
  }

  useEffect(()=>{void loadThreads();},[]);

  function newThread(){
    setThreadId("");
    setContextInquiryId("");
    setContextTitle("");
    setMessages([{role:"assistant",text:"新的工作对话已经准备好。直接告诉我你要处理什么；第一次发送后会自动建立并保存 Thread。"}]);
    setSaveState("");
  }

  async function openThread(id:string){
    if(loading||actionLoading) return;
    const res=await fetch("/api/ai-lab/threads?id="+encodeURIComponent(id),{cache:"no-store"});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data?.ok) return;
    const t=data.thread||{};
    const loaded=(Array.isArray(t.messages)?t.messages:[]).map((m:any)=>{
      const payload=m.payload||{};
      return {
        role:m.role==="assistant"?"assistant":"user",
        text:String(m.text||""),
        links:Array.isArray(payload.links)?payload.links:[],
        action:payload.action?.type&&payload.action.type!=="none"?payload.action:undefined,
        memorySuggestion:payload.memorySuggestion?.shouldSuggest?payload.memorySuggestion:undefined,
        attachments:Array.isArray(payload.attachments)?payload.attachments:[]
      } as Message;
    });
    setThreadId(String(t.id||id));
    setContextInquiryId(String(t.linked_inquiry_id||""));
    setContextTitle(String(t.context_title||""));
    setMessages(loaded.length?loaded:[{role:"assistant",text:"这个 Thread 还没有消息。"}]);
    setSaveState("saved");
  }

  async function setThreadArchived(id:string,archived:boolean){
    const res=await fetch("/api/ai-lab/threads",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id,archived})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data?.ok) return;
    if(archived&&threadId===id) newThread();
    await loadThreads();
  }

  async function clearSavedProposal(key:"action"|"memorySuggestion"){
    if(!threadId) return;
    await fetch("/api/ai-lab/threads",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:"clearPayload",id:threadId,key})
    }).catch(()=>null);
  }

  async function send(text?:string){
    const message=(text??input).trim();
    if((!message&&!imageFiles.length)||loading) return;
    const attachments=imagePreviews.map(x=>({...x}));
    const userMessage:Message={role:"user",text:message||"请分析这些图片",attachments};
    setMessages(prev=>[...prev,userMessage]);
    setInput("");
    setLoading(true);
    setSaveState("saving");
    try{
      const form=new FormData();
      form.set("message",message);
      form.set("contextInquiryId",contextInquiryId);
      form.set("threadId",threadId);
      imageFiles.forEach(file=>form.append("images",file));
      const res=await fetch("/api/ai-lab/chat",{method:"POST",body:form});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        if(data?.threadId&&!threadId) setThreadId(String(data.threadId));
        setSaveState(data?.saved?"saved":"");
        setMessages(prev=>[...prev,{role:"assistant",text:data?.error||"AI Lab 暂时无法回应，请稍后再试。"}]);
        await loadThreads();
        return;
      }
      const result=data.result||{};
      if(data.threadId) setThreadId(String(data.threadId));
      setSaveState(data.saved?"saved":"");
      if(result.contextInquiryId){setContextInquiryId(result.contextInquiryId);setContextTitle(result.contextTitle||"Current Inquiry");}
      setMessages(prev=>[...prev,{
        role:"assistant",
        text:result.reply||"我已经检查了系统资料。",
        links:Array.isArray(result.links)?result.links:[],
        action:result.action?.type&&result.action.type!=="none"?result.action:undefined,
        memorySuggestion:result.memorySuggestion?.shouldSuggest?result.memorySuggestion:undefined
      }]);
      await loadThreads();
    }finally{
      setLoading(false);
      setImageFiles([]);
      setImagePreviews([]);
      if(fileInputRef.current) fileInputRef.current.value="";
    }
  }

  async function saveCompanyRule(suggestion:MemorySuggestion){
    if(memorySaving) return;
    setMemorySaving(true);
    try{
      const res=await fetch("/api/ai-lab/memory",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({category:suggestion.category,title:suggestion.title,ruleText:suggestion.ruleText})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setMessages(prev=>[...prev,{role:"assistant",text:data?.error||"Company Rule 保存失败。"}]);
        return;
      }
      await clearSavedProposal("memorySuggestion");
      setMessages(prev=>prev.map(m=>m.memorySuggestion===suggestion?{...m,memorySuggestion:undefined}:m).concat({role:"assistant",text:"已保存为 Company Memory。以后遇到相关情况，我会参考这条公司规则。"}));
    }finally{setMemorySaving(false);}
  }

  async function confirmAction(action:PendingAction){
    if(actionLoading||action.type==="none") return;
    setActionLoading(true);
    try{
      const isWorkflow=action.type==="update_supplier_status";
      const res=await fetch(isWorkflow?"/api/internal-inquiry-workflow":"/api/ai-lab/execute",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(isWorkflow
          ? {id:action.inquiryId,supplierStatus:action.nextStatus}
          : {
              type:action.type,
              targetId:action.targetId||action.inquiryId||"",
              payloadJson:action.payloadJson||"{}",
              contextInquiryId,
              threadId
            })
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setMessages(prev=>[...prev,{role:"assistant",text:"操作没有执行："+(data?.error||"Unknown error")}]);
        return;
      }

      if(isWorkflow){
        await clearSavedProposal("action");
        setMessages(prev=>prev.map(m=>m.action===action?{...m,action:undefined}:m).concat({role:"assistant",text:"已确认执行。系统状态已经更新。你可以继续问我「下一步是什么？」"}));
      }else{
        if(data.contextInquiryId) setContextInquiryId(String(data.contextInquiryId));
        if(data.contextTitle) setContextTitle(String(data.contextTitle));
        const successText=data.type==="create_inquiry"
          ?"Inquiry 已建立："+(data.recordNo||data.id)
          :data.type==="update_inquiry"
            ?"Inquiry 已更新："+(data.recordNo||data.id)
            :data.type==="create_itinerary"
              ?"Itinerary Draft 已建立："+(data.recordNo||data.id)
              :"Itinerary 已更新："+(data.recordNo||data.id);
        setMessages(prev=>prev.map(m=>m.action===action?{...m,action:undefined}:m).concat({
          role:"assistant",
          text:successText,
          links:data.href?[{label:data.type.includes("itinerary")?"Open Itinerary":"Open Inquiry",href:data.href,kind:data.type.includes("itinerary")?"itinerary":"inquiry"}]:[]
        }));
        setSaveState("saved");
        await loadThreads();
      }
      router.refresh();
    }finally{setActionLoading(false);}
  }

  function addImages(files:FileList|null){
    const next=Array.from(files||[]).filter(file=>["image/jpeg","image/png","image/webp"].includes(file.type));
    if(!next.length) return;
    const available=Math.max(0,4-imageFiles.length);
    const accepted=next.slice(0,available).filter(file=>file.size<=5*1024*1024);
    if(!accepted.length) return;
    setImageFiles(prev=>[...prev,...accepted]);
    setImagePreviews(prev=>[...prev,...accepted.map(file=>({name:file.name,url:URL.createObjectURL(file)}))]);
    if(fileInputRef.current) fileInputRef.current.value="";
  }

  function removeImage(index:number){
    const preview=imagePreviews[index];
    if(preview?.url) URL.revokeObjectURL(preview.url);
    setImageFiles(prev=>prev.filter((_,i)=>i!==index));
    setImagePreviews(prev=>prev.filter((_,i)=>i!==index));
  }

  function clearContext(){
    newThread();
  }

  return <div className="ai-lab-shell">
    <section className="ai-lab-main">
      <div className="ai-lab-hero">
        <div><span>HAPPY AI LAB · BETA</span><h1>What would you like to work on?</h1><p>先实验 AI 操作方式；现有 Inquiry / Quotation / Itinerary 页面全部保留。</p></div>
        <span className="ai-lab-mode">READ-MOSTLY · CONFIRM BEFORE WRITE</span>
      </div>

      <div className="ai-lab-chat">
        {messages.map((m,index)=><div key={index} className={"ai-lab-message "+m.role}>
          <div className="ai-lab-message-label">{m.role==="user"?"You":"Happy AI"}</div>
          <div className="ai-lab-bubble">
            {m.attachments&&m.attachments.length>0&&<div className="ai-lab-message-images">{m.attachments.map((a,i)=>a.url?<img key={i} src={a.url} alt={a.name}/>:<span key={i} className="ai-lab-restored-attachment">📎 {a.name}</span>)}</div>}
            <p>{m.text}</p>
            {m.links&&m.links.length>0&&<div className="ai-lab-links">{m.links.map((link,i)=><a key={i} href={link.href}>{link.label}<span>→</span></a>)}</div>}
            {m.memorySuggestion&&<div className="ai-lab-memory-proposal">
              <span>COMPANY MEMORY｜建议保存</span>
              <strong>{m.memorySuggestion.title}</strong>
              <p>{m.memorySuggestion.ruleText}</p>
              <div>
                <button type="button" className="btn" disabled={memorySaving} onClick={()=>setMessages(prev=>prev.map(x=>x===m?{...x,memorySuggestion:undefined}:x))}>Ignore</button>
                <button type="button" className="workflow-primary-btn" disabled={memorySaving} onClick={()=>void saveCompanyRule(m.memorySuggestion!)}>{memorySaving?"Saving...":"Save as Company Rule"}</button>
              </div>
            </div>}
            {m.action&&<div className="ai-lab-action-card">
              <span>PROPOSED ACTION｜待确认操作</span>
              <strong>{m.action.confirmText}</strong>
              <div><button type="button" className="btn" disabled={actionLoading} onClick={()=>setMessages(prev=>prev.map(x=>x===m?{...x,action:undefined}:x))}>Cancel</button><button type="button" className="workflow-primary-btn" disabled={actionLoading} onClick={()=>void confirmAction(m.action!)}>{actionLoading?"Working...":m.action.label||"Confirm"}</button></div>
            </div>}
          </div>
        </div>)}
        {loading&&<div className="ai-lab-message assistant"><div className="ai-lab-message-label">Happy AI</div><div className="ai-lab-bubble thinking">正在读取系统资料...</div></div>}
      </div>

      {messages.length<=1&&<div className="ai-lab-starters">{starterPrompts.map(p=><button key={p} type="button" onClick={()=>void send(p)}>{p}</button>)}</div>}

      {imagePreviews.length>0&&<div className="ai-lab-upload-previews">{imagePreviews.map((a,i)=><div key={a.url} className="ai-lab-upload-chip"><img src={a.url} alt={a.name}/><span>{a.name}</span><button type="button" aria-label={"Remove "+a.name} onClick={()=>removeImage(i)}>×</button></div>)}</div>}
      <div className="ai-lab-compose">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e=>addImages(e.target.files)}/>
        <button type="button" className="ai-lab-attach-btn" disabled={loading||imageFiles.length>=4} onClick={()=>fileInputRef.current?.click()}>＋</button>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="可以输入文字，或直接上传 WhatsApp / 航班 / 报价截图…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}}/>
        <button type="button" className="workflow-primary-btn" disabled={(!input.trim()&&!imageFiles.length)||loading} onClick={()=>void send()}>{loading?"Thinking...":"Send"}</button>
      </div>
      <div className="ai-lab-compose-note">支持 JPG / PNG / WEBP · 最多 4 张 · 每张 ≤ 5MB · 对话自动保存 · Enter 发送 · AI 修改系统前仍需确认</div>
    </section>

    <aside className="ai-lab-context">
      <div className="ai-thread-panel">
        <div className="ai-thread-panel-head"><div><span>WORK THREADS</span><strong>Active Conversations</strong></div><button type="button" onClick={newThread}>＋ New</button></div>
        <div className="ai-thread-save-state">{saveState==="saving"?"Saving...":saveState==="saved"?"✓ Saved":"Auto-save on"}</div>
        {threadsLoading?<p className="ai-lab-context-empty">Loading threads...</p>:threads.length>0?<div className="ai-thread-list">
          {threads.map(t=><div key={t.id} className={"ai-thread-item "+(threadId===t.id?"active":"")}>
            <button type="button" className="ai-thread-open" onClick={()=>void openThread(t.id)}>
              <strong>{t.title||"Untitled Thread"}</strong>
              <span>{[t.inquiry_no,t.destination,t.inquiry_status].filter(Boolean).join(" · ")||"Unlinked"}</span>
              <small>{t.last_active_at?new Date(t.last_active_at).toLocaleString(): ""}</small>
            </button>
            <button type="button" className="ai-thread-archive" title="Archive Thread" onClick={()=>void setThreadArchived(t.id,true)}>×</button>
          </div>)}
        </div>:<p className="ai-lab-context-empty">还没有保存的工作对话。第一次发送消息后会自动建立 Thread。</p>}
        <div className="ai-thread-archived">
          <button type="button" onClick={()=>setShowArchived(v=>!v)}>Archived ({archivedThreads.length}) {showArchived?"▴":"▾"}</button>
          {showArchived&&archivedThreads.length>0&&<div className="ai-thread-list archived">
            {archivedThreads.map(t=><div key={t.id} className="ai-thread-item">
              <button type="button" className="ai-thread-open" onClick={()=>void openThread(t.id)}>
                <strong>{t.title||"Untitled Thread"}</strong>
                <span>{[t.inquiry_no,t.destination,t.inquiry_status].filter(Boolean).join(" · ")||"Unlinked"}</span>
              </button>
              <button type="button" className="ai-thread-archive" title="Restore Thread" onClick={()=>void setThreadArchived(t.id,false)}>↺</button>
            </div>)}
          </div>}
        </div>
      </div>

      <div className="ai-lab-context-head"><span>CURRENT CONTEXT</span><strong>{contextInquiryId?"Current Case":"No case selected"}</strong></div>
      {contextInquiryId?<div className="ai-lab-current-case"><span>INQUIRY</span><strong>{contextTitle||contextInquiryId}</strong><small>{contextInquiryId}</small><a className="btn ai-lab-nav-link" href={"/inquiries/"+contextInquiryId}>Open Inquiry</a><button className="ai-lab-clear" type="button" onClick={clearContext}>Clear Context</button></div>:<p className="ai-lab-context-empty">当你提到一笔 Inquiry 后，它会留在这里。之后你可以直接说「继续这笔」或「下一步」。</p>}
      <div className="ai-lab-safety"><strong>Beta Safety</strong><span>查询 / 导航可以直接做。</span><span>真正修改状态时必须由你确认。</span><span>Company Memory 只有你按 Save as Company Rule 后才会长期保存。</span></div>
    </aside>
  </div>;
}
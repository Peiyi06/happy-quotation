"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

type LinkItem={label:string;href:string;kind:string};
type PendingAction={type:string;inquiryId:string;targetId:string;label:string;confirmText:string;nextStatus:string;payloadJson:string};
type MemorySuggestion={shouldSuggest:boolean;category:string;title:string;ruleText:string;reason:string};
type Attachment={name:string;url?:string;type?:string;size?:number};
type WorkThread={id:string;title:string;linked_inquiry_id?:string|null;context_title?:string;inquiry_no?:string|null;destination?:string|null;inquiry_status?:string|null;last_active_at?:string;archived?:boolean};
type AutoMemorySaved={id?:string;title:string;ruleText:string;duplicate?:boolean};
type Message={role:"user"|"assistant";text:string;links?:LinkItem[];action?:PendingAction;memorySuggestion?:MemorySuggestion;autoMemorySaved?:AutoMemorySaved;attachments?:Attachment[]};

export default function AiLabWorkspace(){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const starterPrompts=[
    t("What needs my attention today?","今天有什么需要我注意？"),
    t("Which Inquiries are still waiting for Supplier Quote?","哪些 Inquiry 还在等 Supplier Quote？"),
    t("Find the most recently updated Inquiries","帮我找最近更新的 Inquiry"),
    t("Which Quotations are still in Draft?","有哪些 Quotation 还在 Draft？")
  ];
  const [messages,setMessages]=useState<Message[]>([]);
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
  const [showSafety,setShowSafety]=useState(false);
  const [showMoreStarters,setShowMoreStarters]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
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
    setMessages([]);
    setSaveState("");
  }

  async function openThread(id:string){
    if(loading||actionLoading) return;
    const res=await fetch("/api/ai-lab/threads?id="+encodeURIComponent(id),{cache:"no-store"});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data?.ok) return;
    const thread=data.thread||{};
    const loaded=(Array.isArray(thread.messages)?thread.messages:[]).map((m:any)=>{
      const payload=m.payload||{};
      return {
        role:m.role==="assistant"?"assistant":"user",
        text:String(m.text||""),
        links:Array.isArray(payload.links)?payload.links:[],
        action:payload.action?.type&&payload.action.type!=="none"?payload.action:undefined,
        memorySuggestion:payload.memorySuggestion?.shouldSuggest?payload.memorySuggestion:undefined,
        autoMemorySaved:payload.autoMemorySaved||undefined,
        attachments:Array.isArray(payload.attachments)?payload.attachments:[]
      } as Message;
    });
    setThreadId(String(thread.id||id));
    setContextInquiryId(String(thread.linked_inquiry_id||""));
    setContextTitle(String(thread.context_title||""));
    setMessages(loaded.length?loaded:[{role:"assistant",text:t("This Thread has no messages yet.","这个 Thread 还没有消息。")}]);
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
    const userMessage:Message={role:"user",text:message||t("Please analyze these images","请分析这些图片"),attachments};
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
        setMessages(prev=>[...prev,{role:"assistant",text:data?.error||t("AI Lab is temporarily unavailable. Please try again later.","AI Lab 暂时无法回应，请稍后再试。")}]);
        await loadThreads();
        return;
      }
      const result=data.result||{};
      if(data.threadId) setThreadId(String(data.threadId));
      setSaveState(data.saved?"saved":"");
      if(result.contextInquiryId){setContextInquiryId(result.contextInquiryId);setContextTitle(result.contextTitle||"Current Inquiry");}
      setMessages(prev=>[...prev,{
        role:"assistant",
        text:result.reply||t("I checked the system data.","我已经检查了系统资料。"),
        links:Array.isArray(result.links)?result.links:[],
        action:result.action?.type&&result.action.type!=="none"?result.action:undefined,
        memorySuggestion:result.memorySuggestion?.shouldSuggest?result.memorySuggestion:undefined,
        autoMemorySaved:result.autoMemorySaved||undefined
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
        setMessages(prev=>[...prev,{role:"assistant",text:data?.error||t("Unable to save Company Rule.","Company Rule 保存失败。")}]);
        return;
      }
      await clearSavedProposal("memorySuggestion");
      setMessages(prev=>prev.map(m=>m.memorySuggestion===suggestion?{...m,memorySuggestion:undefined}:m).concat({role:"assistant",text:t("Saved to Company Memory. I will reference this company rule in relevant future cases.","已保存为 Company Memory。以后遇到相关情况，我会参考这条公司规则。")}));
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
        setMessages(prev=>[...prev,{role:"assistant",text:t("Action was not executed: ","操作没有执行：")+(data?.error||t("Unknown error","未知错误"))}]);
        return;
      }

      if(isWorkflow){
        await clearSavedProposal("action");
        setMessages(prev=>prev.map(m=>m.action===action?{...m,action:undefined}:m).concat({role:"assistant",text:t("Action confirmed. The system status has been updated. You can continue by asking “What’s next?”","已确认执行。系统状态已经更新。你可以继续问我「下一步是什么？」")}));
      }else{
        if(data.contextInquiryId) setContextInquiryId(String(data.contextInquiryId));
        if(data.contextTitle) setContextTitle(String(data.contextTitle));
        const successText=data.type==="create_inquiry"
          ?t("Inquiry created: ","Inquiry 已建立：")+(data.recordNo||data.id)
          :data.type==="update_inquiry"
            ?t("Inquiry updated: ","Inquiry 已更新：")+(data.recordNo||data.id)
            :data.type==="create_itinerary"
              ?t("Itinerary Draft created: ","Itinerary Draft 已建立：")+(data.recordNo||data.id)
              :t("Itinerary updated: ","Itinerary 已更新：")+(data.recordNo||data.id);
        setMessages(prev=>prev.map(m=>m.action===action?{...m,action:undefined}:m).concat({
          role:"assistant",
          text:successText,
          links:data.href?[{label:data.type.includes("itinerary")?t("Open Itinerary","打开行程"):t("Open Inquiry","打开询价"),href:data.href,kind:data.type.includes("itinerary")?"itinerary":"inquiry"}]:[]
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

  return <div className={"ai-lab-shell "+(sidebarCollapsed?"sidebar-collapsed":"")}>
    <section className="ai-lab-main">
      <div className="ai-lab-hero ai-lab-workbench-head">
        <div><span>HAPPY AI LAB · BETA</span><h1>{t("What would you like to work on?","你想处理什么？")}</h1><p>{t("Work with Inquiry, Quotation and Itinerary using AI.","使用 AI 处理 Inquiry、Quotation 与 Itinerary。")}</p></div>
        <span className="ai-lab-mode">{t("READ-MOSTLY · CONFIRM BEFORE WRITE","以读取为主 · 写入前需确认")}</span>
      </div>

      <div className="ai-lab-chat">
        {messages.map((m,index)=><div key={index} className={"ai-lab-message "+m.role}>
          <div className="ai-lab-message-label">{m.role==="user"?t("You","你"):"Happy AI"}</div>
          <div className="ai-lab-bubble">
            {m.attachments&&m.attachments.length>0&&<div className="ai-lab-message-images">{m.attachments.map((a,i)=>a.url?<img key={i} src={a.url} alt={a.name}/>:<span key={i} className="ai-lab-restored-attachment">📎 {a.name}</span>)}</div>}
            <p>{m.text}</p>
            {m.links&&m.links.length>0&&<div className="ai-lab-links">{m.links.map((link,i)=>{
              const href=link.kind==="inquiry"
                ? link.href+(link.href.includes("?")?"&":"?")+"returnTo="+encodeURIComponent("/ai-lab")
                : link.href;
              return <a key={i} href={href}>{link.label}<span>→</span></a>;
            })}</div>}
            {m.autoMemorySaved&&<div className="ai-lab-memory-autosaved">
              <span>{t("✓ COMPANY RULE AUTO-SAVED","✓ COMPANY RULE 已自动保存")}</span>
              <strong>{m.autoMemorySaved.title}</strong>
              <p>{m.autoMemorySaved.ruleText}</p>
              {m.autoMemorySaved.duplicate&&<small>{t("This rule was already saved, so no duplicate was created.","这条规则之前已经保存过，因此没有重复建立。")}</small>}
            </div>}
            {m.memorySuggestion&&<div className="ai-lab-memory-proposal">
              <span>{t("COMPANY MEMORY · SAVE SUGGESTION","COMPANY MEMORY · 建议保存")}</span>
              <strong>{m.memorySuggestion.title}</strong>
              <p>{m.memorySuggestion.ruleText}</p>
              <div>
                <button type="button" className="btn" disabled={memorySaving} onClick={()=>setMessages(prev=>prev.map(x=>x===m?{...x,memorySuggestion:undefined}:x))}>{t("Ignore","忽略")}</button>
                <button type="button" className="btn ai-lab-memory-save" disabled={memorySaving} onClick={()=>void saveCompanyRule(m.memorySuggestion!)}>{memorySaving?t("Saving...","保存中..."):t("Save as Company Rule","保存为 Company Rule")}</button>
              </div>
            </div>}
            {m.action&&<div className="ai-lab-action-card">
              <span>{t("PROPOSED ACTION","待确认操作")}</span>
              <strong>{m.action.confirmText}</strong>
              <div><button type="button" className="btn" disabled={actionLoading} onClick={()=>setMessages(prev=>prev.map(x=>x===m?{...x,action:undefined}:x))}>{t("Cancel","取消")}</button><button type="button" className="workflow-primary-btn ai-lab-action-confirm" disabled={actionLoading} onClick={()=>void confirmAction(m.action!)}>{actionLoading?t("Working...","处理中..."):m.action.label||t("Confirm","确认")}</button></div>
            </div>}
          </div>
        </div>)}
        {loading&&<div className="ai-lab-message assistant"><div className="ai-lab-message-label">Happy AI</div><div className="ai-lab-bubble thinking">{t("Reading system data...","正在读取系统资料...")}</div></div>}
      </div>

      {messages.length===0&&<div className="ai-lab-starter-wrap">
        <div className="ai-lab-starters">
          {starterPrompts.slice(0,showMoreStarters?starterPrompts.length:2).map(p=><button key={p} type="button" onClick={()=>void send(p)}>{p}</button>)}
        </div>
        <button className="ai-lab-more-starters" type="button" onClick={()=>setShowMoreStarters(v=>!v)}>
          {showMoreStarters?t("Fewer suggestions","收起建议"):t("More suggestions","更多建议")}
        </button>
      </div>}

      {imagePreviews.length>0&&<div className="ai-lab-upload-previews">{imagePreviews.map((a,i)=><div key={a.url} className="ai-lab-upload-chip"><img src={a.url} alt={a.name}/><span>{a.name}</span><button className="icon-action-btn icon-action-remove" type="button" aria-label={t("Remove ","移除 ")+a.name} onClick={()=>removeImage(i)}>×</button></div>)}</div>}
      <div className="ai-lab-compose">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e=>addImages(e.target.files)}/>
        <button type="button" className="ai-lab-attach-btn" disabled={loading||imageFiles.length>=4} onClick={()=>fileInputRef.current?.click()}>＋</button>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={t("Ask about an Inquiry, Quotation or Itinerary…","询问 Inquiry、Quotation 或 Itinerary…")} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}}/>
        <button type="button" className="workflow-primary-btn ai-lab-send-primary" disabled={(!input.trim()&&!imageFiles.length)||loading} onClick={()=>void send()}>{loading?t("Thinking...","思考中..."):t("Send","发送")}</button>
      </div>
      <div className="ai-lab-compose-note">{t("Up to 4 images · Enter to send","最多 4 张图片 · Enter 发送")}</div>
    </section>

    <aside className="ai-lab-context">
      {sidebarCollapsed&&<button
        type="button"
        className="ai-lab-sidebar-restore"
        aria-label={t("Expand sidebar","展开侧栏")}
        title={t("Expand sidebar","展开侧栏")}
        onClick={()=>setSidebarCollapsed(false)}
      >‹</button>}

      <div className="ai-thread-panel">
        <div className="ai-thread-panel-head">
          <div>
            <strong>{t("Threads","对话")}</strong>
          </div>
          <div className="ai-thread-panel-actions">
            <button type="button" onClick={newThread}>{t("＋ New","＋ 新建")}</button>
            <button type="button" className="ai-thread-collapse-btn" aria-label={t("Collapse sidebar","收起侧栏")} title={t("Collapse sidebar","收起侧栏")} onClick={()=>setSidebarCollapsed(true)}>›</button>
          </div>
        </div>

        <div className={"ai-thread-save-state "+(saveState==="saving"?"is-saving":"")}>
          <i aria-hidden="true"/>
          <span>{saveState==="saving"?t("Saving...","保存中..."):t("Saved","已保存")}</span>
        </div>

        <div className="ai-thread-view-switch ios-segmented-control" aria-label={t("Thread view","对话视图")}>
          <button type="button" className={!showArchived?"active":""} onClick={()=>setShowArchived(false)}>
            {t("Active","进行中")} <span>{threads.length}</span>
          </button>
          <button type="button" className={showArchived?"active":""} onClick={()=>setShowArchived(true)}>
            {t("Archived","已归档")} <span>{archivedThreads.length}</span>
          </button>
        </div>

        {threadsLoading
          ? <p className="ai-lab-context-empty">{t("Loading threads...","加载对话中...")}</p>
          : !showArchived
            ? threads.length>0
              ? <div className="ai-thread-list">
                  {threads.map(thread=><div key={thread.id} className={"ai-thread-item "+(threadId===thread.id?"active":"")}>
                    <button type="button" className="ai-thread-open" onClick={()=>void openThread(thread.id)}>
                      <span className="ai-thread-title">{thread.title||(language==="zh"?"未命名对话":"Untitled Thread")}</span>
                      {(thread.destination||thread.inquiry_status)&&<span className="ai-thread-meta">
  {[thread.destination,thread.inquiry_status].filter(Boolean).join(" · ")}
</span>}
                      <span className="ai-thread-time">{thread.last_active_at?new Date(thread.last_active_at).toLocaleString(): ""}</span>
                    </button>
                    <button type="button" className="ai-thread-archive" aria-label={t("Archive thread","归档对话")} title={t("Archive Thread","归档对话")} onClick={()=>void setThreadArchived(thread.id,true)}>
                      <span aria-hidden="true">⌄</span>
                    </button>
                  </div>)}
                </div>
              : <p className="ai-lab-context-empty">{t("No saved work conversations yet. A Thread will be created automatically after the first message.","还没有保存的工作对话。第一次发送消息后会自动建立 Thread。")}</p>
            : archivedThreads.length>0
              ? <div className="ai-thread-list archived">
                  {archivedThreads.map(thread=><div key={thread.id} className="ai-thread-item archived-item">
                    <button type="button" className="ai-thread-open" onClick={()=>void openThread(thread.id)}>
                      <span className="ai-thread-title">{thread.title||(language==="zh"?"未命名对话":"Untitled Thread")}</span>
                      {(thread.destination||thread.inquiry_status)&&<span className="ai-thread-meta">
  {[thread.destination,thread.inquiry_status].filter(Boolean).join(" · ")}
</span>}
                      <span className="ai-thread-time">{thread.last_active_at?new Date(thread.last_active_at).toLocaleString(): ""}</span>
                    </button>
                    <button type="button" className="ai-thread-archive restore" aria-label={t("Restore thread","恢复对话")} title={t("Restore Thread","恢复对话")} onClick={()=>void setThreadArchived(thread.id,false)}>
                      <span aria-hidden="true">↺</span>
                    </button>
                  </div>)}
                </div>
              : <p className="ai-lab-context-empty">{t("No archived threads.","没有已归档的对话。")}</p>}
      </div>

      <div className="ai-lab-context-section">
        <div className="ai-lab-context-head">
          <span>{t("CURRENT CONTEXT","当前上下文")}</span>
          <strong>{contextInquiryId?t("Current Case","当前案件"):t("No case selected","未选择案件")}</strong>
        </div>
        {contextInquiryId
          ? <div className="ai-lab-current-case">
              <span>{t("INQUIRY","询价")}</span>
              <strong>{contextTitle||contextInquiryId}</strong>
              <small>{contextInquiryId}</small>
              <a className="btn ai-lab-nav-link" href={"/inquiries/"+contextInquiryId+"?returnTo="+encodeURIComponent("/ai-lab")}>{t("Open Inquiry","打开询价")}</a>
              <button className="ai-lab-clear" type="button" onClick={clearContext}>{t("Clear Context","清除上下文")}</button>
            </div>
          : <p className="ai-lab-context-empty">{t("Mention an Inquiry to keep it as the active context.","提到一笔 Inquiry 后，它会作为当前上下文保留。")}</p>}
      </div>

      <div className={"ai-lab-safety "+(showSafety?"open":"")}>
        <button type="button" className="ai-lab-safety-toggle" onClick={()=>setShowSafety(v=>!v)}>
          <span><i aria-hidden="true"/> {t("Safety","安全")}</span>
          <b>{showSafety?"⌃":"›"}</b>
        </button>
        {showSafety&&<div className="ai-lab-safety-body">
          <span>{t("Queries and navigation can be done directly.","查询 / 导航可以直接做。")}</span>
          <span>{t("Any actual status change requires your confirmation.","真正修改状态时必须由你确认。")}</span>
          <span>{t("Long-term non-Quotation rules may be auto-saved with a notice; Quotation rules still require manual confirmation.","非 Quotation 长期规则会自动保存并提示；Quotation 规则仍需你手动确认。")}</span>
        </div>}
      </div>
    </aside>
  </div>;
}
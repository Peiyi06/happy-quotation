"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LinkItem={label:string;href:string;kind:string};
type PendingAction={type:string;inquiryId:string;label:string;confirmText:string;nextStatus:string};
type Message={role:"user"|"assistant";text:string;links?:LinkItem[];action?:PendingAction};

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
  const [contextInquiryId,setContextInquiryId]=useState("");
  const [contextTitle,setContextTitle]=useState("");

  const history=useMemo(()=>messages.slice(-8).map(m=>({role:m.role,text:m.text})),[messages]);

  async function send(text?:string){
    const message=(text??input).trim();
    if(!message||loading) return;
    const userMessage:Message={role:"user",text:message};
    setMessages(prev=>[...prev,userMessage]);
    setInput("");
    setLoading(true);
    try{
      const res=await fetch("/api/ai-lab/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message,history,contextInquiryId})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setMessages(prev=>[...prev,{role:"assistant",text:data?.error||"AI Lab 暂时无法回应，请稍后再试。"}]);
        return;
      }
      const result=data.result||{};
      if(result.contextInquiryId){setContextInquiryId(result.contextInquiryId);setContextTitle(result.contextTitle||"Current Inquiry");}
      setMessages(prev=>[...prev,{
        role:"assistant",
        text:result.reply||"我已经检查了系统资料。",
        links:Array.isArray(result.links)?result.links:[],
        action:result.action?.type&&result.action.type!=="none"?result.action:undefined
      }]);
    }finally{setLoading(false);}
  }

  async function confirmAction(action:PendingAction){
    if(actionLoading||action.type!=="update_supplier_status") return;
    setActionLoading(true);
    try{
      const res=await fetch("/api/internal-inquiry-workflow",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:action.inquiryId,supplierStatus:action.nextStatus})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){
        setMessages(prev=>[...prev,{role:"assistant",text:"操作没有执行："+(data?.error||"Unknown error")}]);
        return;
      }
      setMessages(prev=>prev.map(m=>m.action===action?{...m,action:undefined}:m).concat({role:"assistant",text:"已确认执行。系统状态已经更新。你可以继续问我「下一步是什么？」"}));
      router.refresh();
    }finally{setActionLoading(false);}
  }

  function clearContext(){
    setContextInquiryId("");
    setContextTitle("");
    setMessages([{role:"assistant",text:"Current Case 已清除。你可以重新告诉我想找哪一笔 Inquiry。"}]);
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
          <div className="ai-lab-bubble"><p>{m.text}</p>
            {m.links&&m.links.length>0&&<div className="ai-lab-links">{m.links.map((link,i)=><button key={i} type="button" onClick={()=>router.push(link.href)}>{link.label}<span>→</span></button>)}</div>}
            {m.action&&<div className="ai-lab-action-card">
              <span>PROPOSED ACTION｜待确认操作</span>
              <strong>{m.action.confirmText}</strong>
              <div><button type="button" className="btn" disabled={actionLoading} onClick={()=>setMessages(prev=>prev.map(x=>x===m?{...x,action:undefined}:x))}>Cancel</button><button type="button" className="workflow-primary-btn" disabled={actionLoading} onClick={()=>void confirmAction(m.action!)}>{actionLoading?"Updating...":m.action.label||"Confirm"}</button></div>
            </div>}
          </div>
        </div>)}
        {loading&&<div className="ai-lab-message assistant"><div className="ai-lab-message-label">Happy AI</div><div className="ai-lab-bubble thinking">正在读取系统资料...</div></div>}
      </div>

      {messages.length<=1&&<div className="ai-lab-starters">{starterPrompts.map(p=><button key={p} type="button" onClick={()=>void send(p)}>{p}</button>)}</div>}

      <div className="ai-lab-compose">
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="例如：帮我看一下北海道那笔 Inquiry 现在做到哪里了…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}}/>
        <button type="button" className="workflow-primary-btn" disabled={!input.trim()||loading} onClick={()=>void send()}>{loading?"Thinking...":"Send"}</button>
      </div>
      <div className="ai-lab-compose-note">Enter 发送 · Shift + Enter 换行 · AI 不会未经确认修改系统资料</div>
    </section>

    <aside className="ai-lab-context">
      <div className="ai-lab-context-head"><span>CURRENT CONTEXT</span><strong>{contextInquiryId?"Current Case":"No case selected"}</strong></div>
      {contextInquiryId?<div className="ai-lab-current-case"><span>INQUIRY</span><strong>{contextTitle||contextInquiryId}</strong><small>{contextInquiryId}</small><button className="btn" type="button" onClick={()=>router.push("/inquiries/"+contextInquiryId)}>Open Inquiry</button><button className="ai-lab-clear" type="button" onClick={clearContext}>Clear Context</button></div>:<p className="ai-lab-context-empty">当你提到一笔 Inquiry 后，它会留在这里。之后你可以直接说「继续这笔」或「下一步」。</p>}
      <div className="ai-lab-safety"><strong>Beta Safety</strong><span>查询 / 导航可以直接做。</span><span>真正修改状态时必须由你确认。</span><span>Quotation / Itinerary 建立目前先带你进入原本页面。</span></div>
    </aside>
  </div>;
}
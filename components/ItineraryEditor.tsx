"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DayItem={id:string;title:string;content:string};
type Props={
  itineraryId?:string;
  initialItinerary?:any;
  currentStaffId:string;
  currentStaffName:string;
};

const uid=()=>Math.random().toString(36).slice(2,10);

export default function ItineraryEditor({itineraryId,initialItinerary,currentStaffId,currentStaffName}:Props){
  const router=useRouter();
  const data=initialItinerary?.itinerary_data||{};
  const initialDays:Array<DayItem>=Array.isArray(data.days)&&data.days.length
    ? data.days
    : [{id:uid(),title:"",content:""}];

  const [title,setTitle]=useState(initialItinerary?.title||"New Itinerary");
  const [destination,setDestination]=useState(initialItinerary?.destination||"");
  const [daysCount,setDaysCount]=useState(Number(initialItinerary?.days_count)||initialDays.length||1);
  const [nightsCount,setNightsCount]=useState(Number(initialItinerary?.nights_count)||0);
  const [customerName,setCustomerName]=useState(initialItinerary?.customer_name||"");
  const [status,setStatus]=useState(initialItinerary?.status||"draft");
  const [days,setDays]=useState<DayItem[]>(initialDays);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  const op=initialItinerary?.owner_name||data.op||currentStaffName;
  const label=useMemo(()=>`${daysCount}D${nightsCount}N`,[daysCount,nightsCount]);

  function syncDays(){
    const target=Math.max(1,Number(daysCount)||1);
    setDays(current=>{
      if(current.length===target) return current;
      if(current.length>target) return current.slice(0,target);
      const next=[...current];
      while(next.length<target) next.push({id:uid(),title:"",content:""});
      return next;
    });
  }

  function patchDay(id:string,patch:Partial<DayItem>){
    setDays(items=>items.map(x=>x.id===id?{...x,...patch}:x));
  }

  function moveDay(index:number,dir:-1|1){
    setDays(items=>{
      const target=index+dir;
      if(target<0||target>=items.length) return items;
      const next=[...items];
      [next[index],next[target]]=[next[target],next[index]];
      return next;
    });
  }

  function duplicateDay(index:number){
    setDays(items=>{
      const src=items[index];
      const next=[...items];
      next.splice(index+1,0,{...src,id:uid()});
      setDaysCount(next.length);
      return next;
    });
  }

  function removeDay(index:number){
    setDays(items=>{
      if(items.length<=1) return items;
      const next=items.filter((_,i)=>i!==index);
      setDaysCount(next.length);
      return next;
    });
  }

  function addDay(){
    setDays(items=>{
      const next=[...items,{id:uid(),title:"",content:""}];
      setDaysCount(next.length);
      return next;
    });
  }

  async function save(){
    setSaving(true); setMessage("");
    try{
      const payload={
        title,destination,days_count:Math.max(1,Number(daysCount)||1),nights_count:Math.max(0,Number(nightsCount)||0),
        customer_name:customerName,status,
        itinerary_data:{days,op,opStaffId:initialItinerary?.owner_id||currentStaffId}
      };
      const res=await fetch("/api/internal-itineraries",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:itineraryId||null,payload})
      });
      const result=await res.json().catch(()=>({}));
      if(!res.ok||!result?.ok){setMessage(result?.error||"Unable to save itinerary.");return;}
      if(!itineraryId&&result.id){router.replace("/itineraries/"+result.id+"/edit");}
      else router.refresh();
      setMessage("Saved");
    } finally {setSaving(false);}
  }

  return <div className="itinerary-editor">
    <div className="page-head">
      <div>
        <span className="page-kicker">ITINERARY TEMPLATE</span>
        <h1>{itineraryId?"Edit Itinerary":"New Itinerary"}</h1>
        <p>独立建立简易行程，暂时不与 Quotation 绑定。</p>
      </div>
      <div className="detail-actions">
        <button className="btn" onClick={()=>router.push("/itineraries")}>← Back</button>
        <button className="btn primary" onClick={save} disabled={saving}>{saving?"Saving...":"Save Itinerary"}</button>
      </div>
    </div>

    <section className="panel">
      <div className="panel-head"><h2>基本资料</h2><span className="itinerary-code-preview">{label}</span></div>
      <div className="itinerary-meta-grid">
        <label className="field"><span>Itinerary Title</span><input value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label className="field"><span>Destination</span><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Japan / China / Thailand"/></label>
        <label className="field"><span>Days</span><input type="number" min="1" value={daysCount} onChange={e=>setDaysCount(Math.max(1,Number(e.target.value)||1))}/></label>
        <label className="field"><span>Nights</span><input type="number" min="0" value={nightsCount} onChange={e=>setNightsCount(Math.max(0,Number(e.target.value)||0))}/></label>
        <label className="field"><span>Customer / Company</span><input value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label>
        <label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="draft">Draft</option><option value="ready">Ready</option><option value="confirmed">Confirmed</option><option value="archived">Archived</option></select></label>
        <label className="field"><span>OP</span><input value={op} readOnly className="system-fixed-input"/></label>
        <div className="field"><span>Day Cards</span><button type="button" className="btn itinerary-sync-btn" onClick={syncDays}>Sync to {daysCount} Days</button></div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head"><div><h2>行程内容</h2><p className="panel-subtext">每天填写标题与简单行程内容。</p></div><button className="btn" type="button" onClick={addDay}>+ Add Day</button></div>
      <div className="itinerary-day-list">
        {days.map((day,index)=><article className="itinerary-day-card" key={day.id}>
          <div className="itinerary-day-head">
            <div><span>DAY {String(index+1).padStart(2,"0")}</span><strong>第 {index+1} 天</strong></div>
            <div className="itinerary-day-actions">
              <button type="button" onClick={()=>moveDay(index,-1)} disabled={index===0}>↑</button>
              <button type="button" onClick={()=>moveDay(index,1)} disabled={index===days.length-1}>↓</button>
              <button type="button" onClick={()=>duplicateDay(index)}>Duplicate</button>
              <button type="button" className="danger-link" onClick={()=>removeDay(index)} disabled={days.length<=1}>Delete</button>
            </div>
          </div>
          <label className="field"><span>Day Title</span><input value={day.title} onChange={e=>patchDay(day.id,{title:e.target.value})} placeholder="Kuala Lumpur → Osaka"/></label>
          <label className="field"><span>Itinerary Content</span><textarea value={day.content} onChange={e=>patchDay(day.id,{content:e.target.value})} placeholder="输入当天简单行程内容..."/></label>
        </article>)}
      </div>
    </section>
    {message&&<div className="save-message">{message}</div>}
  </div>;
}

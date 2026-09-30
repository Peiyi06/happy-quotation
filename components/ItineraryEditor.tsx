"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MealInfo={breakfast:string;lunch:string;dinner:string};
type AttractionItem={id:string;name:string;imageUrl:string};
type DayItem={
  id:string;
  title:string;
  content:string;
  hotel:string;
  meals:MealInfo;
  attractions:AttractionItem[];
};

type Props={
  itineraryId?:string;
  initialItinerary?:any;
  currentStaffId:string;
  currentStaffName:string;
};

const uid=()=>Math.random().toString(36).slice(2,10);
const emptyDay=():DayItem=>({
  id:uid(),
  title:"",
  content:"",
  hotel:"",
  meals:{breakfast:"",lunch:"",dinner:""},
  attractions:[]
});

const normalizeDay=(raw:any):DayItem=>({
  id:raw?.id||uid(),
  title:raw?.title||"",
  content:raw?.content||"",
  hotel:raw?.hotel||"",
  meals:{
    breakfast:raw?.meals?.breakfast||"",
    lunch:raw?.meals?.lunch||"",
    dinner:raw?.meals?.dinner||""
  },
  attractions:Array.isArray(raw?.attractions)
    ? raw.attractions.map((a:any)=>({id:a?.id||uid(),name:a?.name||"",imageUrl:a?.imageUrl||""}))
    : []
});

export default function ItineraryEditor({itineraryId,initialItinerary,currentStaffId,currentStaffName}:Props){
  const router=useRouter();
  const data=initialItinerary?.itinerary_data||{};
  const initialDays:Array<DayItem>=Array.isArray(data.days)&&data.days.length
    ? data.days.map(normalizeDay)
    : [emptyDay()];

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
      while(next.length<target) next.push(emptyDay());
      return next;
    });
  }

  function patchDay(id:string,patch:Partial<DayItem>){
    setDays(items=>items.map(x=>x.id===id?{...x,...patch}:x));
  }

  function patchMeal(dayId:string,key:keyof MealInfo,value:string){
    setDays(items=>items.map(day=>day.id===dayId?{
      ...day,
      meals:{...day.meals,[key]:value}
    }:day));
  }

  function addAttraction(dayId:string){
    setDays(items=>items.map(day=>day.id===dayId?{
      ...day,
      attractions:[...day.attractions,{id:uid(),name:"",imageUrl:""}]
    }:day));
  }

  function patchAttraction(dayId:string,attractionId:string,patch:Partial<AttractionItem>){
    setDays(items=>items.map(day=>day.id===dayId?{
      ...day,
      attractions:day.attractions.map(a=>a.id===attractionId?{...a,...patch}:a)
    }:day));
  }

  function removeAttraction(dayId:string,attractionId:string){
    setDays(items=>items.map(day=>day.id===dayId?{
      ...day,
      attractions:day.attractions.filter(a=>a.id!==attractionId)
    }:day));
  }

  function moveAttraction(dayId:string,index:number,dir:-1|1){
    setDays(items=>items.map(day=>{
      if(day.id!==dayId) return day;
      const target=index+dir;
      if(target<0||target>=day.attractions.length) return day;
      const next=[...day.attractions];
      [next[index],next[target]]=[next[target],next[index]];
      return {...day,attractions:next};
    }));
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
      const copy:DayItem={
        ...src,
        id:uid(),
        meals:{...src.meals},
        attractions:src.attractions.map(a=>({...a,id:uid()}))
      };
      const next=[...items];
      next.splice(index+1,0,copy);
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
      const next=[...items,emptyDay()];
      setDaysCount(next.length);
      return next;
    });
  }

  async function save(){
    setSaving(true); setMessage("");
    try{
      const payload={
        title,destination,
        days_count:Math.max(1,Number(daysCount)||1),
        nights_count:Math.max(0,Number(nightsCount)||0),
        customer_name:customerName,
        status,
        itinerary_data:{days,op,opStaffId:initialItinerary?.owner_id||currentStaffId}
      };
      const res=await fetch("/api/internal-itineraries",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
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
      <div className="panel-head">
        <div><h2>Daily Itinerary｜每日行程</h2><p className="panel-subtext">填写路线、行程内容、酒店、餐食及当天景点。</p></div>
        <button className="btn" type="button" onClick={addDay}>+ Add Day</button>
      </div>

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

          <div className="itinerary-day-main-grid">
            <label className="field itinerary-route-field">
              <span>Route / Title｜路线标题</span>
              <input value={day.title} onChange={e=>patchDay(day.id,{title:e.target.value})} placeholder="新加坡 → 重庆"/>
            </label>
            <label className="field">
              <span>Hotel｜酒店</span>
              <input value={day.hotel} onChange={e=>patchDay(day.id,{hotel:e.target.value})} placeholder="重庆伊美 4 星酒店"/>
            </label>
          </div>

          <label className="field">
            <span>Itinerary Content｜行程内容</span>
            <textarea value={day.content} onChange={e=>patchDay(day.id,{content:e.target.value})} placeholder="输入当天行程内容，例如集合、交通、景点、入住安排..."/>
          </label>

          <div className="itinerary-meal-section">
            <div className="itinerary-subhead"><strong>Meals｜餐食</strong></div>
            <div className="itinerary-meal-grid">
              <label className="field"><span>Breakfast｜早餐</span><input value={day.meals.breakfast} onChange={e=>patchMeal(day.id,"breakfast",e.target.value)} placeholder="Hotel Breakfast / -"/></label>
              <label className="field"><span>Lunch｜午餐</span><input value={day.meals.lunch} onChange={e=>patchMeal(day.id,"lunch",e.target.value)} placeholder="Lunch / Meal On Board / -"/></label>
              <label className="field"><span>Dinner｜晚餐</span><input value={day.meals.dinner} onChange={e=>patchMeal(day.id,"dinner",e.target.value)} placeholder="Dinner / Hotpot / -"/></label>
            </div>
          </div>

          <div className="itinerary-attraction-section">
            <div className="itinerary-subhead">
              <div><strong>Attractions｜景点</strong><span>每个景点可以独立填写名称及图片。</span></div>
              <button type="button" className="btn" onClick={()=>addAttraction(day.id)}>+ Add Attraction</button>
            </div>

            {day.attractions.length>0 && <div className="itinerary-attraction-list">
              {day.attractions.map((attraction,aIndex)=><div className="itinerary-attraction-row" key={attraction.id}>
                <div className="itinerary-attraction-index">{String(aIndex+1).padStart(2,"0")}</div>
                <label className="field">
                  <span>Attraction Name｜景点名称</span>
                  <input value={attraction.name} onChange={e=>patchAttraction(day.id,attraction.id,{name:e.target.value})} placeholder="仙女山风景区"/>
                </label>
                <label className="field">
                  <span>Image URL｜景点图片</span>
                  <input value={attraction.imageUrl} onChange={e=>patchAttraction(day.id,attraction.id,{imageUrl:e.target.value})} placeholder="第一阶段：粘贴图片链接"/>
                </label>
                {attraction.imageUrl && <div className="itinerary-attraction-preview"><img src={attraction.imageUrl} alt={attraction.name||"Attraction"}/></div>}
                <div className="itinerary-attraction-actions">
                  <button type="button" onClick={()=>moveAttraction(day.id,aIndex,-1)} disabled={aIndex===0}>↑</button>
                  <button type="button" onClick={()=>moveAttraction(day.id,aIndex,1)} disabled={aIndex===day.attractions.length-1}>↓</button>
                  <button type="button" className="danger-link" onClick={()=>removeAttraction(day.id,attraction.id)}>Delete</button>
                </div>
              </div>)}
            </div>}

            {!day.attractions.length && <div className="itinerary-attraction-empty">当天尚未加入景点。</div>}
          </div>
        </article>)}
      </div>
    </section>

    {message&&<div className="save-message">{message}</div>}
  </div>;
}

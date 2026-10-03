"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

const has=(obj:any,key:string)=>Object.prototype.hasOwnProperty.call(obj||{},key);
type InquiryFlight={id:string;from:string;to:string;flightNo:string;date:string;departureTime:string;arrivalTime:string;remarks:string};
const flightUid=()=>Math.random().toString(36).slice(2,10);
const emptyFlight=():InquiryFlight=>({id:flightUid(),from:"",to:"",flightNo:"",date:"",departureTime:"",arrivalTime:"",remarks:""});

function FlightSummary({flights,t}:{flights:InquiryFlight[];t:(en:string,zh:string)=>string}){
  if(!flights.length) return <div className="operation-inline-empty">{t("No suggested flights.","没有推荐航班。")}</div>;
  return <div className="operation-flight-summary-list">
    {flights.map((f,index)=><div className="operation-flight-summary" key={f.id||index}>
      <b>{f.from||"—"} → {f.to||"—"}</b>
      <span>{f.flightNo||"—"}</span>
      <span>{f.date||"—"}</span>
      <span>{f.departureTime||"—"} → {f.arrivalTime||"—"}</span>
      {f.remarks&&<em>{f.remarks}</em>}
    </div>)}
  </div>;
}

export default function OperationReviewEditor({
  inquiry,
  canEdit,
  returnTo="/inquiries"
}:{inquiry:any;canEdit:boolean;returnTo?:string}){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const returnParam=encodeURIComponent(returnTo);
  const inquiryHref="/inquiries/"+inquiry.id+"?returnTo="+returnParam;
  const supplierFormHref="/inquiries/"+inquiry.id+"/supplier-form?returnTo="+returnParam;
  const initial=inquiry.operation_review||{};
  const initialSupplier=inquiry.supplier_inquiry||{};
  const salesComposition=inquiry?.inquiry_data?.travellerComposition||{};
  const salesSuggestedFlights:InquiryFlight[]=Array.isArray(inquiry?.inquiry_data?.suggestedFlights)?inquiry.inquiry_data.suggestedFlights:[];

  const [showFullSales,setShowFullSales]=useState(false);
  const [destination,setDestination]=useState(has(initial,"destination")?initial.destination:(inquiry.destination||""));
  const [departureCity,setDepartureCity]=useState(has(initial,"departureCity")?initial.departureCity:(inquiry.departure_city||""));
  const [startDate,setStartDate]=useState(has(initial,"travelStartDate")?initial.travelStartDate:(inquiry.travel_start_date||""));
  const [endDate,setEndDate]=useState(has(initial,"travelEndDate")?initial.travelEndDate:(inquiry.travel_end_date||""));
  const [days,setDays]=useState(Number(has(initial,"daysCount")?initial.daysCount:inquiry.days_count)||1);
  const [nights,setNights]=useState(Number(has(initial,"nightsCount")?initial.nightsCount:inquiry.nights_count)||0);
  const [pax,setPax]=useState<number|"">(has(initial,"pax")?initial.pax:(inquiry.pax??""));
  const [budget,setBudget]=useState(has(initial,"budget")?initial.budget:(inquiry.budget||""));
  const [tourType,setTourType]=useState(has(initial,"tourType")?initial.tourType:(inquiry.tour_type||""));
  const [flight,setFlight]=useState(has(initial,"flightRequirement")?initial.flightRequirement:(inquiry.flight_requirement||""));
  const [hotel,setHotel]=useState(has(initial,"hotelRequirement")?initial.hotelRequirement:(inquiry.hotel_requirement||""));
  const [meals,setMeals]=useState(has(initial,"mealRequirement")?initial.mealRequirement:(inquiry.meal_requirement||""));
  const [special,setSpecial]=useState(has(initial,"specialRequest")?initial.specialRequest:(inquiry.special_request||""));
  const [transport,setTransport]=useState(initial.transportRequirement||"");
  const [itineraryReq,setItineraryReq]=useState(initial.itineraryRequirement||"");
  const [operationNotes,setOperationNotes]=useState(initial.operationNotes||"");

  const [overrideFlights,setOverrideFlights]=useState(Boolean(initial.overrideSuggestedFlights));
  const [editingFlights,setEditingFlights]=useState(false);
  const [operationFlights,setOperationFlights]=useState<InquiryFlight[]>(
    Array.isArray(initial.suggestedFlights)&&initial.suggestedFlights.length?initial.suggestedFlights:salesSuggestedFlights
  );

  const [quoteDeadline,setQuoteDeadline]=useState(initialSupplier.quoteDeadline||"");
  const [supplierRemarks,setSupplierRemarks]=useState(initialSupplier.remarks||"");
  const [showBudget,setShowBudget]=useState(Boolean(initialSupplier.showBudget));
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  function startEditingFlights(){
    if(!overrideFlights){
      setOverrideFlights(true);
      setOperationFlights(salesSuggestedFlights.length?salesSuggestedFlights.map(f=>({...f,id:f.id||flightUid()})):[emptyFlight()]);
    }else if(operationFlights.length===0){
      setOperationFlights([emptyFlight()]);
    }
    setEditingFlights(true);
  }

  function useSalesFlights(){
    setOverrideFlights(false);
    setEditingFlights(false);
  }

  async function save(){
    setSaving(true);setMessage("");
    try{
      const review={
        destination,departureCity,travelStartDate:startDate,travelEndDate:endDate,
        daysCount:days,nightsCount:nights,pax,budget,tourType,
        flightRequirement:flight,hotelRequirement:hotel,mealRequirement:meals,
        specialRequest:special,transportRequirement:transport,
        itineraryRequirement:itineraryReq,operationNotes,
        overrideSuggestedFlights:overrideFlights,
        suggestedFlights:overrideFlights?operationFlights:salesSuggestedFlights,
        overrideTravellerComposition:false,
        travellerComposition:salesComposition
      };
      const supplier={quoteDeadline,remarks:supplierRemarks,showBudget};
      const res=await fetch("/api/internal-operation-review",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          id:inquiry.id,
          review,
          supplier,
          supplierStatus:inquiry.supplier_inquiry_status||"draft"
        })
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setMessage(data?.error||t("Unable to save.","无法保存。"));return;}
      setMessage(t("Saved","已保存"));
      router.refresh();
    }finally{setSaving(false);}
  }

  const activeFlights=overrideFlights?operationFlights:salesSuggestedFlights;

  return <div className="operation-review-editor operation-review-simplified">
    <section className="panel operation-customer-brief">
      <div className="panel-head">
        <div>
          <h2>{t("Customer Brief","客户需求摘要")}</h2>
          <p className="panel-subtext">{t("Review the original customer requirements from Sales. Operation changes do not overwrite the Sales version.","快速确认 Sales 收到的原始客户需求；Operation 修改不会覆盖 Sales 原始资料。")}</p>
        </div>
        <button className="btn operation-secondary-btn" type="button" onClick={()=>setShowFullSales(v=>!v)}>
          {showFullSales?t("Hide Full Details","收起完整资料"):t("View Full Sales Details","查看完整 Sales 资料")}
        </button>
      </div>

      <div className="operation-brief-grid">
        <div><span>{t("Customer","客户")}</span><strong>{inquiry.customer_name||"—"}</strong></div>
        <div><span>{t("Destination","目的地")}</span><strong>{inquiry.destination||"—"}</strong></div>
        <div><span>{t("Travel Date","出发日期")}</span><strong>{inquiry.travel_start_date||"—"}{inquiry.travel_end_date?" → "+inquiry.travel_end_date:""}</strong></div>
        <div><span>{t("Duration","行程天数")}</span><strong>{inquiry.days_count}D{inquiry.nights_count}N</strong></div>
        <div><span>{t("Pax","人数")}</span><strong>{inquiry.pax||"—"}</strong></div>
        <div><span>{t("Budget","预算")}</span><strong>{inquiry.budget||"—"}</strong></div>
        <div><span>{t("Tour Type","团型")}</span><strong>{inquiry.tour_type||"—"}</strong></div>
        <div><span>{t("Sales Owner","销售负责人")}</span><strong>{inquiry.sales_owner_name||"—"}</strong></div>
      </div>

      <div className="operation-brief-requirements">
        <div><span>{t("Flight","航班")}</span><p>{inquiry.flight_requirement||"—"}</p></div>
        <div><span>{t("Hotel","酒店")}</span><p>{inquiry.hotel_requirement||"—"}</p></div>
        <div><span>{t("Meal","餐食")}</span><p>{inquiry.meal_requirement||"—"}</p></div>
        <div><span>{t("Special Request","特别要求")}</span><p>{inquiry.special_request||"—"}</p></div>
      </div>

      {showFullSales&&<div className="operation-full-sales">
        <div className="operation-subsection-head">
          <div><h3>{t("Traveller Details","旅客资料")}</h3><p>{t("Read-only · Uses original Sales data","只读 · 使用 Sales 原始资料")}</p></div>
        </div>
        <div className="traveller-summary-grid">
          <div><span>{t("Adult","成人")}</span><strong>{salesComposition.adultCount??"—"}</strong></div>
          <div><span>{t("Senior","长者")}</span><strong>{salesComposition.seniorCount??"—"}</strong></div>
          <div><span>{t("Child","儿童")}</span><strong>{salesComposition.childCount??"—"}</strong></div>
        </div>
        {(salesComposition.seniorNotes||salesComposition.childAges||salesComposition.childNotes||salesComposition.mobilityNotes)&&
          <div className="inquiry-detail-grid composition-detail-grid">
            <div><span>{t("Senior Notes","长者备注")}</span><p>{salesComposition.seniorNotes||"—"}</p></div>
            <div><span>{t("Child Ages","儿童年龄")}</span><p>{salesComposition.childAges||"—"}</p></div>
            <div><span>{t("Child Notes","儿童备注")}</span><p>{salesComposition.childNotes||"—"}</p></div>
            <div><span>{t("Mobility / Care","行动 / 照护需求")}</span><p>{salesComposition.mobilityNotes||"—"}</p></div>
          </div>}
        <div className="operation-subsection-head operation-sales-flights-head">
          <div><h3>{t("Sales Suggested Flights","Sales 推荐航班")}</h3><p>{t("Read-only · Original Sales recommendation","只读 · Sales 原始推荐")}</p></div>
        </div>
        <FlightSummary flights={salesSuggestedFlights} t={t}/>
      </div>}
    </section>

    <section className="panel operation-plan-panel">
      <div className="panel-head">
        <div>
          <h2>{t("Operation Plan","操作确认")}</h2>
          <p className="panel-subtext">{t("Prepare the version that will actually be used for supplier execution.","整理真正需要给 Supplier 执行的版本。")}</p>
        </div>
      </div>

      <div className="operation-subsection ios-form-subsection operation-trip-ios">
        <div className="operation-subsection-head"><div><h3>{t("Trip Details","行程资料")}</h3><p>{t("Core trip information","行程基础资料")}</p></div></div>
        <div className="itinerary-meta-grid">
          <label className="field"><span>{t("Departure City","出发城市")}</span><input disabled={!canEdit} value={departureCity} onChange={e=>setDepartureCity(e.target.value)}/></label>
          <label className="field"><span>{t("Destination","目的地")}</span><input disabled={!canEdit} value={destination} onChange={e=>setDestination(e.target.value)}/></label>
          <label className="field"><span>{t("Travel Start Date","出发日期")}</span><input disabled={!canEdit} type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
          <label className="field"><span>{t("Travel End Date","返程日期")}</span><input disabled={!canEdit} type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
          <label className="field"><span>{t("Days","天")}</span><input disabled={!canEdit} type="number" min="1" value={days} onChange={e=>setDays(Math.max(1,Number(e.target.value)||1))}/></label>
          <label className="field"><span>{t("Nights","晚")}</span><input disabled={!canEdit} type="number" min="0" value={nights} onChange={e=>setNights(Math.max(0,Number(e.target.value)||0))}/></label>
          <label className="field"><span>{t("Pax","人数")}</span><input disabled={!canEdit} type="number" min="1" value={pax} onChange={e=>setPax(e.target.value===""?"":Math.max(1,Number(e.target.value)||1))}/></label>
          <label className="field"><span>{t("Tour Type","团型")}</span><input disabled={!canEdit} value={tourType} onChange={e=>setTourType(e.target.value)}/></label>
          <label className="field"><span>{t("Budget","预算")}</span><input disabled={!canEdit} value={budget} onChange={e=>setBudget(e.target.value)}/></label>
        </div>
      </div>

      <div className="operation-subsection operation-traveller-readonly">
        <div className="operation-subsection-head">
          <div><h3>{t("Traveller Details","旅客资料")}</h3><p>{t("Uses original Sales data; no need for Operation to edit again.","沿用 Sales 原始资料，Operation 不需要再次编辑。")}</p></div>
        </div>
        <div className="operation-traveller-line">
          <span>Adult <b>{salesComposition.adultCount??"—"}</b></span>
          <span>Senior <b>{salesComposition.seniorCount??"—"}</b></span>
          <span>Child <b>{salesComposition.childCount??"—"}</b></span>
        </div>
      </div>

      <div className="operation-subsection">
        <div className="operation-subsection-head">
          <div>
            <h3>{t("Suggested Flights","推荐航班")}</h3>
            <p>{overrideFlights?t("Using Operation flights","使用 Operation 航班"):t("Using Sales suggested flights","使用 Sales 推荐航班")}</p>
          </div>
          {canEdit&&<div className="operation-subsection-actions">
            {overrideFlights&&<button className="btn operation-secondary-btn" type="button" onClick={useSalesFlights}>{t("Use Sales Flights","使用 Sales 航班")}</button>}
            <button className="btn" type="button" onClick={startEditingFlights}>{overrideFlights?t("Edit Flights","编辑航班"):t("Change Flights","更改航班")}</button>
          </div>}
        </div>

        {!editingFlights&&<FlightSummary flights={activeFlights} t={t}/>}
        {editingFlights&&<div className="inquiry-flight-list operation-flight-editor">
          {operationFlights.map((f,index)=><div className="inquiry-flight-card" key={f.id}>
            <div className="inquiry-flight-card-head">
              <strong>{t("Operation Flight","Operation 航班")} {index+1}</strong>
              <button disabled={!canEdit} className="danger-link" type="button" onClick={()=>setOperationFlights(prev=>prev.filter(x=>x.id!==f.id))}>{t("Delete","删除")}</button>
            </div>
            <div className="itinerary-meta-grid">
              <label className="field"><span>{t("From","出发")}</span><input disabled={!canEdit} maxLength={3} value={f.from} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,from:e.target.value.toUpperCase()}:x))}/></label>
              <label className="field"><span>{t("To","抵达")}</span><input disabled={!canEdit} maxLength={3} value={f.to} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,to:e.target.value.toUpperCase()}:x))}/></label>
              <label className="field"><span>{t("Flight No.","航班号")}</span><input disabled={!canEdit} value={f.flightNo} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,flightNo:e.target.value.toUpperCase()}:x))}/></label>
              <label className="field"><span>{t("Date","日期")}</span><input disabled={!canEdit} type="date" value={f.date} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,date:e.target.value}:x))}/></label>
              <label className="field"><span>{t("Departure","起飞")}</span><input disabled={!canEdit} type="time" value={f.departureTime} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,departureTime:e.target.value}:x))}/></label>
              <label className="field"><span>{t("Arrival","抵达")}</span><input disabled={!canEdit} type="time" value={f.arrivalTime} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,arrivalTime:e.target.value}:x))}/></label>
              <label className="field inquiry-flight-remarks"><span>{t("Remarks","备注")}</span><input disabled={!canEdit} value={f.remarks} onChange={e=>setOperationFlights(prev=>prev.map(x=>x.id===f.id?{...x,remarks:e.target.value}:x))}/></label>
            </div>
          </div>)}
          <div className="operation-flight-editor-actions">
            <button className="btn" type="button" onClick={()=>setOperationFlights(prev=>[...prev,emptyFlight()])}>{t("+ Add Flight","+ 新增航班")}</button>
            <button className="btn" type="button" onClick={()=>setEditingFlights(false)}>{t("Done","完成")}</button>
          </div>
        </div>}
      </div>

      <div className="operation-subsection ios-form-subsection operation-requirements-ios">
        <div className="operation-subsection-head"><div><h3>{t("Requirements","需求")}</h3><p>{t("Requirements the supplier should follow during execution","Supplier 执行时需要参考的要求")}</p></div></div>
        <div className="inquiry-requirement-grid operation-review-fields">
          <label className="field"><span>{t("Flight Requirement","航班需求")}</span><textarea disabled={!canEdit} value={flight} onChange={e=>setFlight(e.target.value)}/></label>
          <label className="field"><span>{t("Hotel Requirement","酒店需求")}</span><textarea disabled={!canEdit} value={hotel} onChange={e=>setHotel(e.target.value)}/></label>
          <label className="field"><span>{t("Meal Requirement","餐食需求")}</span><textarea disabled={!canEdit} value={meals} onChange={e=>setMeals(e.target.value)}/></label>
          <label className="field"><span>{t("Transportation Requirement","交通需求")}</span><textarea disabled={!canEdit} value={transport} onChange={e=>setTransport(e.target.value)} placeholder="Coach / MPV / airport transfer / cross-border..."/></label>
          <label className="field"><span>{t("Itinerary Requirement","行程要求")}</span><textarea disabled={!canEdit} value={itineraryReq} onChange={e=>setItineraryReq(e.target.value)} placeholder="Must-visit attractions, pacing, free time, shopping stops..."/></label>
          <label className="field"><span>{t("Special Request","特别要求")}</span><textarea disabled={!canEdit} value={special} onChange={e=>setSpecial(e.target.value)}/></label>
        </div>
      </div>

      <div className="operation-subsection operation-internal-notes ios-form-subsection operation-notes-ios">
        <div className="operation-subsection-head"><div><h3>{t("Internal Operation Notes","内部操作备注")}</h3><p>{t("Internal only · Not shown to supplier","仅供内部使用 · 不显示给供应商")}</p></div></div>
        <label className="field"><textarea disabled={!canEdit} value={operationNotes} onChange={e=>setOperationNotes(e.target.value)} placeholder={t("Internal notes for the Operation team...","Operation 团队内部备注...")}/></label>
      </div>
    </section>

    <section className="panel supplier-form-settings operation-supplier-panel ios-form-card operation-supplier-ios">
      <div className="panel-head">
        <div>
          <h2>{t("Supplier Inquiry","供应商询价")}</h2>
          <p className="panel-subtext">{t("Configure only the information that needs confirmation before sending to the supplier. Status follows the Inquiry Workflow.","这里只设置发给 Supplier 前需要确认的内容；Status 跟随 Inquiry Workflow。")}</p>
        </div>
        <button className="btn" type="button" onClick={()=>window.open(supplierFormHref,"_blank")}>{t("Preview Supplier Form","预览供应商表单")}</button>
      </div>
      <div className="operation-supplier-grid">
        <label className="field"><span>{t("Quotation Deadline","报价截止")}</span><input disabled={!canEdit} type="date" value={quoteDeadline} onChange={e=>setQuoteDeadline(e.target.value)}/></label>
        <label className="supplier-budget-toggle operation-budget-toggle">
          <input disabled={!canEdit} type="checkbox" checked={showBudget} onChange={e=>setShowBudget(e.target.checked)}/>
          <span>{t("Show Budget to Supplier","向供应商显示预算")}</span>
        </label>
      </div>
      <label className="field supplier-remarks"><span>{t("Remarks to Supplier","给供应商备注")}</span><textarea disabled={!canEdit} value={supplierRemarks} onChange={e=>setSupplierRemarks(e.target.value)} placeholder={t("Quotation format, response request, or commercial notes that are safe to send to supplier...","可发送给供应商的报价格式、回复要求或商务备注...")}/></label>
    </section>

    <div className="detail-actions operation-review-actions">
      <button className="btn" type="button" onClick={()=>router.push(inquiryHref)}>{t("‹ Inquiry","‹ 询价")}</button>
      {canEdit&&<button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?t("Saving...","保存中..."):t("Save Operation Review","保存 Operation Review")}</button>}
    </div>
    {message&&<div className="save-message">{message}</div>}
  </div>;
}

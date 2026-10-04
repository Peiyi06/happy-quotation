"use client";

import { useEffect,useMemo,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import InquiryAiIntake from "@/components/InquiryAiIntake";
import FlightInformation,{emptyFlightInformation,flightInformationFromFlightList,type FlightInformationValue} from "@/components/FlightInformation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export default function InquiryEditor({initialInquiry,currentStaffName,backHref="/inquiries"}:{initialInquiry?:any;currentStaffName:string;backHref?:string}){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const [customerName,setCustomerName]=useState(initialInquiry?.customer_name||"");
  const [contact,setContact]=useState(initialInquiry?.contact||"");
  const [destination,setDestination]=useState(initialInquiry?.destination||"");
  const [departureCity,setDepartureCity]=useState(initialInquiry?.departure_city||"");
  const [startDate,setStartDate]=useState(initialInquiry?.travel_start_date||"");
  const [endDate,setEndDate]=useState(initialInquiry?.travel_end_date||"");
  const [days,setDays]=useState(Number(initialInquiry?.days_count)||1);
  const [pax,setPax]=useState<number|"">(initialInquiry?.pax??"");
  const initialComposition=initialInquiry?.inquiry_data?.travellerComposition||{};
  const [adultCount,setAdultCount]=useState<number|"">(initialComposition.adultCount??"");
  const [seniorCount,setSeniorCount]=useState<number|"">(initialComposition.seniorCount??"");
  const [childCount,setChildCount]=useState<number|"">(initialComposition.childCount??"");
  const [seniorNotes,setSeniorNotes]=useState(initialComposition.seniorNotes||"");
  const [childAges,setChildAges]=useState(initialComposition.childAges||"");
  const [childNotes,setChildNotes]=useState(initialComposition.childNotes||"");
  const [mobilityNotes,setMobilityNotes]=useState(initialComposition.mobilityNotes||"");
  const [budget,setBudget]=useState(initialInquiry?.budget||"");
  const [tourType,setTourType]=useState(initialInquiry?.tour_type||"");
  const [flightRequirement,setFlightRequirement]=useState(initialInquiry?.flight_requirement||"");
  const [flightInformation,setFlightInformation]=useState<FlightInformationValue>(()=>initialInquiry?.inquiry_data?.flightInformation||emptyFlightInformation());
  const [hotelRequirement,setHotelRequirement]=useState(initialInquiry?.hotel_requirement||"");
  const [mealRequirement,setMealRequirement]=useState(initialInquiry?.meal_requirement||"");
  const [specialRequest,setSpecialRequest]=useState(initialInquiry?.special_request||"");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [copyMessage,setCopyMessage]=useState("");
  const [showCopyMenu,setShowCopyMenu]=useState(false);
  const [isDirty,setIsDirty]=useState(false);
  const [pendingHref,setPendingHref]=useState<string|null>(null);
  const [showUnsavedPrompt,setShowUnsavedPrompt]=useState(false);
  const baselineRef=useRef("");

  useEffect(()=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return;
    const [sy,sm,sd]=startDate.split("-").map(Number);
    const [ey,em,ed]=endDate.split("-").map(Number);
    const s=Date.UTC(sy,sm-1,sd), e=Date.UTC(ey,em-1,ed);
    if(e<s) return;
    const d=Math.floor((e-s)/86400000)+1;
    setDays(d);
  },[startDate,endDate]);

  const compositionTotal=(Number(adultCount)||0)+(Number(seniorCount)||0)+(Number(childCount)||0);
  const compositionHasValues=adultCount!==""||seniorCount!==""||childCount!=="";
  const compositionMismatch=compositionHasValues&&pax!==""&&compositionTotal!==Number(pax);

  const editorSnapshot=useMemo(()=>JSON.stringify({
    customerName,contact,destination,departureCity,startDate,endDate,days,pax,budget,tourType,
    adultCount,seniorCount,childCount,seniorNotes,childAges,childNotes,mobilityNotes,
    flightRequirement,flightInformation,hotelRequirement,mealRequirement,specialRequest
  }),[customerName,contact,destination,departureCity,startDate,endDate,days,pax,budget,tourType,adultCount,seniorCount,childCount,seniorNotes,childAges,childNotes,mobilityNotes,flightRequirement,flightInformation,hotelRequirement,mealRequirement,specialRequest]);

  useEffect(()=>{
    if(!baselineRef.current){
      baselineRef.current=editorSnapshot;
      return;
    }
    setIsDirty(editorSnapshot!==baselineRef.current);
  },[editorSnapshot]);

  useEffect(()=>{
    const beforeUnload=(e:BeforeUnloadEvent)=>{
      if(!isDirty) return;
      e.preventDefault();
      e.returnValue="";
    };
    window.addEventListener("beforeunload",beforeUnload);
    return ()=>window.removeEventListener("beforeunload",beforeUnload);
  },[isDirty]);

  useEffect(()=>{
    const onLinkClick=(e:MouseEvent)=>{
      if(!isDirty||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
      const target=e.target as HTMLElement|null;
      const anchor=target?.closest?.("a[href]") as HTMLAnchorElement|null;
      if(!anchor||anchor.target==="_blank"||anchor.hasAttribute("download")) return;
      const url=new URL(anchor.href,window.location.href);
      if(url.origin!==window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname+url.search+url.hash);
      setShowUnsavedPrompt(true);
    };
    document.addEventListener("click",onLinkClick,true);
    return ()=>document.removeEventListener("click",onLinkClick,true);
  },[isDirty]);

  function requestNavigate(href:string){
    if(!isDirty){router.push(href);return;}
    setPendingHref(href);
    setShowUnsavedPrompt(true);
  }

  async function copyText(text:string,label:string){
    try{
      await navigator.clipboard.writeText(text);
      setCopyMessage(t("Request template copied ✓","资料收集模板已复制 ✓"));
      window.setTimeout(()=>setCopyMessage(""),1800);
    }catch{
      setCopyMessage(t("Unable to copy. Please copy manually.","无法复制，请手动复制。"));
      window.setTimeout(()=>setCopyMessage(""),2200);
    }
  }

  function requestTemplateText(lang:"zh"|"en"){
    if(lang==="en"){
      return [
        "Hello, to help us prepare a suitable itinerary and quotation, please provide the following information:",
        "",
        "1. Guest’s Current City:",
        "2. Preferred Departure Airport:",
        "3. Travel Destination:",
        "4. Estimated Trip Duration:",
        "5. Departure Date / Return Date:",
        "6. Total Number of Travellers:",
        "7. Number of Adults / Seniors / Children:",
        "8. Child Age(s), if any:",
        "9. Budget Range:",
        "10. Tour Type (Private / Company / Other, if known):",
        "11. Places / Activities You Would Like to Include or Any Special Requests:",
        "",
        "Once we receive the details, we will proceed with the itinerary planning and quotation. Thank you 😊"
      ].join("\n");
    }
    return [
      "您好，为了方便我们为您规划合适的旅游行程与报价，请提供以下资料：",
      "",
      "1. 客人所在城市：",
      "2. 想从哪个机场出发：",
      "3. 旅游目的地：",
      "4. 预计旅游天数：",
      "5. 出发日期 / 回程日期：",
      "6. 总人数：",
      "7. 成人 / 老人 / 小孩人数：",
      "8. 小孩年龄（如有）：",
      "9. 预算范围：",
      "10. 团型（私人团 / 公司团 / 其他，如已确定）：",
      "11. 想去的景点 / 活动 / 特别要求：",
      "",
      "收到资料后，我们会根据您的需求进一步规划行程与报价，谢谢 😊"
    ].join("\n");
  }

  function applyAiIntake(payload:any){
    if(payload.trip){
      if(payload.trip.departureCity) setDepartureCity(payload.trip.departureCity);
      if(payload.trip.destination) setDestination(payload.trip.destination);
      if(payload.trip.travelStartDate) setStartDate(payload.trip.travelStartDate);
      if(payload.trip.travelEndDate) setEndDate(payload.trip.travelEndDate);
      if(payload.trip.pax!=null) setPax(payload.trip.pax);
      if(payload.trip.budget) setBudget(payload.trip.budget);
      if(payload.trip.tourType) setTourType(payload.trip.tourType);
    }
    if(payload.composition){
      if(payload.composition.adultCount!=null) setAdultCount(payload.composition.adultCount);
      if(payload.composition.seniorCount!=null) setSeniorCount(payload.composition.seniorCount);
      if(payload.composition.childCount!=null) setChildCount(payload.composition.childCount);
      if(payload.composition.seniorNotes) setSeniorNotes(payload.composition.seniorNotes);
      if(payload.composition.childAges) setChildAges(payload.composition.childAges);
      if(payload.composition.childNotes) setChildNotes(payload.composition.childNotes);
      if(payload.composition.mobilityNotes) setMobilityNotes(payload.composition.mobilityNotes);
    }
    if(payload.requirements){
      if(payload.requirements.flightRequirement) setFlightRequirement(payload.requirements.flightRequirement);
      if(payload.requirements.hotelRequirement) setHotelRequirement(payload.requirements.hotelRequirement);
      if(payload.requirements.mealRequirement) setMealRequirement(payload.requirements.mealRequirement);
      const combinedSpecial=[payload.requirements.specialRequest,payload.requirements.extraNotes].filter(Boolean).join("\n");
      if(combinedSpecial) setSpecialRequest(combinedSpecial);
    }
    if(Array.isArray(payload.flights)){
      const onlyFlights=payload.flights.filter((x:any)=>x.segmentType==="flight").map((x:any)=>({
        from:x.from||"",
        to:x.to||"",
        flightNo:x.flightNo||"",
        date:x.date||"",
        departureTime:x.departureTime||"",
        arrivalTime:x.arrivalTime||"",
        remarks:[x.remarks||"",x.arrivalNextDay?"+1 Next Day":""].filter(Boolean).join(" · ")
      }));
      if(onlyFlights.length) setFlightInformation(flightInformationFromFlightList(onlyFlights));
    }
    setMessage(t("AI information applied — remember to Save Inquiry.","AI 资料已套用，请记得保存 Inquiry。"));
  }

  async function save(){
    setSaving(true);setMessage("");
    try{
      const payload={
        customer_name:customerName,contact,destination,departure_city:departureCity,
        travel_start_date:startDate,travel_end_date:endDate,days_count:days,
        pax,budget,tour_type:tourType,flight_requirement:flightRequirement,hotel_requirement:hotelRequirement,
        meal_requirement:mealRequirement,special_request:specialRequest,
        inquiry_data:{...(initialInquiry?.inquiry_data||{}),flightInformation,travellerComposition:{
          adultCount:adultCount===""?null:Number(adultCount),
          seniorCount:seniorCount===""?null:Number(seniorCount),
          childCount:childCount===""?null:Number(childCount),
          seniorNotes,childAges,childNotes,mobilityNotes
        }}
      };
      const res=await fetch("/api/internal-inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:initialInquiry?.id||null,payload})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){setMessage(data?.error||t("Unable to save inquiry.","无法保存 Inquiry。"));return;}
      baselineRef.current=editorSnapshot;
      setIsDirty(false);
      setShowUnsavedPrompt(false);
      setPendingHref(null);
      if(!initialInquiry?.id&&data.id) router.replace("/inquiries/"+data.id);
      else {setMessage(t("All changes saved ✓","所有修改已保存 ✓"));router.refresh();}
    }finally{setSaving(false);}
  }

  return <div className="inquiry-editor">
    <section className="panel">
      <div className="panel-head">
        <div><h2>{t("Customer Request","客户需求")}</h2><p className="panel-subtext">{t("Sales only needs to enter this once; Itinerary and Quotation can reuse the information later.","Sales 只需在 Inquiry 输入一次，后续 Itinerary / Quotation 会复用这些资料。")}</p></div>
        <div className="customer-request-copy-actions">
          <InquiryAiIntake
            inquiryContext={{departureCity,destination,travelStartDate:startDate,travelEndDate:endDate,pax,budget,tourType}}
            onApply={applyAiIntake}
          />
          <div className="customer-request-copy-menu">
            <button className="btn customer-request-copy-trigger" type="button" aria-expanded={showCopyMenu} onClick={()=>setShowCopyMenu(v=>!v)}>
              {t("Request Template","资料收集模板")} <span className="customer-request-copy-chevron" aria-hidden="true"></span>
            </button>
            {showCopyMenu&&<div className="customer-request-copy-popover">
              <div className="customer-request-copy-group customer-request-copy-language-group">
                <button type="button" onClick={()=>{setShowCopyMenu(false);void copyText(requestTemplateText("zh"),"Request template");}}>中文</button>
                <button type="button" onClick={()=>{setShowCopyMenu(false);void copyText(requestTemplateText("en"),"Request template");}}>English</button>
              </div>
            </div>}
          </div>
        </div>
      </div>
      {copyMessage&&<div className="copy-feedback">{copyMessage}</div>}
      <div className="itinerary-meta-grid">
        <label className="field"><span>{t("Customer / Company","客户 / 公司")}</span><input value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label>
        <label className="field"><span>{t("Contact","联系方式")}</span><input value={contact} onChange={e=>setContact(e.target.value)} placeholder={t("Phone / WhatsApp / Email","电话 / WhatsApp / 电邮")}/></label>
        <label className="field"><span>{t("Departure City","出发城市")}</span><input value={departureCity} onChange={e=>setDepartureCity(e.target.value)} placeholder={t("Kuala Lumpur","吉隆坡")}/></label>
        <label className="field"><span>{t("Destination","目的地")}</span><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder={t("Hokkaido / Chongqing","北海道 / 重庆")}/></label>
        <label className="field"><span>{t("Travel Start Date","出发日期")}</span><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
        <label className="field"><span>{t("Travel End Date","返程日期")}</span><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
        <label className="field"><span>{t("Duration","行程天数")}</span><input value={startDate&&endDate?(days+" "+t("Days","天")):"—"} readOnly className="system-fixed-input"/></label>
        <label className="field"><span>{t("Pax","人数")}</span><input type="number" min="1" value={pax} onChange={e=>setPax(e.target.value===""?"":Math.max(1,Number(e.target.value)||1))}/></label>
        <label className="field"><span>{t("Budget","预算")}</span><input value={budget} onChange={e=>setBudget(e.target.value)} placeholder="RM 3,500/pax"/></label>
        <label className="field"><span>{t("Tour Type","团型")}</span><input value={tourType} onChange={e=>setTourType(e.target.value)} placeholder={t("Private / Company Trip","私人团 / 公司团")}/></label>
        <label className="field"><span>{t("Sales Owner","销售负责人")}</span><input value={initialInquiry?.sales_owner_name||currentStaffName} readOnly className="system-fixed-input"/></label>
        <label className="field"><span>{t("Operation Assignee","运营负责人")}</span><input value={initialInquiry?.operation_assignee_name||"Jess"} readOnly className="system-fixed-input"/></label>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t("Traveller Composition","旅客组成")}</h2>
          <p className="panel-subtext">{t("Enter the number of adults, seniors and children so Operation and suppliers can plan pacing, transport, tickets and meals.","填写成人、老人及小孩人数，方便 Operation 与供应商判断行程强度、车辆、门票及餐食安排。")}</p>
        </div>
      </div>
      <div className="itinerary-meta-grid">
        <label className="field"><span>{t("Adult","成人")}</span><input type="number" min="0" value={adultCount} onChange={e=>setAdultCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
        <label className="field"><span>{t("Senior","老人")}</span><input type="number" min="0" value={seniorCount} onChange={e=>setSeniorCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
        <label className="field"><span>{t("Child","小孩")}</span><input type="number" min="0" value={childCount} onChange={e=>setChildCount(e.target.value===""?"":Math.max(0,Number(e.target.value)||0))}/></label>
      </div>
      <div className="inquiry-requirement-grid traveller-composition-notes">
        <label className="field"><span>{t("Senior Notes","老人备注")}</span><textarea value={seniorNotes} onChange={e=>setSeniorNotes(e.target.value)} placeholder={t("e.g. Age 65 and 72; one walks more slowly","例如：65岁、72岁，其中1位走路较慢")}/></label>
        <label className="field"><span>{t("Child Ages","小孩年龄")}</span><textarea value={childAges} onChange={e=>setChildAges(e.target.value)} placeholder={t("e.g. Age 6 and 10","例如：6岁、10岁")}/></label>
        <label className="field"><span>{t("Child Notes","小孩备注")}</span><textarea value={childNotes} onChange={e=>setChildNotes(e.target.value)} placeholder={t("Stroller, child meal, child seat, etc.","婴儿车、儿童餐、儿童座椅等")}/></label>
        <label className="field"><span>{t("Mobility / Care Notes","行动与照顾需求")}</span><textarea value={mobilityNotes} onChange={e=>setMobilityNotes(e.target.value)} placeholder={t("e.g. Reduce long walks; wheelchair assistance needed","例如：减少长时间步行、需要轮椅协助")}/></label>
      </div>
      <div className={"traveller-composition-check "+(compositionMismatch?"warning":"ok")}>
        <div className="traveller-composition-total">
          <span>{t("Composition Total","人数合计")}</span>
          <strong>{compositionTotal} <small>pax</small></strong>
        </div>
        <div className="traveller-composition-match">
          <i aria-hidden="true"/>
          <span>{pax===""?t("Enter total Pax first.","请先填写总人数。"):compositionMismatch?t(`Doesn’t match Pax ${pax} · Check the breakdown`,`与总人数 ${pax} 不一致 · 请检查`):t(`Matches Pax ${pax}`,`与总人数 ${pax} 一致`)}</span>
        </div>
      </div>
    </section>

    <section className="panel ios-form-card inquiry-flights-ios flight-section-surface">
      <FlightInformation
        value={flightInformation}
        onChange={setFlightInformation}
        durationDays={startDate&&endDate?days:0}
        compact
      />
    </section>

    <section className="panel ios-form-card inquiry-requirements-ios">
      <div className="panel-head"><h2>{t("Travel Requirements","旅游需求")}</h2></div>
      <div className="inquiry-requirement-grid">
        <label className="field"><span>{t("Flight Requirement","航班需求")}</span><textarea value={flightRequirement} onChange={e=>setFlightRequirement(e.target.value)} placeholder={t("Preferred airline, flight time, baggage...","偏好航空公司、航班时间、行李要求...")}/></label>
        <label className="field"><span>{t("Hotel Requirement","酒店需求")}</span><textarea value={hotelRequirement} onChange={e=>setHotelRequirement(e.target.value)} placeholder={t("Star rating, room type, location...","星级、房型、地点要求...")}/></label>
        <label className="field"><span>{t("Meal Requirement","餐食需求")}</span><textarea value={mealRequirement} onChange={e=>setMealRequirement(e.target.value)} placeholder={t("Vegetarian, halal, no beef...","素食、清真、不吃牛肉等...")}/></label>
        <label className="field"><span>{t("Special Request","特别要求")}</span><textarea value={specialRequest} onChange={e=>setSpecialRequest(e.target.value)} placeholder={t("Activities, elderly guests, children, special arrangements...","活动、长者、小孩或其他特别安排...")}/></label>
      </div>
    </section>

    {!initialInquiry?.id&&<section className="panel inquiry-workflow-panel new-inquiry-workflow-panel">
      <div className="panel-head inquiry-workflow-panel-head system-workflow-head">
        <div>
          <span className="page-kicker">{t("WORKFLOW","工作流程")}</span>
          <h2>{t("Next Step","下一步")}</h2>
          
        </div>
      </div>
      <div className="new-inquiry-workflow-grid system-workflow-grid system-workflow-two-step">
        <div className="simple-workflow-card current">
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">01</span>
            <span className="simple-workflow-state">{t("Current","当前")}</span>
          </div>
          <div className="simple-workflow-title">
            <strong>{t("Inquiry","询价")}</strong>
          </div>
        </div>
        <div className="simple-workflow-arrow" aria-hidden="true">→</div>
        <div className="simple-workflow-card upcoming">
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">02</span>
            <span className="simple-workflow-state">{t("Next","下一步")}</span>
          </div>
          <div className="simple-workflow-title">
            <strong>{t("Operation","运营")}</strong>
          </div>
          <div className="simple-workflow-actions">
            <button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>
              {saving?t("Creating...","建立中..."):t("Create Inquiry & Send to Operation","建立 Inquiry 并交给 Operation")}
            </button>
          </div>
        </div>
      </div>

      {message&&<div className="save-message">{message}</div>}
    </section>}

    {initialInquiry?.id&&<>
      <div className={"inquiry-save-state edit-inquiry-save-state "+(isDirty?"unsaved":"saved")}>
        <div>
          <strong>{isDirty?t("● Unsaved Changes","● 有未存档修改"):t("✓ All changes saved","✓ 所有修改已存档")}</strong>
          <span>{isDirty?t("Save Inquiry before leaving, refreshing or closing this page.","离开、刷新或关闭页面前请先保存 Inquiry。"):t("The current page is saved.","目前页面资料已存档。")}</span>
        </div>
        {isDirty&&<button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?t("Saving...","保存中..."):t("Save Inquiry","保存 Inquiry")}</button>}
      </div>
      {message&&<div className="save-message">{message}</div>}
    </>}

    {showUnsavedPrompt&&<div className="unsaved-overlay" onMouseDown={()=>setShowUnsavedPrompt(false)}>
      <div className="unsaved-modal" onMouseDown={e=>e.stopPropagation()}>
        <span className="page-kicker">{t("UNSAVED CHANGES","未保存修改")}</span>
        <h3>{t("You have unsaved changes.","你有尚未保存的修改。")}</h3>
        <p>{t("These changes will be lost if you leave without saving.","尚有修改未存档，离开后这些资料会丢失。")}</p>
        <div className="detail-actions">
          <button className="btn primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?t("Saving...","保存中..."):t("Stay & Save","留下并保存")}</button>
          <button className="btn" type="button" onClick={()=>{
            const href=pendingHref||backHref;
            baselineRef.current=editorSnapshot;
            setIsDirty(false);
            setShowUnsavedPrompt(false);
            setPendingHref(null);
            router.push(href);
          }}>{t("Leave Without Saving","不保存离开")}</button>
        </div>
      </div>
    </div>}
  </div>;
}

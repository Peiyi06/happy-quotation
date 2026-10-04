"use client";

import {useEffect} from "react";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

export type FlightLeg = {
  fromAirport:string;
  toAirport:string;
  flightNo:string;
  flightDate:string;
  departureTime:string;
  arrivalTime:string;
  nextDay:boolean;
};

export type FlightInformationValue = {
  outbound:FlightLeg;
  outboundTransitOpen:boolean;
  outboundTransit:FlightLeg;
  returning:FlightLeg;
  returnTransitOpen:boolean;
  returnTransit:FlightLeg;
};

const emptyLeg=():FlightLeg=>({
  fromAirport:"",
  toAirport:"",
  flightNo:"",
  flightDate:"",
  departureTime:"",
  arrivalTime:"",
  nextDay:false
});

export const emptyFlightInformation=():FlightInformationValue=>({
  outbound:emptyLeg(),
  outboundTransitOpen:false,
  outboundTransit:emptyLeg(),
  returning:emptyLeg(),
  returnTransitOpen:false,
  returnTransit:emptyLeg()
});

export function flightInformationFromFlightList(flights:any[]):FlightInformationValue{
  const list=Array.isArray(flights)?flights:[];
  const result=emptyFlightInformation();
  const toLeg=(f:any):FlightLeg=>({
    fromAirport:f?.from||"",
    toAirport:f?.to||"",
    flightNo:f?.flightNo||"",
    flightDate:f?.date||"",
    departureTime:f?.departureTime||"",
    arrivalTime:f?.arrivalTime||"",
    nextDay:/\+1|next day|次日/i.test(f?.remarks||"")
  });
  if(list[0]) result.outbound=toLeg(list[0]);
  if(list.length>=4){
    result.outboundTransitOpen=true;
    result.outboundTransit=toLeg(list[1]);
    result.returning=toLeg(list[2]);
    result.returnTransitOpen=true;
    result.returnTransit=toLeg(list[3]);
  }else if(list.length===3){
    result.returning=toLeg(list[1]);
    result.returnTransitOpen=true;
    result.returnTransit=toLeg(list[2]);
  }else if(list.length===2){
    result.returning=toLeg(list[1]);
  }
  return result;
}

function inferNextDay(departure:string,arrival:string){
  if(!/^\d{2}:\d{2}$/.test(departure)||!/^\d{2}:\d{2}$/.test(arrival)) return false;
  const [dh,dm]=departure.split(":").map(Number);
  const [ah,am]=arrival.split(":").map(Number);
  return ah*60+am < dh*60+dm;
}

export default function FlightInformation({
  value,
  onChange,
  durationDays=0,
  footer,
  compact=false,
  disabled=false
}:{
  value:FlightInformationValue;
  onChange:(value:FlightInformationValue)=>void;
  durationDays?:number;
  footer?:React.ReactNode;
  compact?:boolean;
  disabled?:boolean;
}){
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const setLeg=(key:"outbound"|"outboundTransit"|"returning"|"returnTransit",patch:Partial<FlightLeg>)=>{
    onChange({...value,[key]:{...value[key],...patch}});
  };

  useEffect(()=>{
    if(!value.outbound.departureTime||!value.outbound.arrivalTime) return;
    const inferred=inferNextDay(value.outbound.departureTime,value.outbound.arrivalTime);
    if(value.outbound.nextDay!==inferred) setLeg("outbound",{nextDay:inferred});
  },[value.outbound.departureTime,value.outbound.arrivalTime]);

  useEffect(()=>{
    if(!value.outboundTransit.departureTime||!value.outboundTransit.arrivalTime) return;
    const inferred=inferNextDay(value.outboundTransit.departureTime,value.outboundTransit.arrivalTime);
    if(value.outboundTransit.nextDay!==inferred) setLeg("outboundTransit",{nextDay:inferred});
  },[value.outboundTransit.departureTime,value.outboundTransit.arrivalTime]);

  useEffect(()=>{
    if(!value.returning.departureTime||!value.returning.arrivalTime) return;
    const inferred=inferNextDay(value.returning.departureTime,value.returning.arrivalTime);
    if(value.returning.nextDay!==inferred) setLeg("returning",{nextDay:inferred});
  },[value.returning.departureTime,value.returning.arrivalTime]);

  useEffect(()=>{
    if(!value.returnTransit.departureTime||!value.returnTransit.arrivalTime) return;
    const inferred=inferNextDay(value.returnTransit.departureTime,value.returnTransit.arrivalTime);
    if(value.returnTransit.nextDay!==inferred) setLeg("returnTransit",{nextDay:inferred});
  },[value.returnTransit.departureTime,value.returnTransit.arrivalTime]);

  const renderTime=(label:string,legKey:"outbound"|"outboundTransit"|"returning"|"returnTransit",field:"departureTime"|"arrivalTime")=>{
    const leg=value[legKey];
    const raw=leg[field];
    const normalize=(input:string)=>{
      const digits=input.replace(/\D/g,"").slice(0,4);
      return digits.length<=2?digits:digits.slice(0,2)+":"+digits.slice(2);
    };
    const valid=(input:string)=>{
      if(!/^\d{2}:\d{2}$/.test(input)) return input;
      const [h,m]=input.split(":").map(Number);
      return h>23||m>59?"":input;
    };
    const hour=/^(\d{2})/.exec(raw)?.[1];
    const meridiem=hour&&Number(hour)<=23?(Number(hour)<12?"AM":"PM"):"";
    return <label className="field time-field">
      <span>{label}</span>
      <div className="time-input-wrap">
        <input disabled={disabled} inputMode="numeric" maxLength={5} placeholder="HH:MM" value={raw}
          onChange={e=>setLeg(legKey,{[field]:normalize(e.target.value)})}
          onBlur={e=>setLeg(legKey,{[field]:valid(e.target.value)})}/>
        {meridiem&&<b className="time-meridiem">{meridiem}</b>}
      </div>
    </label>;
  };

  const renderLeg=(legKey:"outbound"|"outboundTransit"|"returning"|"returnTransit",transit=false)=>{
    const leg=value[legKey];
    return <div className={transit?"transit-flight-panel":""}>
      {transit&&<div className="transit-flight-title"><span>{t("TRANSIT","中转")}</span><strong>{legKey==="outboundTransit"?t("Departure Transit Flight","去程中转航班"):t("Return Transit Flight","返程中转航班")}</strong></div>}
      <div className="flight-fields">
        <label className="field"><span>{t("From Airport Code","出发机场代码")}</span><input disabled={disabled} maxLength={3} value={leg.fromAirport} onChange={e=>setLeg(legKey,{fromAirport:e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3)})} placeholder={legKey.startsWith("return")?"CSX":"KUL"}/></label>
        <label className="field"><span>{t("To Airport Code","抵达机场代码")}</span><input disabled={disabled} maxLength={3} value={leg.toAirport} onChange={e=>setLeg(legKey,{toAirport:e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3)})} placeholder={legKey.startsWith("return")?"KUL":"CSX"}/></label>
        <label className="field"><span>{t("Airline / Flight No.","航空公司 / 航班号")}</span><input disabled={disabled} value={leg.flightNo} onChange={e=>setLeg(legKey,{flightNo:e.target.value.toUpperCase()})} placeholder="MH52"/></label>
        <label className="field"><span>{transit?t("Transit Flight Date","中转航班日期"):legKey==="returning"?t("Return Flight Date","返程航班日期"):t("Departure Flight Date","去程航班日期")}</span><input disabled={disabled} type="date" value={leg.flightDate} onChange={e=>setLeg(legKey,{flightDate:e.target.value})}/></label>
        {renderTime(t("Departure Time","起飞时间"),legKey,"departureTime")}
        {renderTime(t("Arrival Time","抵达时间"),legKey,"arrivalTime")}
        <button type="button" disabled={disabled} className={"flight-day-status "+(leg.departureTime&&leg.arrivalTime?(leg.nextDay?"next":"same"):"pending")} onClick={()=>setLeg(legKey,{nextDay:!leg.nextDay})} title={t("Click to override the day status","点击可手动切换日期状态")}>
          <span>{leg.departureTime&&leg.arrivalTime?(leg.nextDay?t("+1 Next Day","+1 次日"):t("Same Day","同日")):t("Day Status","日期状态")}</span>
        </button>
      </div>
    </div>;
  };

  return <div className={"flight-info-card shared-flight-information"+(compact?" compact":"")}>
    <div className="flight-info-head">
      <div>
        <span className="page-kicker">{t("FLIGHT INFORMATION","航班信息")}</span>
        <h3>{t("Flight Information","航班信息")}</h3>
      </div>
      {durationDays>0&&<div className="itinerary-pill"><strong>{durationDays} {t("Days","天")}</strong><span>{t("Travel Duration","行程天数")}</span></div>}
    </div>
    <div className="flight-pair-grid">
      <div className="flight-block">
        <div className="flight-block-head">
          <h4>{t("Departure Flight","去程航班")}</h4>
          <button disabled={disabled} type="button" className={"btn transit-toggle "+(value.outboundTransitOpen?"active":"")} onClick={()=>onChange({...value,outboundTransitOpen:!value.outboundTransitOpen})}>
            {value.outboundTransitOpen?t("− Transit Flight","− 中转航班"):t("+ Transit Flight","+ 中转航班")}
          </button>
        </div>
        {renderLeg("outbound")}
        {value.outboundTransitOpen&&renderLeg("outboundTransit",true)}
      </div>
      <div className="flight-block">
        <div className="flight-block-head">
          <h4>{t("Return Flight","返程航班")}</h4>
          <button disabled={disabled} type="button" className={"btn transit-toggle "+(value.returnTransitOpen?"active":"")} onClick={()=>onChange({...value,returnTransitOpen:!value.returnTransitOpen})}>
            {value.returnTransitOpen?t("− Transit Flight","− 中转航班"):t("+ Transit Flight","+ 中转航班")}
          </button>
        </div>
        {renderLeg("returning")}
        {value.returnTransitOpen&&renderLeg("returnTransit",true)}
      </div>
    </div>
    {footer}
  </div>;
}

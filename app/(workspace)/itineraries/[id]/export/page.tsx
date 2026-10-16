import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";
import ItineraryExportToolbar from "@/components/ItineraryExportToolbar";

const text=(value:any)=>String(value??"").trim();
const list=(value:any)=>Array.isArray(value)?value:[];
const safeFilePart=(value:any)=>text(value).replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim();
const dayDate=(start:string,index:number)=>{
  if(!start) return "";
  const d=new Date(start+"T00:00:00");
  if(Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate()+index);
  return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
};

export default async function ItineraryCustomerExportPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_itinerary",{p_token:token,p_id:id});
  if(error||!data?.id) notFound();

  const qd=data.itinerary_data||{};
  const flights=list(qd.suggestedFlights).filter((f:any)=>[f?.from,f?.to,f?.flightNo,f?.date,f?.departureTime,f?.arrivalTime].some(text));
  const days=list(qd.days);
  const hotels=list(qd.hotels).filter((h:any)=>text(h?.name)||list(h?.images).length);
  const included=list(qd.includedItems).filter((x:any)=>text(typeof x==="string"?x:x?.name));
  const excluded=list(qd.notIncludedItems).filter((x:any)=>text(typeof x==="string"?x:x?.name));
  const reminders=list(qd.reminders).filter((x:any)=>text(typeof x==="string"?x:x?.title)||text(x?.description));
  const fileName=[
    "Happy Express Travel",
    data.destination,
    `${data.days_count||""}D${data.nights_count||""}N`,
    data.customer_name
  ].map(safeFilePart).filter(Boolean).join(" - ");

  return <div className="itinerary-export-screen">
    <ItineraryExportToolbar fileName={fileName}/>
    <main className="itinerary-export-document">
      <section className="itinerary-export-cover">
        <div className="itinerary-export-cover-band" aria-hidden="true"></div>
        <div className="itinerary-export-cover-top">
          <div>
            <div className="itinerary-export-kicker">HAPPY EXPRESS TRAVEL</div>
            <p className="itinerary-export-doc-label">TRAVEL ITINERARY · 行程确认</p>
          </div>
          <div className="itinerary-export-brand-space" aria-label="Logo area"></div>
        </div>

        <div className="itinerary-export-cover-main">
          <span className="itinerary-export-cover-route">{qd.departureCity||"Departure"} → {data.destination||"Destination"}</span>
          <h1>{data.title||data.destination||"Travel Itinerary"}</h1>
          <div className="itinerary-export-gold-line"></div>
          <p className="itinerary-export-cover-meta">
            {[qd.travelStartDate&&qd.travelEndDate?`${qd.travelStartDate} → ${qd.travelEndDate}`:(qd.travelStartDate||""),data.days_count&&data.nights_count?`${data.days_count}D${data.nights_count}N`:"",qd.pax?`${qd.pax} Pax`:""].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className="itinerary-export-overview">
          <div><span>Destination / 目的地</span><strong>{data.destination||"—"}</strong></div>
          <div><span>Travel Date / 旅游日期</span><strong>{qd.travelStartDate||"—"}{qd.travelEndDate?" → "+qd.travelEndDate:""}</strong></div>
          <div><span>Duration / 行程天数</span><strong>{data.days_count}D{data.nights_count}N</strong></div>
          <div><span>Pax / 人数</span><strong>{qd.pax||"—"}</strong></div>
          <div><span>Customer / 客户</span><strong>{data.customer_name||"—"}</strong></div>
          <div><span>Tour Type / 团型</span><strong>{qd.tourType||"—"}</strong></div>
        </div>

        <div className="itinerary-export-cover-ref">
          <span>Document Ref.</span>
          <strong>{data.itinerary_no||"—"}</strong>
        </div>
      </section>

      {flights.length>0&&<section className="itinerary-export-section itinerary-export-flight-section">
        <div className="itinerary-export-section-head"><span>01</span><div><h2>Flight Information</h2><p>航班资料</p></div></div>
        <div className="itinerary-export-flight-list">
          {flights.map((f:any,i:number)=><article className="itinerary-export-flight-card" key={f.id||i}>
            <div className="itinerary-export-flight-route">
              <small>{i===0?"OUTBOUND":"FLIGHT "+String(i+1).padStart(2,"0")}</small>
              <strong>{f.from||"—"} <span>→</span> {f.to||"—"}</strong>
            </div>
            <div className="itinerary-export-flight-facts">
              <div><span>Flight / 航班</span><b>{f.flightNo||"—"}</b></div>
              <div><span>Date / 日期</span><b>{f.date||"—"}</b></div>
              <div><span>Departure / 起飞</span><b>{f.departureTime||"—"}</b></div>
              <div><span>Arrival / 抵达</span><b>{f.arrivalTime||"—"}</b></div>
            </div>
            {text(f.remarks)&&<div className="itinerary-export-flight-remarks"><span>Remarks / 备注</span><strong>{f.remarks}</strong></div>}
          </article>)}
        </div>
      </section>}

      <section className="itinerary-export-section">
        <div className="itinerary-export-section-head"><span>{flights.length?"02":"01"}</span><div><h2>Daily Itinerary</h2><p>每日行程</p></div></div>
        <div className="itinerary-export-days">
          {days.map((day:any,index:number)=>{
            const attractions=list(day?.attractions).filter((a:any)=>text(a?.name)||list(a?.images).some((img:any)=>text(img?.url)));
            const date=dayDate(qd.travelStartDate||"",index);
            const mealVisible=text(day?.meals?.breakfast)||text(day?.meals?.lunch)||text(day?.meals?.dinner);
            const hotel=text(day?.hotel)&&text(day?.hotel)!=="-"?text(day.hotel):"";
            return <article className={"itinerary-export-day "+(attractions.length>3?"long-day":"compact-day")} key={day?.id||index}>
              <div className="itinerary-export-day-head">
                <div className="itinerary-export-day-no"><small>DAY</small><b>{String(index+1).padStart(2,"0")}</b></div>
                <div className="itinerary-export-day-title">
                  <h3>{day?.title||`Day ${index+1}`}</h3>
                  {date&&<span>{date}</span>}
                </div>
              </div>

              <div className="itinerary-export-day-core">
                {text(day?.content)&&<p className="itinerary-export-day-copy">{day.content}</p>}
                {mealVisible&&<div className="itinerary-export-meals">
                  <span><b>Breakfast / 早餐</b>{day?.meals?.breakfast||"—"}</span>
                  <span><b>Lunch / 午餐</b>{day?.meals?.lunch||"—"}</span>
                  <span><b>Dinner / 晚餐</b>{day?.meals?.dinner||"—"}</span>
                </div>}
                {hotel&&<div className="itinerary-export-day-hotel"><span>Hotel / 酒店</span><strong>{hotel}</strong></div>}
              </div>

              {attractions.length>0&&<div className="itinerary-export-attractions">
                {attractions.map((a:any,ai:number)=>{
                  const images=list(a?.images).filter((img:any)=>text(img?.url)).slice(0,3);
                  return <div className={"itinerary-export-attraction image-count-"+images.length} key={a?.id||ai}>
                    {images.length>0&&<div className={"itinerary-export-attraction-images count-"+images.length}>{images.map((img:any,ii:number)=><img key={img?.path||img?.url||ii} src={img.url} alt={a?.name||"Attraction"}/>)}</div>}
                    {text(a?.name)&&<strong>{a.name}</strong>}
                  </div>;
                })}
              </div>}
            </article>;
          })}
        </div>
      </section>

      {hotels.length>0&&<section className="itinerary-export-section itinerary-export-hotel-section">
        <div className="itinerary-export-section-head"><span>H</span><div><h2>Hotel Introduction</h2><p>酒店介绍</p></div></div>
        <div className="itinerary-export-hotels">{hotels.map((hotel:any,index:number)=>{
          const images=list(hotel?.images).filter((img:any)=>text(img?.url)).slice(0,3);
          const hotelFacts=[
            text(hotel?.cityArea)?{label:"Area / 地区",value:hotel.cityArea}:null,
            text(hotel?.stayNights)?{label:"Stay / 入住",value:hotel.stayNights}:null,
            hotel?.roomSize!==""&&hotel?.roomSize!=null?{label:"Room / 房间",value:`${hotel.roomSize} m²`}:null,
            text(hotel?.openingYear)?{label:"Opened / 开业",value:hotel.openingYear}:null,
            text(hotel?.renovationYear)?{label:"Renovated / 装修",value:hotel.renovationYear}:null
          ].filter(Boolean) as Array<{label:string;value:any}>;
          return <article className={"itinerary-export-hotel hotel-images-"+images.length} key={hotel?.id||index}>
            <div className="itinerary-export-hotel-head">
              <div>
                <small>HOTEL {String(index+1).padStart(2,"0")}</small>
                <h3>{hotel?.name||"Hotel"}</h3>
              </div>
              {text(hotel?.starRating)&&<strong>{hotel.starRating}</strong>}
            </div>

            {hotelFacts.length>0&&<div className={"itinerary-export-hotel-meta count-"+hotelFacts.length}>
              {hotelFacts.map((fact:any,fi:number)=><span key={fi}><b>{fact.label}</b>{fact.value}</span>)}
            </div>}

            {text(hotel?.nearbyNotes)&&<div className="itinerary-export-hotel-note">
              <span>Location / 周边</span>
              <p>{hotel.nearbyNotes}</p>
            </div>}

            {images.length>0&&<div className={"itinerary-export-hotel-images count-"+images.length}>
              {images.map((img:any,ii:number)=><img key={img?.path||img?.url||ii} src={img.url} alt={hotel?.name||"Hotel"}/>)}
            </div>}
          </article>;
        })}</div>
      </section>}

      {(included.length>0||excluded.length>0)&&<section className="itinerary-export-section itinerary-export-package-section">
        <div className="itinerary-export-section-head"><span>+</span><div><h2>Package Details</h2><p>配套包含与不包含</p></div></div>
        <div className="itinerary-export-package-grid">
          {included.length>0&&<div className="itinerary-export-package-card included">
            <div className="itinerary-export-package-head"><span>✓</span><h3>Included / 配套包含</h3></div>
            <ul>{included.map((x:any,i:number)=><li key={x?.id||i}><span>{String(i+1).padStart(2,"0")}</span><strong>{typeof x==="string"?x:x?.name}</strong></li>)}</ul>
          </div>}
          {excluded.length>0&&<div className="itinerary-export-package-card excluded">
            <div className="itinerary-export-package-head"><span>—</span><h3>Not Included / 配套不包含</h3></div>
            <ul>{excluded.map((x:any,i:number)=><li key={x?.id||i}><span>{String(i+1).padStart(2,"0")}</span><strong>{typeof x==="string"?x:x?.name}</strong></li>)}</ul>
          </div>}
        </div>
      </section>}

      {reminders.length>0&&<section className="itinerary-export-section itinerary-export-reminder-section">
        <div className="itinerary-export-section-head"><span>!</span><div><h2>Friendly Reminder</h2><p>温馨提醒</p></div></div>
        <div className="itinerary-export-reminders">{reminders.map((x:any,i:number)=>{
          const title=typeof x==="string"?`Reminder ${i+1}`:(x?.title||`Reminder ${i+1}`);
          const body=typeof x==="string"?x:x?.description;
          return <article className="itinerary-export-reminder-card" key={x?.id||i}>
            <div className="itinerary-export-reminder-index">{String(i+1).padStart(2,"0")}</div>
            <div><strong>{title}</strong>{text(body)&&<p>{body}</p>}</div>
          </article>;
        })}</div>
      </section>}

      <footer className="itinerary-export-footer">
        <span>Happy Express Travel · Customer Itinerary</span>
        <span>{data.itinerary_no||""}</span>
      </footer>
      <div className="itinerary-export-print-footer" aria-hidden="true">
        <span>Happy Express Travel</span>
        <span>{data.itinerary_no||""}</span>
      </div>
    </main>
  </div>;
}

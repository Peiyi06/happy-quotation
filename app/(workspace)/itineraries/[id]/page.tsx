import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";
import ItineraryActions from "@/components/ItineraryActions";
import {UiText} from "@/components/WorkspaceLanguage";

export default async function ItineraryDetailPage({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{returnTo?:string}>;
}){
  const {id}=await params;
  const sp=await searchParams;
  const token=await internalToken();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_itinerary",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const qd=data.itinerary_data||{};
  const days=Array.isArray(qd.days)?qd.days:[];
  const flights=Array.isArray(qd.suggestedFlights)?qd.suggestedFlights:[];
  const hotels=Array.isArray(qd.hotels)?qd.hotels:[];
  const includedItems=Array.isArray(qd.includedItems)?qd.includedItems:[];
  const notIncludedItems=Array.isArray(qd.notIncludedItems)?qd.notIncludedItems:[];
  const reminders=Array.isArray(qd.reminders)?qd.reminders:[];
  const rawReturnTo=String(sp.returnTo||"");
  const returnTo=rawReturnTo.startsWith("/")&&!rawReturnTo.startsWith("//")?rawReturnTo:"/itineraries";
  const currentItineraryHref="/itineraries/"+id+"?returnTo="+encodeURIComponent(returnTo);

  return <div className="itinerary-detail-template">
    <div className="page-head itinerary-detail-head">
      <div className="itinerary-detail-title-block">
        <h1>{data.title||data.itinerary_no}</h1>
        <div className="itinerary-detail-meta-line">
          <span>{data.itinerary_no}</span>
          <span className={"status itinerary-header-status status-"+String(data.status||"draft")}>{data.status==="ready"?<UiText en="Ready" zh="已就绪" />:data.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:data.status==="archived"?<UiText en="Archived" zh="已归档" />:<UiText en="Draft" zh="草稿" />}</span>
        </div>
      </div>
      <div className="detail-actions">
        <Link className="btn itinerary-back-action" href={returnTo}>{returnTo.startsWith("/inquiries/")?<UiText en="← Inquiry" zh="← 询价" />:<UiText en="← Back" zh="← 返回" />}</Link>
        <ItineraryActions id={id}/>
        <Link className="btn" href={"/itineraries/"+id+"/edit"}><UiText en="Edit Itinerary" zh="编辑行程" /></Link>
      </div>
    </div>

    {data.source_inquiry_id&&<section className="quote-source-inquiry quote-source-inquiry-detail">
      <div>
        <span><UiText en="SOURCE INQUIRY" zh="来源询价" /></span>
        <strong>{qd.sourceInquiryNo||<UiText en="Linked Inquiry" zh="关联询价" />}</strong>
        {qd.sourceInquirySnapshot&&<small>{[qd.sourceInquirySnapshot.destination,qd.sourceInquirySnapshot.daysCount&&qd.sourceInquirySnapshot.nightsCount?`${qd.sourceInquirySnapshot.daysCount}D${qd.sourceInquirySnapshot.nightsCount}N`:"",qd.sourceInquirySnapshot.pax?`${qd.sourceInquirySnapshot.pax} Pax`:""].filter(Boolean).join(" · ")}</small>}
      </div>
      <Link className="btn" href={"/inquiries/"+data.source_inquiry_id+"?returnTo="+encodeURIComponent(currentItineraryHref)}><UiText en="Open Inquiry" zh="打开询价" /></Link>
    </section>}

    <section className="itinerary-overview-strip">
      <div><span><UiText en="Route" zh="路线" /></span><b>{qd.departureCity||"—"} → {data.destination||"—"}</b></div>
      <div><span><UiText en="Travel" zh="行程日期" /></span><b>{qd.travelStartDate||"—"}{qd.travelEndDate?" → "+qd.travelEndDate:""} · {data.days_count}D{data.nights_count}N</b></div>
      <div><span><UiText en="Pax" zh="人数" /></span><b>{qd.pax||"—"}</b></div>
      <div><span><UiText en="Customer" zh="客户" /></span><b>{data.customer_name||"—"}</b></div>
      <div><span>OP</span><b>{data.owner_name||"—"}</b></div>
      <div><span><UiText en="Tour Type" zh="团型" /></span><b>{qd.tourType||"—"}</b></div>
    </section>

    {flights.length>0&&<section className="panel">
      <div className="panel-head"><h2><UiText en="Suggested Flights" zh="建议航班" /></h2></div>
      <div className="table-wrap"><table className="itinerary-flight-table">
        <thead><tr><th><UiText en="Route" zh="路线" /></th><th><UiText en="Flight No." zh="航班号" /></th><th><UiText en="Date" zh="日期" /></th><th><UiText en="Departure" zh="起飞" /></th><th><UiText en="Arrival" zh="抵达" /></th><th><UiText en="Remarks" zh="备注" /></th></tr></thead>
        <tbody>{flights.map((f:any,index:number)=><tr key={f.id||index}>
          <td><strong>{f.from||"—"} → {f.to||"—"}</strong></td>
          <td>{f.flightNo||"—"}</td>
          <td>{f.date||"—"}</td>
          <td>{f.departureTime||"—"}</td>
          <td>{f.arrivalTime||"—"}</td>
          <td>{f.remarks||"—"}</td>
        </tr>)}</tbody>
      </table></div>
    </section>}

    {hotels.length>0&&<section className="panel">
      <div className="panel-head"><h2><UiText en="Hotel Introduction" zh="酒店介绍" /></h2></div>
      <div className="itinerary-hotel-detail-list">
        {hotels.map((hotel:any,index:number)=><article className="itinerary-hotel-detail-card" key={hotel.id||index}>
          <div className="itinerary-hotel-detail-head">
            <div><span><UiText en="HOTEL" zh="酒店" /> {String(index+1).padStart(2,"0")}</span><h3>{hotel.name||<UiText en="Untitled Hotel" zh="未命名酒店" />}</h3></div>
            <strong>{hotel.starRating||"—"}</strong>
          </div>
          <div className="itinerary-hotel-detail-meta">
            <div><span><UiText en="City / Area" zh="城市 / 地区" /></span><strong>{hotel.cityArea||"—"}</strong></div>
            <div><span><UiText en="Stay Nights" zh="入住晚数" /></span><strong>{hotel.stayNights||"—"}</strong></div>
            <div><span><UiText en="Room Size" zh="房间面积" /></span><strong>{hotel.roomSize!==""&&hotel.roomSize!=null?`${hotel.roomSize} m²`:"—"}</strong></div>
            <div><span><UiText en="Opening Year" zh="开业年份" /></span><strong>{hotel.openingYear||"—"}</strong></div>
            <div><span><UiText en="Renovation Year" zh="装修年份" /></span><strong>{hotel.renovationYear||"—"}</strong></div>
          </div>
          {hotel.nearbyNotes&&<p className="itinerary-hotel-notes">{hotel.nearbyNotes}</p>}
          {Array.isArray(hotel.images)&&hotel.images.length>0&&<div className="itinerary-hotel-detail-images">
            {hotel.images.map((img:any,imgIndex:number)=><img key={img.path||img.url||imgIndex} src={img.url} alt={hotel.name||"Hotel"}/>)}
          </div>}
        </article>)}
      </div>
    </section>}

    {(includedItems.length>0||notIncludedItems.length>0)&&<section className="panel">
      <div className="panel-head"><h2><UiText en="Included / Not Included" zh="配套包含与不包含" /></h2></div>
      <div className="itinerary-package-detail-grid">
        {includedItems.length>0&&<div className="itinerary-package-detail-card included">
          <h3><UiText en="Included" zh="配套包含" /></h3>
          <ul>{includedItems.map((item:any,index:number)=><li key={item.id||index}>{typeof item==="string"?item:(item.name||"—")}</li>)}</ul>
        </div>}
        {notIncludedItems.length>0&&<div className="itinerary-package-detail-card excluded">
          <h3><UiText en="Not Included" zh="配套不包含" /></h3>
          <ul>{notIncludedItems.map((item:any,index:number)=><li key={item.id||index}>{typeof item==="string"?item:(item.name||"—")}</li>)}</ul>
        </div>}
      </div>
    </section>}

    {reminders.length>0&&<section className="panel">
      <div className="panel-head"><h2><UiText en="Friendly Reminder" zh="温馨提醒" /></h2></div>
      <div className="itinerary-reminder-detail-list">
        {reminders.map((item:any,index:number)=><article className="itinerary-reminder-detail-card" key={item.id||index}>
          <div className="itinerary-reminder-detail-no">{String(index+1).padStart(2,"0")}</div>
          <div>
            <h3>{item.title||<UiText en="Reminder" zh="提醒" />}</h3>
            <p>{item.description||"—"}</p>
          </div>
        </article>)}
      </div>
    </section>}

    <section className="panel">
      <div className="panel-head"><h2><UiText en="Daily Itinerary" zh="行程安排" /></h2><span className={"status status-"+data.status}>{data.status==="ready"?<UiText en="Ready" zh="已就绪" />:data.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:data.status==="archived"?<UiText en="Archived" zh="已归档" />:<UiText en="Draft" zh="草稿" />}</span></div>
      <div className="itinerary-detail-list">
        {days.map((day:any,index:number)=><article className="itinerary-detail-day" key={day.id||index}>
          <div className="itinerary-detail-day-no"><span><UiText en="DAY" zh="第" /></span><strong>{String(index+1).padStart(2,"0")}</strong></div>
          <div className="itinerary-detail-day-content">
            <h3>{day.title||<UiText en="Untitled Day" zh="未命名行程日" />}</h3>
            <p>{day.content||"—"}</p>

            <div className="itinerary-detail-meta">
              <div><span><UiText en="Hotel" zh="酒店" /></span><strong>{day.hotel||"—"}</strong></div>
              <div><span><UiText en="Breakfast" zh="早餐" /></span><strong>{day.meals?.breakfast||"—"}</strong></div>
              <div><span><UiText en="Lunch" zh="午餐" /></span><strong>{day.meals?.lunch||"—"}</strong></div>
              <div><span><UiText en="Dinner" zh="晚餐" /></span><strong>{day.meals?.dinner||"—"}</strong></div>
            </div>

            {Array.isArray(day.attractions)&&day.attractions.length>0&&<div className="itinerary-detail-attractions">
              <h4><UiText en="Attractions" zh="景点" /></h4>
              <div className="itinerary-detail-attraction-grid">
                {day.attractions.map((a:any,aIndex:number)=>{
                  const images=Array.isArray(a.images)?a.images:(a.imageUrl?[{url:a.imageUrl}]:[]);
                  return <div className="itinerary-detail-attraction" key={a.id||aIndex}>
                    {images.length>0&&<div className="itinerary-detail-attraction-images">
                      {images.map((img:any,imgIndex:number)=><img key={img.path||img.url||imgIndex} src={img.url} alt={a.name||"Attraction"}/>)}
                    </div>}
                    <strong>{a.name||`Attraction ${aIndex+1}`}</strong>
                  </div>;
                })}
              </div>
            </div>}
          </div>
        </article>)}
        {!days.length&&<div className="empty"><UiText en="No itinerary content yet." zh="尚未填写行程内容。" /></div>}
      </div>
    </section>
  </div>;
}

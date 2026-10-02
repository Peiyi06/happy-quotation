import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";
import ItineraryActions from "@/components/ItineraryActions";

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
  const returnLabel=returnTo.startsWith("/inquiries/")?"← Inquiry":"← Back";
  const currentItineraryHref="/itineraries/"+id+"?returnTo="+encodeURIComponent(returnTo);

  return <div className="itinerary-detail-template">
    <div className="page-head itinerary-detail-head">
      <div className="itinerary-detail-title-block">
        <h1>{data.title||data.itinerary_no}</h1>
        <div className="itinerary-detail-meta-line">
          <span>{data.itinerary_no}</span>
          <span className={"status itinerary-header-status status-"+String(data.status||"draft")}>{data.status==="ready"?"Ready":data.status==="confirmed"?"Confirmed":data.status==="archived"?"Archived":"Draft"}</span>
        </div>
      </div>
      <div className="detail-actions">
        <Link className="btn itinerary-back-action" href={returnTo}>{returnLabel}</Link>
        <ItineraryActions id={id}/>
        <Link className="btn" href={"/itineraries/"+id+"/edit"}>Edit Itinerary</Link>
      </div>
    </div>

    {data.source_inquiry_id&&<section className="quote-source-inquiry quote-source-inquiry-detail">
      <div>
        <span>SOURCE INQUIRY｜来源询价</span>
        <strong>{qd.sourceInquiryNo||"Linked Inquiry"}</strong>
        {qd.sourceInquirySnapshot&&<small>{[qd.sourceInquirySnapshot.destination,qd.sourceInquirySnapshot.daysCount&&qd.sourceInquirySnapshot.nightsCount?`${qd.sourceInquirySnapshot.daysCount}D${qd.sourceInquirySnapshot.nightsCount}N`:"",qd.sourceInquirySnapshot.pax?`${qd.sourceInquirySnapshot.pax} Pax`:""].filter(Boolean).join(" · ")}</small>}
      </div>
      <Link className="btn" href={"/inquiries/"+data.source_inquiry_id+"?returnTo="+encodeURIComponent(currentItineraryHref)}>Open Inquiry</Link>
    </section>}

    <section className="itinerary-overview-strip">
      <div><span>Route</span><b>{qd.departureCity||"—"} → {data.destination||"—"}</b></div>
      <div><span>Travel</span><b>{qd.travelStartDate||"—"}{qd.travelEndDate?" → "+qd.travelEndDate:""} · {data.days_count}D{data.nights_count}N</b></div>
      <div><span>Pax</span><b>{qd.pax||"—"}</b></div>
      <div><span>Customer</span><b>{data.customer_name||"—"}</b></div>
      <div><span>OP</span><b>{data.owner_name||"—"}</b></div>
      <div><span>Tour Type</span><b>{qd.tourType||"—"}</b></div>
    </section>

    {flights.length>0&&<section className="panel">
      <div className="panel-head"><h2>Suggested Flights｜建议航班</h2></div>
      <div className="table-wrap"><table className="itinerary-flight-table">
        <thead><tr><th>Route</th><th>Flight No.</th><th>Date</th><th>Departure</th><th>Arrival</th><th>Remarks</th></tr></thead>
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
      <div className="panel-head"><h2>Hotel Introduction｜酒店介绍</h2></div>
      <div className="itinerary-hotel-detail-list">
        {hotels.map((hotel:any,index:number)=><article className="itinerary-hotel-detail-card" key={hotel.id||index}>
          <div className="itinerary-hotel-detail-head">
            <div><span>HOTEL {String(index+1).padStart(2,"0")}</span><h3>{hotel.name||"Untitled Hotel"}</h3></div>
            <strong>{hotel.starRating||"—"}</strong>
          </div>
          <div className="itinerary-hotel-detail-meta">
            <div><span>City / Area</span><strong>{hotel.cityArea||"—"}</strong></div>
            <div><span>Stay Nights</span><strong>{hotel.stayNights||"—"}</strong></div>
            <div><span>Room Size</span><strong>{hotel.roomSize!==""&&hotel.roomSize!=null?`${hotel.roomSize} m²`:"—"}</strong></div>
            <div><span>Opening Year</span><strong>{hotel.openingYear||"—"}</strong></div>
            <div><span>Renovation Year</span><strong>{hotel.renovationYear||"—"}</strong></div>
          </div>
          {hotel.nearbyNotes&&<p className="itinerary-hotel-notes">{hotel.nearbyNotes}</p>}
          {Array.isArray(hotel.images)&&hotel.images.length>0&&<div className="itinerary-hotel-detail-images">
            {hotel.images.map((img:any,imgIndex:number)=><img key={img.path||img.url||imgIndex} src={img.url} alt={hotel.name||"Hotel"}/>)}
          </div>}
        </article>)}
      </div>
    </section>}

    {(includedItems.length>0||notIncludedItems.length>0)&&<section className="panel">
      <div className="panel-head"><h2>Included / Not Included｜配套包含与不包含</h2></div>
      <div className="itinerary-package-detail-grid">
        {includedItems.length>0&&<div className="itinerary-package-detail-card included">
          <h3>Included｜配套包含</h3>
          <ul>{includedItems.map((item:any,index:number)=><li key={item.id||index}>{typeof item==="string"?item:(item.name||"—")}</li>)}</ul>
        </div>}
        {notIncludedItems.length>0&&<div className="itinerary-package-detail-card excluded">
          <h3>Not Included｜配套不包含</h3>
          <ul>{notIncludedItems.map((item:any,index:number)=><li key={item.id||index}>{typeof item==="string"?item:(item.name||"—")}</li>)}</ul>
        </div>}
      </div>
    </section>}

    {reminders.length>0&&<section className="panel">
      <div className="panel-head"><h2>Friendly Reminder｜温馨提醒</h2></div>
      <div className="itinerary-reminder-detail-list">
        {reminders.map((item:any,index:number)=><article className="itinerary-reminder-detail-card" key={item.id||index}>
          <div className="itinerary-reminder-detail-no">{String(index+1).padStart(2,"0")}</div>
          <div>
            <h3>{item.title||"Reminder"}</h3>
            <p>{item.description||"—"}</p>
          </div>
        </article>)}
      </div>
    </section>}

    <section className="panel">
      <div className="panel-head"><h2>行程安排</h2><span className={"status status-"+data.status}>{data.status}</span></div>
      <div className="itinerary-detail-list">
        {days.map((day:any,index:number)=><article className="itinerary-detail-day" key={day.id||index}>
          <div className="itinerary-detail-day-no"><span>DAY</span><strong>{String(index+1).padStart(2,"0")}</strong></div>
          <div className="itinerary-detail-day-content">
            <h3>{day.title||"Untitled Day"}</h3>
            <p>{day.content||"—"}</p>

            <div className="itinerary-detail-meta">
              <div><span>Hotel｜酒店</span><strong>{day.hotel||"—"}</strong></div>
              <div><span>Breakfast｜早餐</span><strong>{day.meals?.breakfast||"—"}</strong></div>
              <div><span>Lunch｜午餐</span><strong>{day.meals?.lunch||"—"}</strong></div>
              <div><span>Dinner｜晚餐</span><strong>{day.meals?.dinner||"—"}</strong></div>
            </div>

            {Array.isArray(day.attractions)&&day.attractions.length>0&&<div className="itinerary-detail-attractions">
              <h4>Attractions｜景点</h4>
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
        {!days.length&&<div className="empty">尚未填写行程内容。</div>}
      </div>
    </section>
  </div>;
}

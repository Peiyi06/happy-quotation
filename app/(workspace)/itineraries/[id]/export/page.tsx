import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";
import ItineraryExportToolbar from "@/components/ItineraryExportToolbar";

const text=(value:any)=>String(value??"").trim();
const list=(value:any)=>Array.isArray(value)?value:[];

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

  return <div className="itinerary-export-screen">
    <ItineraryExportToolbar/>
    <main className="itinerary-export-document">
      <section className="itinerary-export-cover">
        <div className="itinerary-export-brand-space" aria-hidden="true"></div>
        <div className="itinerary-export-kicker">HAPPY EXPRESS TRAVEL</div>
        <h1>{data.title||data.destination||"Travel Itinerary"}</h1>
        <p>TRAVEL ITINERARY · 行程确认</p>
        <div className="itinerary-export-gold-line"></div>
        <div className="itinerary-export-overview">
          <div><span>Destination / 目的地</span><strong>{data.destination||"—"}</strong></div>
          <div><span>Travel Date / 旅游日期</span><strong>{qd.travelStartDate||"—"}{qd.travelEndDate?" → "+qd.travelEndDate:""}</strong></div>
          <div><span>Duration / 行程天数</span><strong>{data.days_count}D{data.nights_count}N</strong></div>
          <div><span>Pax / 人数</span><strong>{qd.pax||"—"}</strong></div>
          <div><span>Customer / 客户</span><strong>{data.customer_name||"—"}</strong></div>
          <div><span>Tour Type / 团型</span><strong>{qd.tourType||"—"}</strong></div>
        </div>
      </section>

      {flights.length>0&&<section className="itinerary-export-section">
        <div className="itinerary-export-section-head"><span>01</span><div><h2>Flight Information</h2><p>航班资料</p></div></div>
        <div className="itinerary-export-table-wrap"><table>
          <thead><tr><th>Route / 路线</th><th>Flight / 航班</th><th>Date / 日期</th><th>Departure / 起飞</th><th>Arrival / 抵达</th><th>Remarks / 备注</th></tr></thead>
          <tbody>{flights.map((f:any,i:number)=><tr key={f.id||i}><td><b>{f.from||"—"} → {f.to||"—"}</b></td><td>{f.flightNo||"—"}</td><td>{f.date||"—"}</td><td>{f.departureTime||"—"}</td><td>{f.arrivalTime||"—"}</td><td>{f.remarks||"—"}</td></tr>)}</tbody>
        </table></div>
      </section>}

      <section className="itinerary-export-section">
        <div className="itinerary-export-section-head"><span>{flights.length?"02":"01"}</span><div><h2>Daily Itinerary</h2><p>每日行程</p></div></div>
        <div className="itinerary-export-days">
          {days.map((day:any,index:number)=>{
            const attractions=list(day?.attractions);
            return <article className="itinerary-export-day" key={day?.id||index}>
              <div className="itinerary-export-day-head"><div><small>DAY {String(index+1).padStart(2,"0")}</small><h3>{day?.title||`Day ${index+1}`}</h3></div><strong>{day?.hotel||""}</strong></div>
              {text(day?.content)&&<p className="itinerary-export-day-copy">{day.content}</p>}
              {(text(day?.meals?.breakfast)||text(day?.meals?.lunch)||text(day?.meals?.dinner))&&<div className="itinerary-export-meals">
                <span><b>Breakfast</b>{day?.meals?.breakfast||"—"}</span>
                <span><b>Lunch</b>{day?.meals?.lunch||"—"}</span>
                <span><b>Dinner</b>{day?.meals?.dinner||"—"}</span>
              </div>}
              {attractions.length>0&&<div className="itinerary-export-attractions">
                {attractions.map((a:any,ai:number)=>{
                  const images=list(a?.images).filter((img:any)=>text(img?.url)).slice(0,3);
                  return <div className="itinerary-export-attraction" key={a?.id||ai}>
                    {images.length>0&&<div className={"itinerary-export-attraction-images count-"+images.length}>{images.map((img:any,ii:number)=><img key={img?.path||img?.url||ii} src={img.url} alt={a?.name||"Attraction"}/>)}</div>}
                    {text(a?.name)&&<strong>{a.name}</strong>}
                  </div>;
                })}
              </div>}
            </article>;
          })}
        </div>
      </section>

      {hotels.length>0&&<section className="itinerary-export-section">
        <div className="itinerary-export-section-head"><span>H</span><div><h2>Hotel Introduction</h2><p>酒店介绍</p></div></div>
        <div className="itinerary-export-hotels">{hotels.map((hotel:any,index:number)=>{
          const images=list(hotel?.images).filter((img:any)=>text(img?.url)).slice(0,3);
          return <article className="itinerary-export-hotel" key={hotel?.id||index}>
            <div className="itinerary-export-hotel-head"><div><small>HOTEL {String(index+1).padStart(2,"0")}</small><h3>{hotel?.name||"Hotel"}</h3></div><strong>{hotel?.starRating||""}</strong></div>
            <div className="itinerary-export-hotel-meta">
              {text(hotel?.cityArea)&&<span><b>Area / 地区</b>{hotel.cityArea}</span>}
              {text(hotel?.stayNights)&&<span><b>Stay / 入住</b>{hotel.stayNights}</span>}
              {hotel?.roomSize!==""&&hotel?.roomSize!=null&&<span><b>Room / 房间</b>{hotel.roomSize} m²</span>}
            </div>
            {text(hotel?.nearbyNotes)&&<p>{hotel.nearbyNotes}</p>}
            {images.length>0&&<div className={"itinerary-export-hotel-images count-"+images.length}>{images.map((img:any,ii:number)=><img key={img?.path||img?.url||ii} src={img.url} alt={hotel?.name||"Hotel"}/>)}</div>}
          </article>;
        })}</div>
      </section>}

      {(included.length>0||excluded.length>0)&&<section className="itinerary-export-section">
        <div className="itinerary-export-section-head"><span>+</span><div><h2>Package Details</h2><p>配套包含与不包含</p></div></div>
        <div className="itinerary-export-package-grid">
          {included.length>0&&<div><h3>Included / 配套包含</h3><ul>{included.map((x:any,i:number)=><li key={x?.id||i}>{typeof x==="string"?x:x?.name}</li>)}</ul></div>}
          {excluded.length>0&&<div><h3>Not Included / 配套不包含</h3><ul>{excluded.map((x:any,i:number)=><li key={x?.id||i}>{typeof x==="string"?x:x?.name}</li>)}</ul></div>}
        </div>
      </section>}

      {reminders.length>0&&<section className="itinerary-export-section">
        <div className="itinerary-export-section-head"><span>!</span><div><h2>Friendly Reminder</h2><p>温馨提醒</p></div></div>
        <div className="itinerary-export-reminders">{reminders.map((x:any,i:number)=><div key={x?.id||i}><strong>{typeof x==="string"?`Reminder ${i+1}`:(x?.title||`Reminder ${i+1}`)}</strong>{typeof x==="string"?<p>{x}</p>:text(x?.description)&&<p>{x.description}</p>}</div>)}</div>
      </section>}

      <footer className="itinerary-export-footer"><span>Happy Express Travel</span><span>{data.itinerary_no||""}</span></footer>
    </main>
  </div>;
}

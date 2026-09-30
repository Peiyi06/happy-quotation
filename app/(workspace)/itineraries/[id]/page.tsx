import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";
import ItineraryActions from "@/components/ItineraryActions";

export default async function ItineraryDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_itinerary",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const days=Array.isArray(data.itinerary_data?.days)?data.itinerary_data.days:[];

  return <div>
    <div className="page-head quote-detail-head">
      <div>
        <span className="page-kicker">ITINERARY DETAIL</span>
        <h1>{data.title||data.itinerary_no}</h1>
        <p>{data.itinerary_no} · {data.status||"draft"}</p>
      </div>
      <div className="detail-actions">
        <Link className="btn" href="/itineraries">← Back</Link>
        <ItineraryActions id={id}/>
        <Link className="btn primary" href={"/itineraries/"+id+"/edit"}>Edit Itinerary</Link>
      </div>
    </div>

    <section className="dashboard-cards itinerary-summary-cards">
      <div className="dash-card"><span>Destination</span><b>{data.destination||"—"}</b></div>
      <div className="dash-card"><span>Duration</span><b>{data.days_count}D{data.nights_count}N</b></div>
      <div className="dash-card"><span>Customer</span><b>{data.customer_name||"—"}</b></div>
      <div className="dash-card"><span>OP</span><b>{data.owner_name||"—"}</b></div>
    </section>

    <section className="panel">
      <div className="panel-head"><h2>行程安排</h2><span className={"status status-"+data.status}>{data.status}</span></div>
      <div className="itinerary-detail-list">
        {days.map((day:any,index:number)=><article className="itinerary-detail-day" key={day.id||index}>
          <div className="itinerary-detail-day-no"><span>DAY</span><strong>{String(index+1).padStart(2,"0")}</strong></div>
          <div className="itinerary-detail-day-content">
            <h3>{day.title||"Untitled Day"}</h3>
            <p>{day.content||"—"}</p>
          </div>
        </article>)}
        {!days.length&&<div className="empty">尚未填写行程内容。</div>}
      </div>
    </section>
  </div>;
}

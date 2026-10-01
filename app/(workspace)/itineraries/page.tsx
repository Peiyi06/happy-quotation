import Link from "next/link";
import { internalDb, internalToken } from "@/lib/internalSession";

export default async function ItinerariesPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const sp=await searchParams;
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_itineraries",{p_token:token}):{data:[]};
  let items=Array.isArray(data)?data:[];
  const q=(sp.q||"").toLowerCase();
  if(sp.status) items=items.filter((x:any)=>x.status===sp.status);
  if(q) items=items.filter((x:any)=>[x.itinerary_no,x.title,x.destination,x.customer_name].some((v:any)=>(v||"").toLowerCase().includes(q)));

  return <div>
    <div className="page-head page-compact-header">
      <div><span className="page-kicker">ITINERARY TEMPLATES</span><h1>行程模板</h1><p>独立建立与管理简易行程。</p></div>
      <Link className="btn primary" href="/itineraries/new">+ New Itinerary</Link>
    </div>

    <form className="filter-bar">
      <input name="q" defaultValue={sp.q||""} placeholder="Search itinerary / destination / customer"/>
      <select name="status" defaultValue={sp.status||""}><option value="">All Status</option><option value="draft">Draft</option><option value="ready">Ready</option><option value="confirmed">Confirmed</option><option value="archived">Archived</option></select>
      <button className="btn">Filter</button>
    </form>

    <section className="panel">
      <div className="data-table-wrap">
        <table className="data-table itinerary-table">
          <thead><tr><th>Itinerary No</th><th>Title</th><th>Destination</th><th>Duration</th><th>Customer</th><th>OP</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {items.map((x:any)=><tr key={x.id}>
              <td><Link href={"/itineraries/"+x.id}>{x.itinerary_no}</Link></td>
              <td><strong>{x.title||"Untitled Itinerary"}</strong></td>
              <td>{x.destination||"—"}</td>
              <td>{x.days_count}D{x.nights_count}N</td>
              <td>{x.customer_name||"—"}</td>
              <td>{x.owner_name||"—"}</td>
              <td><span className={"status status-"+x.status}>{x.status}</span></td>
              <td>{x.updated_at?new Date(x.updated_at).toLocaleDateString("en-MY"):"—"}</td>
            </tr>)}
            {!items.length&&<tr><td colSpan={8} className="empty">还没有行程模板。</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

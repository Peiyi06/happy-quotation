import Link from "next/link";
import { internalDb, internalToken } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";
import ItineraryFilters from "@/components/ItineraryFilters";

export default async function ItinerariesPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const sp=await searchParams;
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_itineraries",{p_token:token}):{data:[]};
  let items=Array.isArray(data)?data:[];
  const q=(sp.q||"").toLowerCase();
  if(sp.status) items=items.filter((x:any)=>x.status===sp.status);
  if(q) items=items.filter((x:any)=>[x.itinerary_no,x.title,x.destination,x.customer_name].some((v:any)=>(v||"").toLowerCase().includes(q)));

  return <div className="itinerary-library-template">
    <div className="page-head itinerary-library-head">
      <div className="itinerary-library-title-block">
        <h1><UiText en="Itinerary" zh="行程" /></h1>
        <p>{items.length} <UiText en={items.length===1?"itinerary":"itineraries"} zh="份行程" /></p>
      </div>
      <Link className="btn primary" href="/itineraries/new"><UiText en="+ New Itinerary" zh="+ 新建行程" /></Link>
    </div>

    <ItineraryFilters q={sp.q||""} status={sp.status||""}/>

    <section className="panel">
      <div className="data-table-wrap">
        <table className="data-table itinerary-table">
          <thead><tr><th><UiText en="Itinerary No" zh="行程编号" /></th><th><UiText en="Title" zh="标题" /></th><th><UiText en="Destination" zh="目的地" /></th><th><UiText en="Duration" zh="天数" /></th><th><UiText en="Customer" zh="客户" /></th><th>OP</th><th><UiText en="Status" zh="状态" /></th><th><UiText en="Updated" zh="更新时间" /></th></tr></thead>
          <tbody>
            {items.map((x:any)=><tr key={x.id}>
              <td><Link href={"/itineraries/"+x.id}>{x.itinerary_no}</Link></td>
              <td><strong>{x.title||<UiText en="Untitled Itinerary" zh="未命名行程" />}</strong></td>
              <td>{x.destination||"—"}</td>
              <td>{x.days_count}D{x.nights_count}N</td>
              <td>{x.customer_name||"—"}</td>
              <td>{x.owner_name||"—"}</td>
              <td><span className={"status status-"+x.status}>{x.status==="ready"?<UiText en="Ready" zh="已就绪" />:x.status==="confirmed"?<UiText en="Confirmed" zh="已确认" />:x.status==="archived"?<UiText en="Archived" zh="已归档" />:<UiText en="Draft" zh="草稿" />}</span></td>
              <td>{x.updated_at?new Date(x.updated_at).toLocaleDateString("en-MY"):"—"}</td>
            </tr>)}
            {!items.length&&<tr><td colSpan={8} className="empty"><UiText en="No itineraries yet." zh="还没有行程。" /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

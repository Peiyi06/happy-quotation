import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n||0).replace("MYR","RM");

export default async function QuotationsPage({ searchParams }:{searchParams:Promise<Record<string,string|undefined>>}) {
  const sp = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("quotations")
    .select("id,quotation_no,title,destination,business_type,customer_name,pax,status,selling_price,margin,updated_at,tour_groups(name),profiles(full_name)")
    .order("updated_at",{ascending:false});

  if (sp.status) query = query.eq("status",sp.status);
  if (sp.destination) query = query.ilike("destination",`%${sp.destination}%`);
  if (sp.q) query = query.or(`quotation_no.ilike.%${sp.q}%,title.ilike.%${sp.q}%,customer_name.ilike.%${sp.q}%`);

  const { data: quotes=[] } = await query;

  return <div>
    <div className="page-head">
      <div><span className="page-kicker">QUOTATIONS</span><h1>Quotation Library</h1><p>按团型、目的地、客户和状态管理历史报价。</p></div>
      <Link className="btn primary" href="/quotations/new">＋ New Quotation</Link>
    </div>

    <form className="filter-bar">
      <input name="q" defaultValue={sp.q||""} placeholder="Search quote / tour / customer" />
      <input name="destination" defaultValue={sp.destination||""} placeholder="Destination" />
      <select name="status" defaultValue={sp.status||""}>
        <option value="">All Status</option><option value="draft">Draft</option><option value="ready">Ready</option><option value="sent">Sent</option><option value="revised">Revised</option><option value="confirmed">Confirmed</option><option value="lost">Lost</option><option value="archived">Archived</option>
      </select>
      <button className="btn">Filter</button>
    </form>

    <section className="panel">
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Quote No</th><th>Tour</th><th>Group</th><th>Customer</th><th>Pax</th><th>Status</th><th>Selling</th><th>Margin</th><th>Updated</th></tr></thead><tbody>
        {(quotes||[]).map((q:any)=><tr key={q.id}><td><Link href={"/quotations/"+q.id}>{q.quotation_no}</Link></td><td><strong>{q.title}</strong><small>{q.destination||""}</small></td><td>{q.tour_groups?.name||"Unclassified"}</td><td>{q.customer_name||"—"}</td><td>{q.pax}</td><td><span className={"status status-"+q.status}>{q.status}</span></td><td>{money(Number(q.selling_price))}</td><td>{(Number(q.margin)*100).toFixed(1)}%</td><td>{new Date(q.updated_at).toLocaleDateString("en-MY")}</td></tr>)}
        {!quotes?.length && <tr><td colSpan={9} className="empty">没有符合条件的报价。</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}

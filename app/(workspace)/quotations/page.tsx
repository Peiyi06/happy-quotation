import Link from "next/link";
import { internalDb, internalToken } from "@/lib/internalSession";
import QuotationRowActions from "@/components/QuotationRowActions";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n||0).replace("MYR","RM");

export default async function QuotationsPage({ searchParams }:{searchParams:Promise<Record<string,string|undefined>>}) {
  const sp=await searchParams;
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_quotes",{p_token:token}):{data:[]};
  let quotes=Array.isArray(data)?data:[];

  const q=(sp.q||"").toLowerCase();
  const destination=(sp.destination||"").toLowerCase();
  if(sp.status) quotes=quotes.filter((x:any)=>x.status===sp.status);
  if(destination) quotes=quotes.filter((x:any)=>(x.destination||"").toLowerCase().includes(destination));
  if(q) quotes=quotes.filter((x:any)=>[x.quotation_no,x.title,x.customer_name].some((v:any)=>(v||"").toLowerCase().includes(q)));

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
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Quote No</th><th>Tour</th><th>Group</th><th>Customer</th><th>Pax</th><th>Status</th><th>Selling</th><th>Margin</th><th>Updated</th><th>Action</th></tr></thead><tbody>
        {quotes.map((x:any)=><tr key={x.id}><td><Link href={"/quotations/"+x.id}>{x.quotation_no}</Link></td><td><strong>{x.title}</strong><small>{x.destination||""}</small></td><td>{x.tour_group_name||"Unclassified"}</td><td>{x.customer_name||"—"}</td><td>{x.pax}</td><td><span className={"status status-"+x.status}>{x.status}</span></td><td>{money(Number(x.selling_price))}</td><td>{(Number(x.margin)*100).toFixed(1)}%</td><td>{new Date(x.updated_at).toLocaleDateString("en-MY")}</td><td><QuotationRowActions id={x.id}/></td></tr>)}
        {!quotes.length&&<tr><td colSpan={10} className="empty">没有符合条件的报价。</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}

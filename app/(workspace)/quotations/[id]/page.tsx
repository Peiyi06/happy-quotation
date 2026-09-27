import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";

const money=(n:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR",minimumFractionDigits:2}).format(n||0).replace("MYR","RM");

export default async function QuotationDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_quote",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  const margin=Number(data.margin||0);
  return <div>
    <div className="page-head quote-detail-head">
      <div>
        <span className="page-kicker">QUOTATION DETAIL</span>
        <h1>{data.title||data.quotation_no}</h1>
        <p>{data.quotation_no} · {data.status||"draft"}</p>
      </div>
      <div className="detail-actions">
        <Link className="btn" href="/quotations">← Back</Link>
        <Link className="btn primary" href={"/quotations/"+id+"/edit"}>Edit Quotation</Link>
      </div>
    </div>

    <section className="quote-result-hero">
      <span>Final Selling Price</span>
      <strong>{money(Number(data.selling_price))}</strong>
      <small>最终对客报价</small>
    </section>

    <section className="dashboard-cards quote-detail-cards">
      <div className="dash-card"><span>Total Cost</span><b>{money(Number(data.total_cost))}</b></div>
      <div className="dash-card"><span>Profit</span><b>{money(Number(data.profit))}</b></div>
      <div className="dash-card"><span>Margin</span><b>{(margin*100).toFixed(1)}%</b></div>
      <div className="dash-card"><span>Pax</span><b>{data.pax||0}</b></div>
    </section>

    <section className="panel">
      <div className="panel-head"><h2>Quotation Information</h2></div>
      <div className="detail-grid">
        <Detail label="Customer" value={data.customer_name||"—"}/>
        <Detail label="Destination" value={data.destination||"—"}/>
        <Detail label="Business Type" value={data.business_type||"—"}/>
        <Detail label="Tour Code" value={data.tour_code||"—"}/>
        <Detail label="Supplier" value={data.supplier||"—"}/>
        <Detail label="Status" value={data.status||"draft"}/>
        <Detail label="Updated" value={data.updated_at?new Date(data.updated_at).toLocaleString("en-MY"):"—"}/>
      </div>
    </section>
  </div>;
}

function Detail({label,value}:{label:string;value:any}){
  return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>;
}

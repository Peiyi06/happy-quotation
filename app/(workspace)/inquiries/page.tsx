import Link from "next/link";
import { internalDb, internalToken } from "@/lib/internalSession";

export default async function InquiryListPage(){
  const token=await internalToken();
  const db=internalDb();
  const {data}=token?await db.rpc("staff_list_inquiries",{p_token:token}):{data:[] as any[]};
  const items=Array.isArray(data)?data:[];
  return <div>
    <div className="page-head">
      <div><span className="page-kicker">INQUIRY PIPELINE</span><h1>Inquiries</h1><p>Sales → Operation → Itinerary / Quotation 的案件主档案。</p></div>
      <div className="detail-actions"><Link className="btn primary" href="/inquiries/new">+ New Inquiry</Link></div>
    </div>
    <section className="panel">
      <div className="table-wrap"><table>
        <thead><tr><th>Inquiry No.</th><th>Customer</th><th>Destination</th><th>Travel Date</th><th>Pax</th><th>Sales</th><th>Operation</th><th>Status</th><th></th></tr></thead>
        <tbody>{items.map((i:any)=><tr key={i.id}>
          <td><strong>{i.inquiry_no}</strong></td><td>{i.customer_name||"—"}</td><td>{i.destination||"—"}</td>
          <td>{i.travel_start_date||"—"}{i.travel_end_date?" → "+i.travel_end_date:""}</td><td>{i.pax||"—"}</td>
          <td>{i.sales_owner_name||"—"}</td><td>{i.operation_assignee_name||"—"}</td><td><span className={"status status-"+i.status}>{i.status}</span></td>
          <td><Link className="btn" href={"/inquiries/"+i.id}>Open</Link></td>
        </tr>)}</tbody>
      </table></div>
      {!items.length&&<div className="empty">目前还没有 Inquiry。</div>}
    </section>
  </div>;
}

import Link from "next/link";
import { internalDb, internalToken } from "@/lib/internalSession";

const inquiryStatusLabels:Record<string,string>={
  new:"New",
  in_progress:"In Progress",
  waiting_quote:"Waiting Quote",
  ready_customer:"Ready for Customer",
  closed:"Closed"
};

export default async function InquiryListPage(){
  const token=await internalToken();
  const db=internalDb();
  const response=token?await db.rpc("staff_list_inquiries",{p_token:token}):{data:[] as any[],error:null};
  const data=response.data;
  const error=response.error;
  const items=Array.isArray(data)?data:[];
  return <div>
    <div className="page-head">
      <div><span className="page-kicker">INQUIRY PIPELINE</span><h1>Inquiries</h1><p>Sales → Operation → Itinerary / Quotation 的案件主档案。</p></div>
      <div className="detail-actions"><Link className="btn primary" href="/inquiries/new">+ New Inquiry</Link></div>
    </div>
    <section className="panel">
      {error&&<div className="save-message">Unable to load inquiries: {error.message}</div>}
      <div className="data-table-wrap"><table className="data-table">
        <thead><tr><th>Inquiry No.</th><th>Customer</th><th>Destination</th><th>Travel Date</th><th>Pax</th><th>Sales</th><th>Operation</th><th>Status</th></tr></thead>
        <tbody>{items.map((i:any)=><tr key={i.id}>
          <td><Link href={"/inquiries/"+i.id}>{i.inquiry_no}</Link></td><td>{i.customer_name||"—"}</td><td>{i.destination||"—"}</td>
          <td>{i.travel_start_date||"—"}{i.travel_end_date?" → "+i.travel_end_date:""}</td><td>{i.pax||"—"}</td>
          <td>{i.sales_owner_name||"—"}</td><td>{i.operation_assignee_name||"—"}</td><td><span className={"status status-"+i.status}>{inquiryStatusLabels[i.status]||i.status}</span></td>
        </tr>)}</tbody>
      </table></div>
      {!items.length&&<div className="empty">目前还没有 Inquiry。</div>}
    </section>
  </div>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";

export default async function InquiryDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();

  return <div>
    <div className="page-head">
      <div><span className="page-kicker">INQUIRY DETAIL</span><h1>{data.customer_name||data.inquiry_no}</h1><p>{data.inquiry_no} · {data.status}</p></div>
      <div className="detail-actions"><Link className="btn" href="/inquiries">← Back</Link><Link className="btn primary" href={"/inquiries/"+id+"/edit"}>Edit Inquiry</Link></div>
    </div>

    <section className="dashboard-cards itinerary-summary-cards">
      <div className="dash-card"><span>Destination</span><b>{data.destination||"—"}</b></div>
      <div className="dash-card"><span>Travel Dates</span><b>{data.travel_start_date||"—"}{data.travel_end_date?" → "+data.travel_end_date:""}</b></div>
      <div className="dash-card"><span>Duration</span><b>{data.days_count}D{data.nights_count}N</b></div>
      <div className="dash-card"><span>Pax</span><b>{data.pax||"—"}</b></div>
      <div className="dash-card"><span>Sales Owner</span><b>{data.sales_owner_name||"—"}</b></div>
      <div className="dash-card"><span>Operation</span><b>{data.operation_assignee_name||"—"}</b></div>
    </section>

    <section className="panel">
      <div className="panel-head"><h2>Customer Requirements｜客户需求</h2></div>
      <div className="inquiry-detail-grid">
        <div><span>Contact</span><strong>{data.contact||"—"}</strong></div>
        <div><span>Departure City</span><strong>{data.departure_city||"—"}</strong></div>
        <div><span>Budget</span><strong>{data.budget||"—"}</strong></div>
        <div><span>Tour Type</span><strong>{data.tour_type||"—"}</strong></div>
        <div><span>Flight Requirement</span><p>{data.flight_requirement||"—"}</p></div>
        <div><span>Hotel Requirement</span><p>{data.hotel_requirement||"—"}</p></div>
        <div><span>Meal Requirement</span><p>{data.meal_requirement||"—"}</p></div>
        <div><span>Special Request</span><p>{data.special_request||"—"}</p></div>
      </div>
    </section>

    <section className="panel inquiry-next-actions">
      <div className="panel-head"><div><h2>Next Step｜下一步</h2><p className="panel-subtext">第一阶段先建立案件母档案；下一阶段会把这些入口正式关联到同一个 Inquiry。</p></div></div>
      <div className="inquiry-flow-actions">
        <div><strong>Create Itinerary</strong><span>从 Inquiry 自动带入客户基本资料</span><button className="btn" disabled>Coming next</button></div>
        <div><strong>AI Supplier Import</strong><span>Operation 上传供应商行程并生成 Draft</span><Link className="btn" href="/ai-import">Open AI Import</Link></div>
        <div><strong>Quotation</strong><span>成本、利润与 Selling Price</span><button className="btn" disabled>Coming next</button></div>
      </div>
    </section>
  </div>;
}

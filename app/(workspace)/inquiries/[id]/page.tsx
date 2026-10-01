import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import InquiryWorkflowAction from "@/components/InquiryWorkflowAction";

export default async function InquiryDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const user=await internalUser();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_inquiry",{p_token:token,p_id:id});
  if(error||!data||!data.id) notFound();
  const {data:linkedQuoteData}=await db.rpc("staff_list_quotes_for_inquiry",{p_token:token,p_inquiry_id:id});
  const linkedQuotes=Array.isArray(linkedQuoteData)?linkedQuoteData:[];
  const {data:linkedItineraryData}=await db.rpc("staff_list_itineraries_for_inquiry",{p_token:token,p_inquiry_id:id});
  const linkedItineraries=Array.isArray(linkedItineraryData)?linkedItineraryData:[];

  return <div>
    <div className="page-head inquiry-detail-head">
      <div><span className="page-kicker">INQUIRY DETAIL</span><h1>{data.customer_name||data.inquiry_no}</h1><p>{data.inquiry_no} · {data.status}</p></div>
      <div className="inquiry-head-right">
        <InquiryWorkflowAction
          inquiryId={id}
          supplierStatus={data.supplier_inquiry_status||"draft"}
          canAdvance={Boolean(user&&(user.username==="long"||user.id===data.operation_assignee_id))}
          hasQuotation={linkedQuotes.length>0}
          firstQuotationId={linkedQuotes[0]?.id}
        />
        <div className="detail-actions">
          <Link className="btn" href="/inquiries">← Back</Link>
          <Link className="btn" href={"/inquiries/"+id+"/operation"}>Operation Review</Link>
          <Link className="btn" href={"/inquiries/"+id+"/edit"}>Edit Inquiry</Link>
        </div>
      </div>
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

    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Operation & Supplier｜操作与供应商</h2>
          <p className="panel-subtext">Sales 原始 Inquiry 保留不变；Operation Review 与 Supplier Inquiry Form 使用独立版本。</p>
        </div>
      </div>
      <div className="inquiry-flow-actions">
        <div>
          <strong>Operation Review</strong>
          <span>由 {data.operation_assignee_name||"Operation"} 整理供应商可执行版本。</span>
          <Link className="btn" href={"/inquiries/"+id+"/operation"}>Open Review</Link>
        </div>
        <div>
          <strong>Supplier Inquiry Form</strong>
          <span>Status: {data.supplier_inquiry_status||"draft"}</span>
          <Link className="btn" href={"/inquiries/"+id+"/supplier-form"} target="_blank">Preview / Export</Link>
        </div>
        <div>
          <strong>Outbound Quotation</strong>
          {linkedQuotes.length>0
            ? <>
                <span>{linkedQuotes.length} linked quotation{linkedQuotes.length>1?"s":""} · 建立后会保留与 Inquiry 的来源关联。</span>
                <div className="linked-quotation-list">
                  {linkedQuotes.map((q:any)=><Link key={q.id} className="linked-quotation-item" href={"/quotations/"+q.id}>
                    <span><b>{q.quotation_no}</b><small>{q.owner_name||"—"} · {q.status||"draft"}</small></span>
                    <strong>Open →</strong>
                  </Link>)}
                </div>
              </>
            : <>
                <span>{data.supplier_inquiry_status==="quote_received"?"Supplier quote received. Ready for costing.":"Supplier quote received 后进入成本与售价计算。"}</span>
                {data.supplier_inquiry_status==="quote_received"
                  ? <Link className="btn" href={"/quotations/new?sourceInquiry="+id}>Create Outbound Quotation</Link>
                  : <button className="btn" disabled>Waiting Supplier Quote</button>}
              </>}
        </div>
      </div>
    </section>

    <section className="panel inquiry-next-actions">
      <div className="panel-head"><div><h2>Downstream｜后续流程</h2><p className="panel-subtext">收到供应商报价后，再进入现有 Quotation 与 Itinerary 流程。</p></div></div>
      <div className="inquiry-flow-actions">
        <div>
          <strong>Itinerary</strong>
          {linkedItineraries.length>0
            ? <>
                <span>{linkedItineraries.length} linked itinerary{linkedItineraries.length>1?"s":""} · 已关联当前 Inquiry。</span>
                <div className="linked-quotation-list">
                  {linkedItineraries.map((it:any)=><Link key={it.id} className="linked-quotation-item" href={"/itineraries/"+it.id}>
                    <span><b>{it.itinerary_no} · {it.title||"Itinerary"}</b><small>{it.days_count}D{it.nights_count}N · {it.owner_name||"—"} · {it.status||"draft"}</small></span>
                    <strong>Open →</strong>
                  </Link>)}
                </div>
              </>
            : <>
                <span>从 Inquiry 自动带入客户、日期、人数、团型和推荐航班。</span>
                <Link className="btn" href={"/itineraries/new?sourceInquiry="+id}>Create Itinerary</Link>
              </>}
        </div>
        <div><strong>AI Supplier Import</strong><span>上传供应商行程 + Adjustment Notes，并自动关联当前 Inquiry。</span><Link className="btn" href={"/ai-import?sourceInquiry="+id}>Import Supplier Itinerary</Link></div>
        <div><strong>Customer Proposal</strong><span>Quotation + Itinerary 完成后组合为对客文件</span><button className="btn" disabled>Coming later</button></div>
      </div>
    </section>
  </div>;
}

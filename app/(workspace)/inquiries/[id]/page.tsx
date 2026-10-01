import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import InquiryWorkflowAction from "@/components/InquiryWorkflowAction";

const inquiryStatusLabels:Record<string,string>={
  new:"New",
  in_progress:"In Progress",
  waiting_quote:"In Progress",
  under_review:"Under Review",
  revision_required:"Revision Required",
  ready:"Ready",
  ready_customer:"Ready",
  itinerary_ready:"Itinerary Ready",
  closed:"Closed"
};

const supplierStatusLabels:Record<string,string>={
  draft:"Supplier Draft",
  ready:"Ready to Send",
  waiting_quote:"Waiting Supplier Quote",
  quote_received:"Quote Received"
};

const quotationStatusLabels:Record<string,string>={
  draft:"Draft",
  under_review:"Under Review",
  revision_required:"Revision Required",
  ready:"Ready",
  sent:"Sent",
  revised:"Revised",
  confirmed:"Confirmed",
  lost:"Lost",
  archived:"Archived"
};

const itineraryStatusLabels:Record<string,string>={
  draft:"Draft",
  ready:"Ready",
  confirmed:"Confirmed",
  archived:"Archived"
};

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

  const viewerMode:"sales"|"operation"|"management"=
    user?.role==="manager"||user?.username?.toLowerCase()==="long"
      ?"management"
      :user?.id===data.operation_assignee_id
        ?"operation"
        :"sales";
  const supplierStatus=data.supplier_inquiry_status||"draft";
  const supplierComplete=supplierStatus==="quote_received"||linkedQuotes.length>0;
  const quotationComplete=linkedQuotes.some((q:any)=>q.status==="confirmed");
  const itineraryComplete=linkedItineraries.some((it:any)=>it.status==="confirmed");
  const currentStep=!supplierComplete?"supplier":linkedQuotes.length===0?"quotation":!itineraryComplete?"itinerary":"done";

  return <div>
    <div className="page-head inquiry-detail-head">
      <div><span className="page-kicker">INQUIRY DETAIL</span><h1>{data.customer_name||data.inquiry_no}</h1><p>{data.inquiry_no} · {inquiryStatusLabels[data.status]||data.status}</p></div>
      <div className="inquiry-head-right">
        <InquiryWorkflowAction
          inquiryId={id}
          mainStatus={data.status||"new"}
          supplierStatus={data.supplier_inquiry_status||"draft"}
          canAdvance={Boolean(user&&(user.username==="long"||user.id===data.operation_assignee_id))}
          canUpdateStatus={false}
          hasQuotation={linkedQuotes.length>0}
          viewerMode={viewerMode}
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

    <section className="panel inquiry-workflow-panel">
      <div className="panel-head inquiry-workflow-panel-head">
        <div>
          <span className="page-kicker">WORKFLOW</span>
          <h2>工作流程</h2>
          <p className="panel-subtext">Supplier → Quotation → Itinerary。系统会突出当前下一步。</p>
        </div>
        {currentStep!=="done"&&<span className="workflow-current-label">Current Step</span>}
      </div>

      <div className="simple-workflow-grid">
        <div className={"simple-workflow-card "+(supplierComplete?"complete":currentStep==="supplier"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">01</span>
            <span className="simple-workflow-state">{supplierComplete?"✓ Completed":currentStep==="supplier"?"Current":"Upcoming"}</span>
          </div>
          <div className="simple-workflow-title">
            <h3>Supplier</h3>
            <strong>{supplierStatusLabels[supplierStatus]||"Supplier Draft"}</strong>
          </div>
          <p>整理供应商可执行资料并管理询价状态。</p>
          <div className="simple-workflow-actions">
            <Link className={currentStep==="supplier"?"btn primary":"workflow-text-link"} href={"/inquiries/"+id+"/operation"}>Review Details</Link>
            <Link className="workflow-text-link" href={"/inquiries/"+id+"/supplier-form"} target="_blank">Supplier Form</Link>
          </div>
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(quotationComplete?"complete":currentStep==="quotation"?"current":linkedQuotes.length>0?"active":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">02</span>
            <span className="simple-workflow-state">{quotationComplete?"✓ Completed":currentStep==="quotation"?"Current":linkedQuotes.length>0?"In Progress":"Upcoming"}</span>
          </div>
          <div className="simple-workflow-title">
            <h3>Quotation</h3>
            <strong>{linkedQuotes.length?linkedQuotes.length+" linked":"Not Created"}</strong>
          </div>
          {linkedQuotes.length>0
            ? <div className="workflow-record-list">
                {linkedQuotes.map((q:any)=><Link key={q.id} className="workflow-record-link" href={"/quotations/"+q.id}>
                  <b>{q.quotation_no}</b>
                  <span>{quotationStatusLabels[q.status]||q.status||"Draft"} · {q.owner_name||"—"}</span>
                </Link>)}
              </div>
            : <p>{supplierStatus==="quote_received"?"Supplier quote received. Ready to prepare customer quotation.":"Available after supplier quotation is received."}</p>}
          {linkedQuotes.length===0&&supplierStatus==="quote_received"&&
            <div className="simple-workflow-actions"><Link className="btn primary" href={"/quotations/new?sourceInquiry="+id}>Create Quotation</Link></div>}
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(itineraryComplete?"complete":currentStep==="itinerary"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">03</span>
            <span className="simple-workflow-state">{itineraryComplete?"✓ Completed":currentStep==="itinerary"?"Current":"Upcoming"}</span>
          </div>
          <div className="simple-workflow-title">
            <h3>Itinerary</h3>
            <strong>{linkedItineraries.length?linkedItineraries.length+" linked":"Not Created"}</strong>
          </div>
          {linkedItineraries.length>0
            ? <div className="workflow-record-list">
                {linkedItineraries.map((it:any)=><Link key={it.id} className="workflow-record-link" href={"/itineraries/"+it.id}>
                  <b>{it.itinerary_no}</b>
                  <span>{itineraryStatusLabels[it.status]||it.status||"Draft"} · {it.days_count}D{it.nights_count}N</span>
                </Link>)}
              </div>
            : <p>从 Inquiry 带入客户、日期、人数、团型和推荐航班。</p>}
          <div className="simple-workflow-actions">
            {linkedItineraries.length===0&&<Link className={currentStep==="itinerary"?"btn primary":"workflow-text-link"} href={"/itineraries/new?sourceInquiry="+id}>Create Itinerary</Link>}
            <Link className="workflow-text-link" href={"/ai-import?sourceInquiry="+id}>Import Supplier Itinerary</Link>
          </div>
        </div>
      </div>
    </section>
  </div>;
}

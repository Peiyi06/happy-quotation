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
  const visibleQuotes=viewerMode==="sales"
    ?linkedQuotes.filter((q:any)=>["ready","sent","confirmed"].includes(q.status))
    :linkedQuotes;
  const approvedQuotes=linkedQuotes.filter((q:any)=>["ready","sent","confirmed"].includes(q.status));
  const caseStatus=String(data.status||"new");
  const operationComplete=["under_review","revision_required","ready","ready_customer","itinerary_ready","closed"].includes(caseStatus);
  const quotationReady=["ready","ready_customer","itinerary_ready","closed"].includes(caseStatus);
  const itineraryReady=caseStatus==="itinerary_ready"||linkedItineraries.some((it:any)=>it.status==="confirmed");
  const salesCurrentStep=
    caseStatus==="new"||caseStatus==="in_progress"||caseStatus==="waiting_quote"
      ?"operation"
      :caseStatus==="under_review"||caseStatus==="revision_required"
        ?"quotation"
        :itineraryReady
          ?"done"
          :"itinerary";
  const operationState=caseStatus==="new"?"New":operationComplete?"✓ Completed":"In Progress";
  const quotationState=caseStatus==="under_review"?"Under Review":caseStatus==="revision_required"?"Re-quote":quotationReady?"✓ Completed":"Preparing";
  const itineraryState=itineraryReady?"✓ Completed":salesCurrentStep==="itinerary"?"Current":"Upcoming";

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
          hasQuotation={visibleQuotes.length>0}
          viewerMode={viewerMode}
          firstQuotationId={visibleQuotes[0]?.id}
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
          <p className="panel-subtext">Operation → Quotation → Itinerary。只显示 Sales 需要掌握的案件进度。</p>
        </div>
      </div>

      <div className="simple-workflow-grid">
        <div className={"simple-workflow-card "+(operationComplete?"complete":salesCurrentStep==="operation"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">01</span>
            <span className="simple-workflow-state">{operationState}</span>
          </div>
          <div className="simple-workflow-title">
            <h3>Operation</h3>
            <strong>{data.operation_assignee_name?"Assigned to "+data.operation_assignee_name:"Not Assigned"}</strong>
          </div>
          <p>{caseStatus==="new"
            ?"Inquiry 已提交，等待 Operation 开始处理。"
            :operationComplete
              ?"Operation 前期处理已完成，案件已进入报价阶段。"
              :"Operation 正在整理供应商资料、询价与报价成本。"}</p>
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(quotationReady?"complete":salesCurrentStep==="quotation"?"current":caseStatus==="in_progress"||caseStatus==="waiting_quote"?"active":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">02</span>
            <span className="simple-workflow-state">{quotationState}</span>
          </div>
          <div className="simple-workflow-title">
            <h3>Quotation</h3>
            <strong>{caseStatus==="under_review"
              ?"Waiting Management Approval"
              :caseStatus==="revision_required"
                ?"Quotation Requires Re-check"
                :quotationReady
                  ?"Final Quotation Ready"
                  :"Preparing"}</strong>
          </div>
          {quotationReady&&approvedQuotes.length>0
            ? <div className="workflow-record-list">
                {approvedQuotes.map((q:any)=><Link key={q.id} className="workflow-record-link" href={"/quotations/"+q.id}>
                  <b>{q.quotation_no}</b>
                  <span>{quotationStatusLabels[q.status]||q.status||"Ready"} · {q.owner_name||"—"}</span>
                </Link>)}
              </div>
            : <p>{caseStatus==="under_review"
                ?"Quotation 已提交管理层审核，通过后 Sales 才会看到最终报价。"
                :caseStatus==="revision_required"
                  ?"Quotation 正在重新调整与审核，暂时不要向客户使用旧报价。"
                  :"Operation 正在准备报价；审核通过后会在这里显示最终版本。"}</p>}
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(itineraryReady?"complete":salesCurrentStep==="itinerary"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">03</span>
            <span className="simple-workflow-state">{itineraryState}</span>
          </div>
          <div className="simple-workflow-title">
            <h3>Itinerary</h3>
            <strong>{itineraryReady
              ?"Itinerary Ready"
              :linkedItineraries.length
                ?linkedItineraries.length+" Draft"
                :quotationReady
                  ?"Ready to Create"
                  :"Available After Quotation"}</strong>
          </div>
          {linkedItineraries.length>0
            ? <div className="workflow-record-list">
                {linkedItineraries.map((it:any)=><Link key={it.id} className="workflow-record-link" href={"/itineraries/"+it.id}>
                  <b>{it.itinerary_no}</b>
                  <span>{itineraryStatusLabels[it.status]||it.status||"Draft"} · {it.days_count}D{it.nights_count}N</span>
                </Link>)}
              </div>
            : <p>{quotationReady
                ?"Final Quotation 已准备完成，可以开始制作给客户的 Itinerary。"
                :"Quotation 审核通过后，Sales 才进入 Itinerary 阶段。"}</p>}
          {quotationReady&&!itineraryReady&&<div className="simple-workflow-actions">
            {linkedItineraries.length===0&&<Link className="btn primary" href={"/itineraries/new?sourceInquiry="+id}>Create Itinerary</Link>}
            <Link className="workflow-text-link" href={"/ai-import?sourceInquiry="+id}>Import Supplier Itinerary</Link>
          </div>}
        </div>
      </div>
    </section>
  </div>;
}

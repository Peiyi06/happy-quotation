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

export default async function InquiryDetailPage({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{returnTo?:string}>;
}){
  const {id}=await params;
  const sp=await searchParams;
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
  const rawReturnTo=String(sp.returnTo||"");
  const returnTo=rawReturnTo.startsWith("/")&&!rawReturnTo.startsWith("//")?rawReturnTo:"/inquiries";
  const returnLabel=returnTo.startsWith("/operation")
    ?"← Operation"
    :returnTo.startsWith("/quotations/")
      ?"← Quotation"
      :returnTo.startsWith("/itineraries/")
        ?"← Itinerary"
        :returnTo.startsWith("/ai-lab")
          ?"← AI Workspace"
          :"← Back";
  const returnParam=encodeURIComponent(returnTo);
  const currentInquiryHref="/inquiries/"+id+"?returnTo="+returnParam;
  const currentInquiryParam=encodeURIComponent(currentInquiryHref);

  // Presentation-only comparison between the Sales original inquiry and the
  // separately stored Operation review. This does not alter workflow/status.
  const operationReview=data.operation_review&&typeof data.operation_review==="object"?data.operation_review:{};
  const hasOperationVersion=Object.keys(operationReview).length>0;
  const opValue=(key:string,fallback:any)=>Object.prototype.hasOwnProperty.call(operationReview,key)?operationReview[key]:fallback;
  const displayValue=(value:any)=>value===null||value===undefined||value===""?"—":String(value);
  const salesRequirements=[
    {key:"departureCity",label:"Departure City",sales:data.departure_city,op:opValue("departureCity",data.departure_city)},
    {key:"budget",label:"Budget",sales:data.budget,op:opValue("budget",data.budget)},
    {key:"tourType",label:"Tour Type",sales:data.tour_type,op:opValue("tourType",data.tour_type)},
    {key:"flightRequirement",label:"Flight Requirement",sales:data.flight_requirement,op:opValue("flightRequirement",data.flight_requirement),long:true},
    {key:"hotelRequirement",label:"Hotel Requirement",sales:data.hotel_requirement,op:opValue("hotelRequirement",data.hotel_requirement),long:true},
    {key:"mealRequirement",label:"Meal Requirement",sales:data.meal_requirement,op:opValue("mealRequirement",data.meal_requirement),long:true},
    {key:"specialRequest",label:"Special Request",sales:data.special_request,op:opValue("specialRequest",data.special_request),long:true}
  ];

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
          <Link className="btn" href={returnTo}>{returnLabel}</Link>
          <Link className="btn" href={"/inquiries/"+id+"/operation?returnTo="+returnParam}>Operation Review</Link>
          <Link className="btn" href={"/inquiries/"+id+"/edit?returnTo="+returnParam}>Edit Inquiry</Link>
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

    <section className="panel inquiry-requirements-panel">
      <div className="panel-head">
        <div>
          <h2>Customer Requirements｜客户需求</h2>
          <p className="panel-subtext">
            {hasOperationVersion
              ?"Sales 原始资料与 Operation 执行版本分开显示，方便快速核对差异。"
              :"目前显示 Sales 原始资料；Operation 首次保存 Review 后会自动出现执行版本。"}
          </p>
        </div>
      </div>

      <div className={"inquiry-version-grid "+(hasOperationVersion?"has-operation":"single")}>
        <article className="inquiry-version-card sales-original">
          <div className="inquiry-version-card-head">
            <div>
              <span className="inquiry-version-kicker">SALES ORIGINAL</span>
              <h3>Original Inquiry</h3>
            </div>
            <span className="inquiry-version-badge">Original</span>
          </div>
          <div className="inquiry-version-meta">
            <div><span>Contact</span><strong>{data.contact||"—"}</strong></div>
            <div><span>Sales Owner</span><strong>{data.sales_owner_name||"—"}</strong></div>
          </div>
          <div className="inquiry-version-fields">
            {salesRequirements.map((field:any)=><div className={"inquiry-version-field "+(field.long?"long":"")} key={field.key}>
              <span>{field.label}</span>
              {field.long?<p>{displayValue(field.sales)}</p>:<strong>{displayValue(field.sales)}</strong>}
            </div>)}
          </div>
        </article>

        {hasOperationVersion&&<article className="inquiry-version-card operation-version">
          <div className="inquiry-version-card-head">
            <div>
              <span className="inquiry-version-kicker">OPERATION VERSION</span>
              <h3>Execution Version</h3>
            </div>
            <span className="inquiry-version-badge operation">Updated by OP</span>
          </div>
          <div className="inquiry-version-meta">
            <div><span>Operation</span><strong>{data.operation_assignee_name||"—"}</strong></div>
            <div><span>Purpose</span><strong>Supplier / Execution</strong></div>
          </div>
          <div className="inquiry-version-fields">
            {salesRequirements.map((field:any)=>{
              const changed=displayValue(field.op)!==displayValue(field.sales);
              return <div className={"inquiry-version-field "+(field.long?"long ":"")+(changed?"changed":"same")} key={field.key}>
                <div className="inquiry-version-field-label">
                  <span>{field.label}</span>
                  <em>{changed?"Updated":"Same as Sales"}</em>
                </div>
                {field.long?<p>{displayValue(field.op)}</p>:<strong>{displayValue(field.op)}</strong>}
              </div>;
            })}
            {operationReview.transportRequirement&&<div className="inquiry-version-field long operation-only">
              <div className="inquiry-version-field-label"><span>Transportation Requirement</span><em>OP Only</em></div>
              <p>{displayValue(operationReview.transportRequirement)}</p>
            </div>}
            {operationReview.itineraryRequirement&&<div className="inquiry-version-field long operation-only">
              <div className="inquiry-version-field-label"><span>Itinerary Requirement</span><em>OP Only</em></div>
              <p>{displayValue(operationReview.itineraryRequirement)}</p>
            </div>}
          </div>
        </article>}
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
                {approvedQuotes.map((q:any)=><Link key={q.id} className="workflow-record-link" href={"/quotations/"+q.id+"?returnTo="+currentInquiryParam}>
                  <b>{q.quotation_no}</b>
                  <span>{quotationStatusLabels[q.status]||q.status||"Ready"} · {q.owner_name||"—"}</span>
                </Link>)}
              </div>
            : <p>{caseStatus==="under_review"
                ?"Quotation 已提交管理层审核，通过后 Sales 才会看到最终报价。"
                :caseStatus==="revision_required"
                  ?"Quotation 正在重新调整与审核，暂时不要向客户使用旧报价。"
                  :"Operation 正在准备报价；审核通过后会在这里显示最终版本。"}</p>}

          {viewerMode!=="sales"&&!quotationReady&&<div className="simple-workflow-actions">
            {linkedQuotes.length===0
              ? <Link className="btn primary" href={"/quotations/new?sourceInquiry="+id}>Create Quotation</Link>
              : <Link className="btn primary" href={"/quotations/"+linkedQuotes[0].id+"?returnTo="+currentInquiryParam}>
                  {caseStatus==="revision_required"?"Revise Quotation":"Open Quotation"}
                </Link>}
          </div>}
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
                {linkedItineraries.map((it:any)=><Link key={it.id} className="workflow-record-link" href={"/itineraries/"+it.id+"?returnTo="+currentInquiryParam}>
                  <b>{it.itinerary_no}</b>
                  <span>{itineraryStatusLabels[it.status]||it.status||"Draft"} · {it.days_count}D{it.nights_count}N</span>
                </Link>)}
              </div>
            : <p>{quotationReady
                ?"Final Quotation 已准备完成，可以开始制作给客户的 Itinerary。"
                :"Quotation 审核通过后，Sales 才进入 Itinerary 阶段。"}</p>}
          {quotationReady&&!itineraryReady&&<div className="simple-workflow-actions">
            {linkedItineraries.length===0&&<Link className="btn primary" href={"/itineraries/new?sourceInquiry="+id}>Create Itinerary</Link>}
            <Link className="workflow-text-link" href={"/ai-import?sourceInquiry="+id}>AI Itinerary</Link>
          </div>}
        </div>
      </div>
    </section>
  </div>;
}

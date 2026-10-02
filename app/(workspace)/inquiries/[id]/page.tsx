import Link from "next/link";
import { notFound } from "next/navigation";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";
import InquiryRequirementComparison from "@/components/InquiryRequirementComparison";

const inquiryStatusLabels:Record<string,{en:string;zh:string}>={
  new:{en:"New",zh:"新案件"},
  in_progress:{en:"In Progress",zh:"处理中"},
  waiting_quote:{en:"In Progress",zh:"处理中"},
  under_review:{en:"Under Review",zh:"审核中"},
  revision_required:{en:"Revision Required",zh:"需要修改"},
  ready:{en:"Ready",zh:"已就绪"},
  ready_customer:{en:"Ready",zh:"已就绪"},
  itinerary_ready:{en:"Itinerary Ready",zh:"行程已完成"},
  closed:{en:"Closed",zh:"已关闭"}
};

const supplierStatusLabels:Record<string,string>={
  draft:"Supplier Draft",
  ready:"Ready to Send",
  waiting_quote:"Waiting Supplier Quote",
  quote_received:"Quote Received"
};

const quotationStatusLabels:Record<string,{en:string;zh:string}>={
  draft:{en:"Draft",zh:"草稿"},
  under_review:{en:"Under Review",zh:"审核中"},
  revision_required:{en:"Revision Required",zh:"需要修改"},
  ready:{en:"Ready",zh:"已就绪"},
  sent:{en:"Sent",zh:"已发送"},
  revised:{en:"Revised",zh:"已修改"},
  confirmed:{en:"Confirmed",zh:"已确认"},
  lost:{en:"Lost",zh:"未成交"},
  archived:{en:"Archived",zh:"已归档"}
};

const itineraryStatusLabels:Record<string,{en:string;zh:string}>={
  draft:{en:"Draft",zh:"草稿"},
  ready:{en:"Ready",zh:"已就绪"},
  confirmed:{en:"Confirmed",zh:"已确认"},
  archived:{en:"Archived",zh:"已归档"}
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
  const operationState=caseStatus==="new"?"Current":operationComplete?"✓ Done":"Current";
  const quotationState=caseStatus==="under_review"?"Reviewing":caseStatus==="revision_required"?"Revise":quotationReady?"✓ Done":"Next";
  const itineraryState=itineraryReady?"✓ Done":salesCurrentStep==="itinerary"?"Current":"Next";
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
    {key:"departureCity",en:"Departure City",zh:"出发城市",sales:displayValue(data.departure_city),op:displayValue(opValue("departureCity",data.departure_city))},
    {key:"budget",en:"Budget",zh:"预算",sales:displayValue(data.budget),op:displayValue(opValue("budget",data.budget))},
    {key:"tourType",en:"Tour Type",zh:"团型",sales:displayValue(data.tour_type),op:displayValue(opValue("tourType",data.tour_type))},
    {key:"flightRequirement",en:"Flight Requirement",zh:"航班需求",sales:displayValue(data.flight_requirement),op:displayValue(opValue("flightRequirement",data.flight_requirement)),long:true},
    {key:"hotelRequirement",en:"Hotel Requirement",zh:"酒店需求",sales:displayValue(data.hotel_requirement),op:displayValue(opValue("hotelRequirement",data.hotel_requirement)),long:true},
    {key:"mealRequirement",en:"Meal Requirement",zh:"餐食需求",sales:displayValue(data.meal_requirement),op:displayValue(opValue("mealRequirement",data.meal_requirement)),long:true},
    {key:"specialRequest",en:"Special Request",zh:"特别要求",sales:displayValue(data.special_request),op:displayValue(opValue("specialRequest",data.special_request)),long:true}
  ];

  return <div className="inquiry-detail-template">
    <div className="page-head inquiry-detail-head">
      <div className="inquiry-detail-title-block">
        <h1>{data.customer_name||data.inquiry_no}</h1>
        <div className="inquiry-detail-meta-line">
          <span>{data.inquiry_no}</span>
          <span className={"inquiry-header-status status-"+String(data.status||"new")}>
            {inquiryStatusLabels[data.status]
              ?<UiText en={inquiryStatusLabels[data.status].en} zh={inquiryStatusLabels[data.status].zh} />
              :data.status}
          </span>
        </div>
      </div>
      <div className="inquiry-head-right">
        <div className="detail-actions">
          <Link className="btn inquiry-back-action" href={returnTo}>{returnLabel}</Link>
          <Link className="btn" href={"/inquiries/"+id+"/operation?returnTo="+returnParam}><UiText en="Operation Review" zh="运营审核" /></Link>
          <Link className="btn" href={"/inquiries/"+id+"/edit?returnTo="+returnParam}><UiText en="Edit Inquiry" zh="编辑询价" /></Link>
        </div>
      </div>
    </div>

    <section className="dashboard-cards itinerary-summary-cards inquiry-overview-strip">
      <div className="dash-card"><span><UiText en="Destination" zh="目的地" /></span><b>{data.destination||"—"}</b></div>
      <div className="dash-card"><span><UiText en="Travel" zh="行程日期" /></span><b>{data.travel_start_date||"—"}{data.travel_end_date?" → "+data.travel_end_date:""} · {data.days_count}D{data.nights_count}N</b></div>
      <div className="dash-card"><span><UiText en="Pax" zh="人数" /></span><b>{data.pax||"—"}</b></div>
      <div className="dash-card"><span><UiText en="Sales Owner" zh="销售负责人" /></span><b>{data.sales_owner_name||"—"}</b></div>
      <div className="dash-card"><span><UiText en="Operation" zh="运营负责人" /></span><b>{data.operation_assignee_name||"—"}</b></div>
    </section>

    <section className="panel inquiry-requirements-panel inquiry-plain-section">
      <div className="panel-head">
        <div>
          <h2><UiText en="Customer Requirements" zh="客户需求" /></h2>
        </div>
      </div>

      <InquiryRequirementComparison
        fields={salesRequirements}
        contact={data.contact||"—"}
        salesOwner={data.sales_owner_name||"—"}
        operationAssignee={data.operation_assignee_name||"—"}
        hasOperationVersion={hasOperationVersion}
        transportRequirement={operationReview.transportRequirement||""}
        itineraryRequirement={operationReview.itineraryRequirement||""}
      />
    </section>

    <section className="panel inquiry-workflow-panel inquiry-elevated-section">
      <div className="panel-head inquiry-workflow-panel-head system-workflow-head">
        <div>
          <h2><UiText en="Workflow" zh="工作流程" /></h2>
        </div>
      </div>

      <div className="simple-workflow-grid system-workflow-grid">
        <div className={"simple-workflow-card "+(operationComplete?"complete":salesCurrentStep==="operation"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">01</span>
            <span className="simple-workflow-state"><UiText en={operationState} zh={operationComplete?"✓ 完成":caseStatus==="new"?"当前":"当前"} /></span>
          </div>
          <div className="simple-workflow-title">
            <h3><UiText en="Operation" zh="运营" /></h3>
            <strong>{data.operation_assignee_name||"—"}</strong>
          </div>
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(quotationReady?"complete":salesCurrentStep==="quotation"?"current":caseStatus==="in_progress"||caseStatus==="waiting_quote"?"active":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">02</span>
            <span className="simple-workflow-state"><UiText en={quotationState} zh={caseStatus==="under_review"?"审核中":caseStatus==="revision_required"?"修改":quotationReady?"✓ 完成":"下一步"} /></span>
          </div>
          <div className="simple-workflow-title">
            <h3><UiText en="Quotation" zh="报价" /></h3>
            <strong><UiText
              en={caseStatus==="under_review"?"Waiting for approval":caseStatus==="revision_required"?"Revision required":quotationReady?"Ready":"Preparing"}
              zh={caseStatus==="under_review"?"等待审核":caseStatus==="revision_required"?"需要修改":quotationReady?"已就绪":"准备中"}
            /></strong>
          </div>
          {quotationReady&&approvedQuotes.length>0
            ? <div className="workflow-record-list">
                {approvedQuotes.map((q:any)=><Link key={q.id} className="workflow-record-link" href={"/quotations/"+q.id+"?returnTo="+currentInquiryParam}>
                  <b>{q.quotation_no}</b>
                  <span>{quotationStatusLabels[q.status]
                    ?<><UiText en={quotationStatusLabels[q.status].en} zh={quotationStatusLabels[q.status].zh} /> · {q.owner_name||"—"}</>
                    :q.status||"Ready"}</span>
                </Link>)}
              </div>
            : null}

          {viewerMode!=="sales"&&!quotationReady&&<div className="simple-workflow-actions">
            {linkedQuotes.length===0
              ? <Link className="btn primary" href={"/quotations/new?sourceInquiry="+id}><UiText en="Create Quotation" zh="建立报价" /></Link>
              : <Link className="btn primary" href={"/quotations/"+linkedQuotes[0].id+"?returnTo="+currentInquiryParam}>
                  <UiText en={caseStatus==="revision_required"?"Revise Quotation":"Open Quotation"} zh={caseStatus==="revision_required"?"修改报价":"打开报价"} />
                </Link>}
          </div>}
        </div>

        <div className="simple-workflow-arrow" aria-hidden="true">→</div>

        <div className={"simple-workflow-card "+(itineraryReady?"complete":salesCurrentStep==="itinerary"?"current":"upcoming")}>
          <div className="simple-workflow-card-head">
            <span className="simple-workflow-index">03</span>
            <span className="simple-workflow-state"><UiText en={itineraryState} zh={itineraryReady?"✓ 完成":salesCurrentStep==="itinerary"?"当前":"下一步"} /></span>
          </div>
          <div className="simple-workflow-title">
            <h3><UiText en="Itinerary" zh="行程" /></h3>
            <strong><UiText
              en={itineraryReady?"Ready":linkedItineraries.length?linkedItineraries.length+" Draft":quotationReady?"Ready to create":"Next"}
              zh={itineraryReady?"已完成":linkedItineraries.length?linkedItineraries.length+" 个草稿":quotationReady?"可以建立":"下一步"}
            /></strong>
          </div>
          {linkedItineraries.length>0
            ? <div className="workflow-record-list">
                {linkedItineraries.map((it:any)=><Link key={it.id} className="workflow-record-link" href={"/itineraries/"+it.id+"?returnTo="+currentInquiryParam}>
                  <b>{it.itinerary_no}</b>
                  <span>{itineraryStatusLabels[it.status]
                    ?<><UiText en={itineraryStatusLabels[it.status].en} zh={itineraryStatusLabels[it.status].zh} /> · {it.days_count}D{it.nights_count}N</>
                    :it.status||"Draft"}</span>
                </Link>)}
              </div>
            : null}
          {quotationReady&&!itineraryReady&&<div className="simple-workflow-actions">
            {linkedItineraries.length===0&&<Link className="btn primary" href={"/itineraries/new?sourceInquiry="+id}><UiText en="Create Itinerary" zh="建立行程" /></Link>}
            <Link className="workflow-text-link" href={"/ai-import?sourceInquiry="+id}><UiText en="AI Itinerary" zh="AI 行程" /></Link>
          </div>}
        </div>
      </div>
    </section>
  </div>;
}

function mainLabel(status:string,viewerMode:"sales"|"operation"|"management"){
  if(status==="new") return "New";
  if(status==="in_progress"||status==="waiting_quote") return "In Progress";
  if(status==="under_review") return "Under Review";
  if(status==="revision_required") return viewerMode==="sales"?"Re-quote":"Revision Required";
  if(status==="ready"||status==="ready_customer") return "Ready";
  if(status==="itinerary_ready") return "Itinerary Ready";
  if(status==="closed") return "Closed";
  return status||"New";
}

function statusClass(status:string){
  if(status==="waiting_quote") return "in_progress";
  if(status==="ready_customer"||status==="itinerary_ready") return "ready";
  return status||"new";
}

export default function InquiryWorkflowAction({
  mainStatus,
  viewerMode="sales"
}:{
  inquiryId?:string;
  mainStatus:string;
  supplierStatus?:string;
  canAdvance?:boolean;
  canUpdateStatus?:boolean;
  hasQuotation?:boolean;
  firstQuotationId?:string;
  viewerMode?:"sales"|"operation"|"management";
}){
  return <aside className={"inquiry-workflow-box inquiry-status-card status-card-"+statusClass(mainStatus)}>
    <span className="inquiry-status-card-label">CURRENT STATUS</span>
    <strong className={"inquiry-status-card-value status status-"+statusClass(mainStatus)}>
      {mainLabel(mainStatus,viewerMode)}
    </strong>
  </aside>;
}

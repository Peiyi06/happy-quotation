import {UiText} from "@/components/WorkspaceLanguage";

function mainLabel(status:string,viewerMode:"sales"|"operation"|"management"){
  if(status==="new") return {en:"New",zh:"新案件"};
  if(status==="in_progress"||status==="waiting_quote") return {en:"In Progress",zh:"处理中"};
  if(status==="under_review") return {en:"Under Review",zh:"审核中"};
  if(status==="revision_required") return viewerMode==="sales"?{en:"Re-quote",zh:"重新报价"}:{en:"Revision Required",zh:"需要修改"};
  if(status==="ready"||status==="ready_customer") return {en:"Ready",zh:"已就绪"};
  if(status==="itinerary_ready") return {en:"Itinerary Ready",zh:"行程已完成"};
  if(status==="closed") return {en:"Closed",zh:"已关闭"};
  return {en:status||"New",zh:status||"新案件"};
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
    <span className="inquiry-status-card-label"><UiText en="CURRENT STATUS" zh="当前状态" /></span>
    <strong className={"inquiry-status-card-value status status-"+statusClass(mainStatus)}>
      <UiText en={mainLabel(mainStatus,viewerMode).en} zh={mainLabel(mainStatus,viewerMode).zh} />
    </strong>
  </aside>;
}

import Link from "next/link";
import { internalDb, internalToken, internalUser } from "@/lib/internalSession";
import {UiText} from "@/components/WorkspaceLanguage";

const baseStatusLabels:Record<string,{en:string;zh:string}>={
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

export default async function InquiryListPage(){
  const token=await internalToken();
  const user=await internalUser();
  const db=internalDb();
  const response=token?await db.rpc("staff_list_inquiries",{p_token:token}):{data:[] as any[],error:null};
  const data=response.data;
  const error=response.error;
  const items=Array.isArray(data)?data:[];
  return <div className="inquiry-list-page">
    <div className="page-head inquiry-list-header">
      <div className="inquiry-list-title"><span className="page-kicker"><UiText en="INQUIRY" zh="询价" /></span><h1><UiText en="Inquiries" zh="询价案件" /></h1><p><UiText en="Track customer requests, ownership and progress in one place." zh="集中查看客户需求、负责人以及案件进度。" /></p></div>
      <div className="detail-actions"><Link className="btn primary" href="/inquiries/new">+ <UiText en="New Inquiry" zh="新建询价" /></Link></div>
    </div>
    <section className="panel inquiry-list-panel">
      <div className="inquiry-list-toolbar"><div><strong><UiText en="All Inquiries" zh="全部询价" /></strong><span>{items.length} <UiText en="cases" zh="个案件" /></span></div></div>
      {error&&<div className="save-message">Unable to load inquiries: {error.message}</div>}
      <div className="data-table-wrap inquiry-list-table-wrap"><table className="data-table inquiry-list-table">
        <thead><tr>
          <th><UiText en="Inquiry No." zh="询价编号" /></th>
          <th><UiText en="Customer" zh="客户" /></th>
          <th><UiText en="Destination" zh="目的地" /></th>
          <th><UiText en="Travel Date" zh="旅游日期" /></th>
          <th><UiText en="Pax" zh="人数" /></th>
          <th><UiText en="Sales" zh="销售" /></th>
          <th><UiText en="Operation" zh="运营" /></th>
          <th><UiText en="Status" zh="状态" /></th>
        </tr></thead>
        <tbody>{items.map((i:any)=><tr key={i.id}>
          <td><Link href={"/inquiries/"+i.id}>{i.inquiry_no}</Link></td><td>{i.customer_name||"—"}</td><td>{i.destination||"—"}</td>
          <td>{i.travel_start_date||"—"}{i.travel_end_date?" → "+i.travel_end_date:""}</td><td>{i.pax||"—"}</td>
          <td>{i.sales_owner_name||"—"}</td><td>{i.operation_assignee_name||"—"}</td><td><span className={"status status-"+i.status}>{i.status==="revision_required"&&user?.role!=="manager"
              ?<UiText en="Re-quote" zh="重新报价" />
              :baseStatusLabels[i.status]
                ?<UiText en={baseStatusLabels[i.status].en} zh={baseStatusLabels[i.status].zh} />
                :i.status}</span></td>
        </tr>)}</tbody>
      </table></div>
      {!items.length&&<div className="empty"><UiText en="No inquiries yet." zh="目前还没有询价案件。" /></div>}
    </section>
  </div>;
}
